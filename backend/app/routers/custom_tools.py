from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.custom_tool import CustomTool
from app.schemas.custom_tool import (
    CustomToolCreate, CustomToolUpdate, CustomToolOut, CustomToolSummary,
    CustomToolExecuteRequest, CustomToolExecuteResponse,
)
from app.core.deps import get_current_user
from app.services.custom_tool_service import execute_code

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("", response_model=List[CustomToolSummary])
async def list_tools(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTool)
        .where(CustomTool.owner_id == current_user.id)
        .order_by(CustomTool.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CustomToolOut, status_code=status.HTTP_201_CREATED)
async def create_tool(
    payload: CustomToolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tool = CustomTool(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        code=payload.code,
        language=payload.language,
        is_agent_tool=payload.is_agent_tool,
    )
    db.add(tool)
    await db.flush()
    return tool


@router.get("/{tool_id}", response_model=CustomToolOut)
async def get_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTool).where(
            CustomTool.id == tool_id,
            CustomTool.owner_id == current_user.id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


@router.put("/{tool_id}", response_model=CustomToolOut)
async def update_tool(
    tool_id: str,
    payload: CustomToolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTool).where(
            CustomTool.id == tool_id,
            CustomTool.owner_id == current_user.id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    if payload.name is not None:
        tool.name = payload.name
    if payload.description is not None:
        tool.description = payload.description
    if payload.code is not None:
        tool.code = payload.code
    if payload.language is not None:
        tool.language = payload.language
    if payload.is_agent_tool is not None:
        tool.is_agent_tool = payload.is_agent_tool

    db.add(tool)
    return tool


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTool).where(
            CustomTool.id == tool_id,
            CustomTool.owner_id == current_user.id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    await db.delete(tool)


@router.post("/{tool_id}/execute", response_model=CustomToolExecuteResponse)
async def execute_tool(
    tool_id: str,
    payload: CustomToolExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute a saved tool's code and return the output."""
    result = await db.execute(
        select(CustomTool).where(
            CustomTool.id == tool_id,
            CustomTool.owner_id == current_user.id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    code = payload.code if payload.code else tool.code
    exec_result = execute_code(code)

    # Save last output
    tool.last_output = exec_result["output"]
    if exec_result["error"]:
        tool.last_output += f"\n\n--- ERROR ---\n{exec_result['error']}"
    db.add(tool)

    return CustomToolExecuteResponse(
        output=exec_result["output"],
        error=exec_result["error"],
        duration_ms=exec_result["duration_ms"],
    )


class PlaygroundExecuteRequest(BaseModel):
    code: str
    language: str = "python"


@router.post("/execute/playground", response_model=CustomToolExecuteResponse)
async def execute_playground(
    payload: PlaygroundExecuteRequest,
    _: User = Depends(get_current_user),
):
    """Execute arbitrary code without saving — playground mode."""
    exec_result = execute_code(payload.code)
    return CustomToolExecuteResponse(
        output=exec_result["output"],
        error=exec_result["error"],
        duration_ms=exec_result["duration_ms"],
    )
