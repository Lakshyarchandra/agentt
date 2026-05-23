from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime


class TraceStep(BaseModel):
    type: str  # llm_call | tool_call | observation | error
    node_id: Optional[str] = None
    input: Optional[str] = None
    output: Optional[str] = None
    tool_name: Optional[str] = None
    timestamp: str
    duration_ms: Optional[int] = None


class ExecuteRequest(BaseModel):
    input_text: str


class TraceOut(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    user_id: uuid.UUID
    input_text: str
    output_text: Optional[str]
    status: str
    steps: List[Dict[str, Any]]
    duration_ms: Optional[int]
    error_message: Optional[str]
    tokens_used: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TraceSummary(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    input_text: str
    status: str
    duration_ms: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
