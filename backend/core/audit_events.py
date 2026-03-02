from datetime import date, datetime
from typing import Any

from models.audit import AuditLog
from models.base import AuditMixin
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from core.context import ip_address_ctx, user_id_ctx


def _json_serializable(obj: Any) -> Any:
    """
    Helper to make objects JSON serializable (converts datetime to ISO string).
    """
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


def _make_dict_serializable(data: dict[str, Any]) -> dict[str, Any]:
    """
    Recursively converts dict values to JSON serializable formats.
    Also handles lists.
    """
    if isinstance(data, dict):
        return {
            k: _make_dict_serializable(v) for k, v in data.items()
        }
    elif isinstance(data, (list, tuple)):
        return [_make_dict_serializable(v) for v in data]
    else:
        return _json_serializable(data)


def get_model_changes(instance: Any) -> dict[str, Any]:
    """
    Extracts changes from a model instance.
    Returns a dict with 'old' and 'new' values for modified attributes.
    """
    changes = {}
    inspected = inspect(instance)
    for attr in inspected.mapper.column_attrs:
        history = inspected.get_history(attr.key, True)
        if history.has_changes():
            changes[attr.key] = {
                "old": history.deleted[0] if history.deleted else None,
                "new": history.added[0] if history.added else None
            }
    return changes


@event.listens_for(Session, "after_flush")
def receive_after_flush(session, flush_context):
    """
    Global listener for session flushes to record audit logs for AuditMixin models.
    """
    for instance in session.new:
        if isinstance(instance, AuditMixin):
            _log_action(session, instance, "INSERT")

    for instance in session.dirty:
        if isinstance(instance, AuditMixin):
            _log_action(session, instance, "UPDATE")

    for instance in session.deleted:
        if isinstance(instance, AuditMixin):
            _log_action(session, instance, "DELETE")


def _log_action(session: Session, instance: Any, action: str):
    """
    Helper to create and add AuditLog entry to the session.
    """
    target_type = instance.__class__.__name__
    target_id = str(getattr(instance, "id", "unknown"))

    payload = {}
    if action == "UPDATE":
        payload["changes"] = _make_dict_serializable(get_model_changes(instance))
    elif action == "INSERT":
        # Log all initial values for insert
        payload["data"] = _make_dict_serializable({
            attr.key: getattr(instance, attr.key)
            for attr in inspect(instance).mapper.column_attrs
        })
    elif action == "DELETE":
        # Log values before deletion
        payload["data"] = _make_dict_serializable({
            attr.key: getattr(instance, attr.key)
            for attr in inspect(instance).mapper.column_attrs
        })

    audit_entry = AuditLog(
        user_id=user_id_ctx.get(),
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=payload,
        ip_address=ip_address_ctx.get(),
    )
    session.add(audit_entry)
