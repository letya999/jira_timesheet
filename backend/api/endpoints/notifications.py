import math

from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from models.notification import Notification
from models.user import User
from schemas.notification import NotificationResponse, NotificationStats, NotificationUpdate
from schemas.pagination import PaginatedResponse
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from api import deps

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[NotificationResponse])
async def get_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100)
):
    """Fetch notifications for the current user with pagination."""
    query = select(Notification).where(Notification.user_id == current_user.id).options(joinedload(Notification.sender))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch items
    query = query.order_by(desc(Notification.created_at)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    notifications = result.scalars().all()

    pages = math.ceil(total / size) if size > 0 else 1

    resp_items = []
    for n in notifications:
        resp_items.append({
            "id": n.id,
            "user_id": n.user_id,
            "sender_id": n.sender_id,
            "sender_name": n.sender.full_name if n.sender else "System",
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "related_entity_id": n.related_entity_id,
            "related_entity_type": n.related_entity_type,
            "created_at": n.created_at,
            "updated_at": n.updated_at
        })

    return {
        "items": resp_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get notification statistics (unread count)."""
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read.is_(False))
    )
    return {"unread_count": result.scalar() or 0}

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    obj_in: NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Update a notification (e.g., mark as read)."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id).options(joinedload(Notification.sender))
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if obj_in.is_read is not None:
        notification.is_read = obj_in.is_read

    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "sender_id": notification.sender_id,
        "sender_name": notification.sender.full_name if notification.sender else "System",
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "is_read": notification.is_read,
        "related_entity_id": notification.related_entity_id,
        "related_entity_type": notification.related_entity_type,
        "created_at": notification.created_at,
        "updated_at": notification.updated_at
    }

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Mark all notifications for the current user as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}
