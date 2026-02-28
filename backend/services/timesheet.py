from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from crud.timesheet import worklog as crud_worklog
from crud.timesheet import timesheet_period as crud_timesheet_period
from models.timesheet import Worklog, TimesheetPeriod
from core.audit import log_audit
from fastapi import HTTPException, status, Request

class TimesheetService:
    async def get_user_worklogs(
        self, db: AsyncSession, *, user_id: int, start_date: date, end_date: date
    ) -> List[Worklog]:
        return await crud_worklog.get_multi_by_user_and_date(
            db, user_id=user_id, start_date=start_date, end_date=end_date
        )

    async def submit_period(
        self, 
        db: AsyncSession, 
        *, 
        user_id: int, 
        start_date: date, 
        end_date: date,
        request: Optional[Request] = None
    ) -> TimesheetPeriod:
        # Check if period already exists
        db_period = await crud_timesheet_period.get_by_user_and_date(
            db, user_id=user_id, start_date=start_date, end_date=end_date
        )
        
        if db_period:
            if db_period.status in ["SUBMITTED", "APPROVED"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Period already {db_period.status.lower()}"
                )
            
            # Update existing period to SUBMITTED
            db_period = await crud_timesheet_period.update(
                db, 
                db_obj=db_period, 
                obj_in={"status": "SUBMITTED", "submitted_at": date.today()}
            )
        else:
            # Create new period
            from schemas.timesheet import TimesheetPeriodBase
            period_in = TimesheetPeriodBase(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
                status="SUBMITTED"
            )
            db_period = await crud_timesheet_period.create(db, obj_in=period_in)
        
        await log_audit(
            db, 
            action="SUBMIT_TIMESHEET", 
            target_type="TimesheetPeriod", 
            target_id=str(db_period.id),
            user_id=user_id,
            request=request
        )
        
        await db.commit()
        return db_period

    async def approve_period(
        self,
        db: AsyncSession,
        *,
        period_id: int,
        approver_id: int,
        status: str, # APPROVED or REJECTED
        comment: Optional[str] = None,
        request: Optional[Request] = None
    ) -> TimesheetPeriod:
        db_period = await crud_timesheet_period.get(db, id=period_id)
        if not db_period:
            raise HTTPException(status_code=404, detail="Timesheet period not found")
        
        update_data = {
            "status": status,
            "approved_by_id": approver_id,
            "comment": comment
        }
        
        if status == "APPROVED":
            from datetime import datetime
            update_data["approved_at"] = datetime.now()
            
        db_period = await crud_timesheet_period.update(db, db_obj=db_period, obj_in=update_data)
        
        await log_audit(
            db, 
            action=f"{status}_TIMESHEET", 
            target_type="TimesheetPeriod", 
            target_id=str(db_period.id),
            user_id=approver_id,
            payload={"comment": comment},
            request=request
        )
        
        await db.commit()
        return db_period

timesheet_service = TimesheetService()
