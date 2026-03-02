from datetime import date

from pydantic import BaseModel


class CustomReportRequest(BaseModel):
    start_date: date
    end_date: date
    project_id: int | None = None
    release_id: int | None = None
    sprint_id: int | None = None
    org_unit_id: int | None = None
    division_id: int | None = None
    department_id: int | None = None

    # New Multi-select Filters
    user_ids: list[int] | None = None
    sprint_ids: list[int] | None = None
    worklog_types: list[str] | None = None  # ["JIRA", "MANUAL"]
    category_ids: list[int] | None = None

    # Grouping
    group_by_rows: list[str]  # e.g. ["user", "project"]
    group_by_cols: list[str] = []  # e.g. ["date", "sprint"]

    # Granularity (only if group_by_cols is date-related)
    # options: "day", "week", "2weeks", "month", "quarter"
    date_granularity: str | None = "day"

    # Formatting
    format: str = "hours"  # "hours", "days"
    hours_per_day: float = 8.0


class CustomReportResponse(BaseModel):
    # This will be a flexible structure
    # For simplicity, returning a flat list of data that the frontend can pivot
    data: list[dict]
    columns: list[str]
