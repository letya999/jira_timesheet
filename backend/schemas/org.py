from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class TeamBase(BaseModel):
    name: str
    division_id: int
    pm_id: Optional[int] = None
    reporting_period: str = "weekly"

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    division_id: Optional[int] = None
    pm_id: Optional[int] = None
    reporting_period: Optional[str] = None

class TeamResponse(TeamBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DivisionBase(BaseModel):
    name: str
    department_id: int

class DivisionCreate(DivisionBase):
    pass

class DivisionUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None

class DivisionSimple(DivisionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DivisionResponse(DivisionBase):
    id: int
    teams: List[TeamResponse] = []
    model_config = ConfigDict(from_attributes=True)

class DepartmentBase(BaseModel):
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: str

class DepartmentSimple(DepartmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DepartmentResponse(DepartmentBase):
    id: int
    divisions: List[DivisionResponse] = []
    model_config = ConfigDict(from_attributes=True)