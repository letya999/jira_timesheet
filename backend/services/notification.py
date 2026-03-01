from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from models.notification import Notification
from schemas.notification import NotificationCreate

class NotificationService:
    async def create_notification(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        title: str,
        message: str,
        sender_id: Optional[int] = None,
        type: str = "info",
        related_entity_id: Optional[int] = None,
        related_entity_type: Optional[str] = None
    ) -> Notification:
        """
        Create a new notification for a user.
        """
        notification = Notification(
            user_id=user_id,
            sender_id=sender_id,
            title=title,
            message=message,
            type=type,
            related_entity_id=related_entity_id,
            related_entity_type=related_entity_type
        )
        db.add(notification)
        # We don't commit here, assuming it's part of a larger transaction
        return notification

    async def notify_timesheet_submitted(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        timesheet_id: int,
        user_name: str,
        period_label: str
    ):
        """
        Notify the relevant managers when a timesheet is submitted.
        If no PM is found for the user's team, notify all Admins.
        """
        from models.user import User, JiraUser
        from models.org import OrgUnit
        from sqlalchemy import select, or_
        from sqlalchemy.orm import joinedload
        
        # Find the user and their team PM
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .options(joinedload(User.jira_user).joinedload(JiraUser.org_unit))
        )
        user = result.scalar_one_or_none()
        
        recipients = []
        if user and user.jira_user and user.jira_user.org_unit and user.jira_user.org_unit.pm_id:
            recipients.append(user.jira_user.org_unit.pm_id)
        else:
            # Fallback: Notify all Admins
            admin_result = await db.execute(
                select(User.id).where(User.role == "Admin")
            )
            recipients = [r for r in admin_result.scalars().all()]

        for recipient_id in recipients:
            if recipient_id == user_id: continue # Don't notify self
            
            await self.create_notification(
                db,
                user_id=recipient_id,
                sender_id=user_id,
                title="📥 New Timesheet Submission",
                message=f"**{user_name}** has submitted their timesheet for the period **{period_label}**.",
                type="timesheet_submitted",
                related_entity_id=timesheet_id,
                related_entity_type="TimesheetPeriod"
            )

    async def notify_timesheet_status_change(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        approver_id: int,
        timesheet_id: int,
        status: str, # APPROVED or REJECTED
        period_label: str,
        comment: Optional[str] = None
    ):
        """
        Notify the user when their timesheet is approved or rejected.
        """
        icon = "✅" if status == "APPROVED" else "❌"
        title = f"{icon} Timesheet {status.capitalize()}"
        type_str = f"timesheet_{status.lower()}"
        
        message = f"Your timesheet for the period **{period_label}** has been **{status.lower()}**."
        if comment:
            message += f"\n\n**Comment from manager:** {comment}"
            
        await self.create_notification(
            db,
            user_id=user_id,
            sender_id=approver_id,
            title=title,
            message=message,
            type=type_str,
            related_entity_id=timesheet_id,
            related_entity_type="TimesheetPeriod"
        )

notification_service = NotificationService()
