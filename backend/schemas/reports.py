from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class CustomReportRequest(BaseModel):
    start_date: date
    end_date: date
    project_id: Optional[int] = None
    release_id: Optional[int] = None
    sprint_id: Optional[int] = None
    org_unit_id: Optional[int] = None
    division_id: Optional[int] = None
    department_id: Optional[int] = None
    
    # New Multi-select Filters
    user_ids: Optional[List[int]] = None
    sprint_ids: Optional[List[int]] = None
    worklog_types: Optional[List[str]] = None # ["JIRA", "MANUAL"]
    category_ids: Optional[List[int]] = None
    
    # Grouping
    group_by_rows: List[str] # e.g. ["user", "project"]
    group_by_cols: List[str] = [] # e.g. ["date", "sprint"]
    
    # Granularity (only if group_by_cols is date-related)
    # options: "day", "week", "2weeks", "month", "quarter"
    date_granularity: Optional[str] = "day" 
    
    # Formatting
    format: str = "hours" # "hours", "days"
    hours_per_day: float = 8.0

class CustomReportResponse(BaseModel):
    # This will be a flexible structure
    # For simplicity, returning a flat list of data that the frontend can pivot
    data: List[dict]
    columns: List[str]
