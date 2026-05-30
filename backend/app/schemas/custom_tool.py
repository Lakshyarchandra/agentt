from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class CustomToolCreate(BaseModel):
    name: str
    description: Optional[str] = None
    code: str = ""
    language: str = "python"
    is_agent_tool: bool = False


class CustomToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    is_agent_tool: Optional[bool] = None


class CustomToolOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    code: str
    language: str
    last_output: Optional[str]
    is_agent_tool: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomToolSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    language: str
    is_agent_tool: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomToolExecuteRequest(BaseModel):
    code: Optional[str] = None  # Override code; if None, use saved code


class CustomToolExecuteResponse(BaseModel):
    output: str
    error: Optional[str] = None
    duration_ms: int
