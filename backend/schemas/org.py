from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class TeamBase(BaseModel):
    name: str
    division_id: int

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DivisionBase(BaseModel):
    name: str
    department_id: int

class DivisionCreate(DivisionBase):
    pass

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

class DepartmentSimple(DepartmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DepartmentResponse(DepartmentBase):
    id: int
    divisions: List[DivisionResponse] = []
    model_config = ConfigDict(from_attributes=True)