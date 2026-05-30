from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime


class NodePosition(BaseModel):
    x: float
    y: float


class FlowNode(BaseModel):
    id: str
    type: str  # input | llm | tool | prompt | output | conditional | condition
    data: Dict[str, Any]
    position: NodePosition


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class GraphConfig(BaseModel):
    nodes: List[FlowNode]
    edges: List[FlowEdge]


# ─── v2: Retry / Fallback / Structured Output ────────────────────────────────

class RetryConfig(BaseModel):
    max_retries: int = 3
    backoff_multiplier: float = 1.5


class FallbackConfig(BaseModel):
    vendor: str = ""
    model: str = ""


class StructuredOutputSchema(BaseModel):
    schema_def: Dict[str, Any] = {}  # JSON Schema object
    enabled: bool = False


# ─── CRUD Schemas ─────────────────────────────────────────────────────────────

class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    graph_config: GraphConfig
    max_iterations: Optional[str] = "10"
    timeout_seconds: Optional[str] = "120"
    retry_config: Optional[Dict[str, Any]] = None
    fallback_config: Optional[Dict[str, Any]] = None
    structured_output_schema: Optional[Dict[str, Any]] = None


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_config: Optional[GraphConfig] = None
    max_iterations: Optional[str] = None
    timeout_seconds: Optional[str] = None
    is_active: Optional[bool] = None
    retry_config: Optional[Dict[str, Any]] = None
    fallback_config: Optional[Dict[str, Any]] = None
    structured_output_schema: Optional[Dict[str, Any]] = None


class AgentOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    graph_config: Dict[str, Any]
    max_iterations: str
    timeout_seconds: str
    is_active: bool
    retry_config: Optional[Dict[str, Any]]
    fallback_config: Optional[Dict[str, Any]]
    structured_output_schema: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
