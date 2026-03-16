from pydantic import BaseModel, Field
from typing import Literal, List, Dict, Any, Optional

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class ChatChunk(BaseModel):
    stage: Literal["generating_sql", "sql", "running_query", "data", "complete", "error"]
    sql: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    answer: Optional[str] = None
    error: Optional[str] = None  # generic code only, never raw exception text

class TrainRequest(BaseModel):
    force_refresh: bool = False

class TrainResponse(BaseModel):
    success: bool
    tables_trained: int
    message: str
