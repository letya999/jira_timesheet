import json
import logging

from core.database import get_db
from fastapi import APIRouter, Depends, Request
from models.leave import LeaveRequest, LeaveStatus
from services.notification import notification_service
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/interactive")
async def slack_interactive(request: Request, db: AsyncSession = Depends(get_db)):
    """Receives interactive actions from Slack."""
    form_data = await request.form()
    payload_str = form_data.get("payload")
    if not payload_str:
        return {"ok": False}

    payload = json.loads(payload_str)
    actions = payload.get("actions", [])
    if not actions:
        return {"ok": False}

    action = actions[0]
    action_id = action.get("action_id")
    value = action.get("value", "")

    # Value format: "approve_123" or "reject_123"
    try:
        status_action, leave_id_str = value.split("_")
        leave_id = int(leave_id_str)
    except (ValueError, TypeError):
        return {"ok": False}

    from sqlalchemy import select
    from sqlalchemy.orm import joinedload

    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.id == leave_id)
        .options(joinedload(LeaveRequest.user))
    )
    leave = result.scalar_one_or_none()

    if not leave:
        return {"ok": False, "error": "Leave not found"}

    if action_id == "approve_leave":
        leave.status = LeaveStatus.APPROVED
    elif action_id == "reject_leave":
        leave.status = LeaveStatus.REJECTED

    # Slack user info (who clicked the button)
    slack_user = payload.get("user", {}).get("username", "Slack User")
    leave.comment = f"Action via Slack by {slack_user}"

    await db.commit()

    # Notify user
    status_icon = "✅" if leave.status == LeaveStatus.APPROVED else "❌"
    msg = (
        f"Your **{leave.type}** request from **{leave.start_date}** to "
        f"**{leave.end_date}** has been **{leave.status.lower()}** via Slack."
    )
    await notification_service.create_notification(
        db,
        user_id=leave.user_id,
        sender_id=None, # System/Slack
        title=f"{status_icon} Leave Request {leave.status}",
        message=msg,
        type=f"leave_request_{leave.status.lower()}",
        related_entity_id=leave.id,
        related_entity_type="LeaveRequest"
    )
    await db.commit()

    # Respond to Slack to update the message (optional, for now just ok)
    return {"ok": True}
