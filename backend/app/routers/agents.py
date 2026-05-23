from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate, AgentOut, AgentSummary
from app.core.deps import get_current_user
from app.services.vendor_service import get_vendor_models
from app.services.tool_registry import AVAILABLE_TOOLS

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=List[AgentSummary])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Agent).where(Agent.owner_id == current_user.id).order_by(Agent.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AgentOut, status_code=status.HTTP_201_CREATED)
async def create_agent(
    payload: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agent = Agent(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        graph_config=payload.graph_config.model_dump(),
        max_iterations=payload.max_iterations,
        timeout_seconds=payload.timeout_seconds,
    )
    db.add(agent)
    await db.flush()
    return agent


@router.get("/catalog", summary="Get vendor models and available tools")
async def get_catalog(_: User = Depends(get_current_user)):
    return {
        "vendors": get_vendor_models(),
        "tools": AVAILABLE_TOOLS,
    }


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentOut)
async def update_agent(
    agent_id: str,
    payload: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if payload.name is not None:
        agent.name = payload.name
    if payload.description is not None:
        agent.description = payload.description
    if payload.graph_config is not None:
        agent.graph_config = payload.graph_config.model_dump()
    if payload.max_iterations is not None:
        agent.max_iterations = payload.max_iterations
    if payload.timeout_seconds is not None:
        agent.timeout_seconds = payload.timeout_seconds
    if payload.is_active is not None:
        agent.is_active = payload.is_active

    db.add(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
