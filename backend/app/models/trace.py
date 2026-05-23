import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class ExecutionTrace(Base):
    __tablename__ = "execution_traces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Execution context
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=True)
    status = Column(String(50), default="running")  # running | completed | failed | timeout

    # Step-by-step trace
    # Each step: { "type": "llm_call|tool_call|observation|error",
    #              "node_id": "...", "input": "...", "output": "...",
    #              "timestamp": "...", "duration_ms": 0 }
    steps = Column(JSONB, nullable=False, default=list)

    # Metadata
    duration_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    tokens_used = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    agent = relationship("Agent", back_populates="traces")
    user = relationship("User", back_populates="traces")
