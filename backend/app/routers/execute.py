import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.agent import Agent
from app.models.trace import ExecutionTrace
from app.schemas.trace import ExecuteRequest, TraceOut
from app.core.deps import get_current_user, get_current_user_ws
from app.core.security import decrypt_api_keys
from app.services.agent_service import execute_graph, StreamingCallback

router = APIRouter(tags=["execute"])


# ─── REST Execution (non-streaming) ──────────────────────────────────────────

@router.post("/agents/{agent_id}/execute", response_model=TraceOut)
async def execute_agent_rest(
    agent_id: str,
    payload: ExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agent = await _get_agent(agent_id, current_user.id, db)
    api_keys = decrypt_api_keys(current_user.encrypted_api_keys or "")

    trace = ExecutionTrace(
        agent_id=agent.id,
        user_id=current_user.id,
        input_text=payload.input_text,
        status="running",
    )
    db.add(trace)
    await db.flush()

    try:
        callback = StreamingCallback()
        result = await execute_graph(
            graph_config=agent.graph_config,
            user_input=payload.input_text,
            api_keys=api_keys,
            max_iterations=int(agent.max_iterations),
            callback=callback,
        )
        trace.output_text = result["output"]
        trace.steps = result["steps"]
        trace.duration_ms = result["duration_ms"]
        trace.tokens_used = result.get("tokens_used")
        trace.status = "completed"
        trace.completed_at = datetime.utcnow()
    except Exception as e:
        trace.status = "failed"
        trace.error_message = str(e)
        trace.completed_at = datetime.utcnow()

    db.add(trace)
    return trace


# ─── WebSocket Execution (streaming) ─────────────────────────────────────────

@router.websocket("/ws/agents/{agent_id}/execute")
async def execute_agent_ws(
    websocket: WebSocket,
    agent_id: str,
    token: str = Query(...),
):
    await websocket.accept()

    async with AsyncSessionLocal() as db:
        # Authenticate via token query param
        user = await get_current_user_ws(token, db)
        if not user:
            await websocket.send_json({"event": "error", "data": {"message": "Unauthorized"}})
            await websocket.close(code=4001)
            return

        agent = await _get_agent(agent_id, user.id, db)
        if not agent:
            await websocket.send_json({"event": "error", "data": {"message": "Agent not found"}})
            await websocket.close(code=4004)
            return

        # Wait for the initial message with input
        try:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            message = json.loads(raw)
            user_input = message.get("input", "")
        except (asyncio.TimeoutError, json.JSONDecodeError):
            await websocket.send_json({"event": "error", "data": {"message": "Invalid input"}})
            await websocket.close()
            return

        api_keys = decrypt_api_keys(user.encrypted_api_keys or "")

        # Create trace record
        trace = ExecutionTrace(
            agent_id=agent.id,
            user_id=user.id,
            input_text=user_input,
            status="running",
        )
        db.add(trace)
        await db.flush()
        await db.commit()

        # Notify client trace started
        await websocket.send_json({
            "event": "trace_started",
            "data": {"trace_id": str(trace.id)}
        })

        # Create queue for streaming events
        queue: asyncio.Queue = asyncio.Queue()
        callback = StreamingCallback(queue=queue)

        # Run execution in background
        exec_task = asyncio.create_task(
            execute_graph(
                graph_config=agent.graph_config,
                user_input=user_input,
                api_keys=api_keys,
                max_iterations=int(agent.max_iterations),
                callback=callback,
            )
        )

        # Stream events to WebSocket
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=0.5)
                    await websocket.send_json(event)
                    if event.get("event") in ("done", "error"):
                        break
                except asyncio.TimeoutError:
                    if exec_task.done():
                        break
                    continue
        except WebSocketDisconnect:
            exec_task.cancel()

        # Save final trace
        async with AsyncSessionLocal() as save_db:
            save_result = await save_db.execute(
                select(ExecutionTrace).where(ExecutionTrace.id == trace.id)
            )
            saved_trace = save_result.scalar_one_or_none()
            if saved_trace:
                try:
                    result = await exec_task
                    saved_trace.output_text = result["output"]
                    saved_trace.steps = result["steps"]
                    saved_trace.duration_ms = result["duration_ms"]
                    saved_trace.status = "completed"
                    saved_trace.completed_at = datetime.utcnow()
                except Exception as e:
                    saved_trace.status = "failed"
                    saved_trace.error_message = str(e)
                    saved_trace.completed_at = datetime.utcnow()
                save_db.add(saved_trace)
                await save_db.commit()


async def _get_agent(agent_id: str, user_id, db: AsyncSession):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == user_id)
    )
    return result.scalar_one_or_none()
