from typing import Any, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from models.audit import AuditLog
from fastapi import Request

async def log_audit(
    db: AsyncSession,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
    request: Optional[Request] = None
):
    """
    Utility function to record an audit log entry.
    """
    ip_address = None
    if request:
        ip_address = request.client.host if request.client else None
        
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=payload,
        ip_address=ip_address
    )
    db.add(audit_entry)
    # We don't commit here, assuming it's part of a larger transaction
    # If used standalone, caller should commit.
