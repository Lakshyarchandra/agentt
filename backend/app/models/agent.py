import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Visual flow graph stored as JSON:
    # { "nodes": [...], "edges": [...] }
    # Each node: { "id", "type": "llm|tool|prompt|input|output|conditional",
    #              "data": {...node-specific config...},
    #              "position": {"x": 0, "y": 0} }
    graph_config = Column(JSONB, nullable=False, default=dict)

    # Execution settings
    max_iterations = Column(String(10), default="10")
    timeout_seconds = Column(String(10), default="120")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="agents")
    traces = relationship("ExecutionTrace", back_populates="agent", cascade="all, delete-orphan")
