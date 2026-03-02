from datetime import date

from core.database import get_db
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.calendar import calendar_service
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, require_role

router = APIRouter()

class HolidayCreate(BaseModel):
    date: date
    name: str
    is_holiday: bool = True

class HolidayResponse(BaseModel):
    date: date
    name: str
    is_holiday: bool
    is_custom: bool
    country_code: str | None

    class Config:
        from_attributes = True

class CountrySetting(BaseModel):
    country_code: str

@router.get("/holidays", response_model=list[HolidayResponse])
async def get_holidays(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve holidays within a specific date range."""
    return await calendar_service.get_holidays(db, start_date, end_date)

@router.get("/events")
async def get_all_calendar_events(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetch holidays and approved leave requests for the calendar."""
    # 1. Fetch Holidays
    holidays = await calendar_service.get_holidays(db, start_date, end_date)
    events = [
        {
            "date": h.date,
            "title": f"🎁 {h.name}",
            "type": "holiday",
            "is_holiday": True
        } for h in holidays
    ]

    # 2. Fetch Approved Leaves
    from models.leave import LeaveRequest, LeaveStatus
    from sqlalchemy import and_, or_, select
    from sqlalchemy.orm import joinedload

    leave_query = select(LeaveRequest).where(
        and_(
            LeaveRequest.status == LeaveStatus.APPROVED,
            or_(
                and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= start_date),
                and_(LeaveRequest.start_date <= end_date, LeaveRequest.end_date >= end_date),
                and_(LeaveRequest.start_date >= start_date, LeaveRequest.end_date <= end_date)
            )
        )
    ).options(joinedload(LeaveRequest.user))

    result = await db.execute(leave_query)
    leaves = result.scalars().all()

    for leaf in leaves:
        # For multi-day leaves, we might want to return them differently for the frontend,
        # but for simplicity, we return the range
        events.append({
            "start_date": leaf.start_date,
            "end_date": leaf.end_date,
            "title": f"🏖️ {leaf.user.full_name} ({leaf.type})",
            "type": "leave",
            "user_id": leaf.user_id,
            "leave_type": leaf.type
        })

    return events

@router.post("/holidays/sync")
async def sync_holidays(
    year: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(["Admin", "CEO"]))  # noqa: B008
):
    """Sync holidays from the internet for the specified year."""
    await calendar_service.sync_holidays(db, year)
    return {"status": "success"}

@router.post("/holidays", response_model=HolidayResponse)
async def add_custom_holiday(
    holiday: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(["Admin", "CEO"]))  # noqa: B008
):
    """Manually add or override a holiday."""
    await calendar_service.add_custom_holiday(db, holiday.date, holiday.name, holiday.is_holiday)
    return {
        "date": holiday.date,
        "name": holiday.name,
        "is_holiday": holiday.is_holiday,
        "is_custom": True,
        "country_code": None
    }

@router.delete("/holidays/{holiday_date}")
async def delete_holiday(
    holiday_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(["Admin", "CEO"]))  # noqa: B008
):
    """Delete a custom holiday override."""
    await calendar_service.delete_holiday(db, holiday_date)
    return {"status": "deleted"}

@router.get("/country", response_model=CountrySetting)
async def get_country(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get the current instance country code."""
    country = await calendar_service.get_instance_country(db)
    return {"country_code": country}

@router.post("/country")
async def set_country(
    setting: CountrySetting,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(["Admin", "CEO"]))  # noqa: B008
):
    """Set the instance-wide country code for holidays."""
    await calendar_service.set_instance_country(db, setting.country_code)
    # Automatically sync for current and next year if country changed
    await calendar_service.sync_holidays(db, date.today().year)
    await calendar_service.sync_holidays(db, date.today().year + 1)
    return {"status": "success", "country_code": setting.country_code}
