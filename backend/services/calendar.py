import holidays
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from models.calendar import CalendarEvent
from crud.settings import system_settings

class CalendarService:
    async def get_instance_country(self, db: AsyncSession) -> str:
        """Get the configured country code for the instance. Defaults to 'RU'."""
        setting = await system_settings.get(db, "calendar_country")
        if setting and "country_code" in setting.value:
            return setting.value["country_code"]
        return "RU"

    async def set_instance_country(self, db: AsyncSession, country_code: str):
        """Set the configured country code for the instance."""
        await system_settings.set(db, "calendar_country", {"country_code": country_code})

    async def sync_holidays(self, db: AsyncSession, year: Optional[int] = None):
        """Fetch holidays from the internet (holidays lib) and sync with the database."""
        if year is None:
            year = date.today().year
        
        country_code = await self.get_instance_country(db)
        
        # Fetch holidays for the given year and country
        try:
            holiday_list = holidays.CountryHoliday(country_code, years=year)
        except Exception:
            # Fallback or log error
            return

        # Special patch for Russia: shift holidays falling on weekends to the next working day
        # (excluding Jan 1-8 which are handled by special government decrees)
        if country_code == "RU":
            observed_holidays = {}
            for h_date, name in list(holiday_list.items()):
                if h_date.month == 1 and h_date.day <= 8:
                    continue
                if h_date.weekday() >= 5: # Saturday (5) or Sunday (6)
                    shifted = h_date + timedelta(days=1)
                    while shifted.weekday() >= 5 or shifted in holiday_list or shifted in observed_holidays:
                        shifted += timedelta(days=1)
                    observed_holidays[shifted] = f"{name} (Observed)"
            
            for d, name in observed_holidays.items():
                holiday_list[d] = name

        # Get existing non-custom events for this year to avoid duplicates or updates
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # We only auto-sync non-custom events. Custom events are managed by users.
        for holiday_date, name in holiday_list.items():
            # Check if exists
            stmt = select(CalendarEvent).where(CalendarEvent.date == holiday_date)
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if not existing:
                new_event = CalendarEvent(
                    date=holiday_date,
                    name=name,
                    is_holiday=True,
                    is_custom=False,
                    country_code=country_code
                )
                db.add(new_event)
            elif not existing.is_custom:
                # Update name if changed
                existing.name = name
                existing.country_code = country_code
        
        await db.commit()

    async def get_holidays(self, db: AsyncSession, start_date: date, end_date: date) -> List[CalendarEvent]:
        """Get all holidays/non-working days in a range."""
        stmt = select(CalendarEvent).where(
            CalendarEvent.date >= start_date,
            CalendarEvent.date <= end_date
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def is_working_day(self, db: AsyncSession, day: date) -> bool:
        """Check if a day is a working day (not a weekend and not a holiday)."""
        # Weekend check (0=Monday, 5=Saturday, 6=Sunday)
        if day.weekday() >= 5:
            # Check if there's a custom override making it a working day (though our model currently only marks non-working)
            # In some countries, some Saturdays are working days. For now, assume weekends are non-working.
            return False
            
        stmt = select(CalendarEvent).where(CalendarEvent.date == day)
        result = await db.execute(stmt)
        event = result.scalar_one_or_none()
        
        if event and event.is_holiday:
            return False
            
        return True

    async def get_working_days_count(self, db: AsyncSession, start_date: date, end_date: date) -> int:
        """Calculate number of working days in a range."""
        holidays_in_range = await self.get_holidays(db, start_date, end_date)
        holiday_dates = {h.date for h in holidays_in_range if h.is_holiday}
        
        count = 0
        current = start_date
        while current <= end_date:
            if current.weekday() < 5 and current not in holiday_dates:
                count += 1
            current += timedelta(days=1)
        return count

    async def add_custom_holiday(self, db: AsyncSession, holiday_date: date, name: str, is_holiday: bool = True):
        """Manually add or override a holiday."""
        stmt = select(CalendarEvent).where(CalendarEvent.date == holiday_date)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.name = name
            existing.is_holiday = is_holiday
            existing.is_custom = True
        else:
            new_event = CalendarEvent(
                date=holiday_date,
                name=name,
                is_holiday=is_holiday,
                is_custom=True
            )
            db.add(new_event)
        await db.commit()

    async def delete_holiday(self, db: AsyncSession, holiday_date: date):
        """Delete a holiday (reverts to standard weekend check if it was a holiday)."""
        stmt = delete(CalendarEvent).where(CalendarEvent.date == holiday_date)
        await db.execute(stmt)
        await db.commit()

calendar_service = CalendarService()
