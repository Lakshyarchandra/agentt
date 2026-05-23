from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.trace import ExecutionTrace
from app.schemas.trace import TraceOut, TraceSummary
from app.core.deps import get_current_user

router = APIRouter(prefix="/traces", tags=["traces"])


@router.get("", response_model=List[TraceSummary])
async def list_traces(
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ExecutionTrace).where(ExecutionTrace.user_id == current_user.id)
    if agent_id:
        query = query.where(ExecutionTrace.agent_id == agent_id)
    if status:
        query = query.where(ExecutionTrace.status == status)
    query = query.order_by(ExecutionTrace.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{trace_id}", response_model=TraceOut)
async def get_trace(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ExecutionTrace).where(
            ExecutionTrace.id == trace_id,
            ExecutionTrace.user_id == current_user.id,
        )
    )
    trace = result.scalar_one_or_none()
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")
    return trace


@router.delete("/{trace_id}", status_code=204)
async def delete_trace(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ExecutionTrace).where(
            ExecutionTrace.id == trace_id,
            ExecutionTrace.user_id == current_user.id,
        )
    )
    trace = result.scalar_one_or_none()
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")
    await db.delete(trace)
