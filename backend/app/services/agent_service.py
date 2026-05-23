"""
Agent Service — converts a React Flow graph JSON config into a LangGraph
StateGraph executor and runs it, streaming events to a callback.

Graph node types and their data shapes:
  input       : { label }
  llm         : { vendor, model, temperature, system_prompt, max_tokens }
  tool        : { tool_name, tool_config }
  prompt      : { template, role: "system"|"human" }
  conditional : { condition_key, true_target, false_target }
  output      : { label }
"""

import asyncio
import json
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, AsyncGenerator

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import Tool
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain import hub

from app.services.vendor_service import create_llm
from app.services.tool_registry import get_tool_by_name


# ─── Streaming Callback ───────────────────────────────────────────────────────

class StreamingCallback:
    """Collects trace steps and optionally sends them to a websocket queue."""

    def __init__(self, queue: Optional[asyncio.Queue] = None):
        self.steps: List[Dict[str, Any]] = []
        self.queue = queue
        self._start_times: Dict[str, float] = {}

    async def on_llm_start(self, node_id: str, prompt: str):
        import time
        self._start_times[f"llm_{node_id}"] = time.time()
        step = {
            "type": "llm_call",
            "node_id": node_id,
            "input": prompt[:500],
            "output": None,
            "timestamp": datetime.utcnow().isoformat(),
            "duration_ms": None,
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "llm_start", "data": step})

    async def on_llm_token(self, token: str):
        if self.queue:
            await self.queue.put({"event": "token", "data": {"token": token}})

    async def on_llm_end(self, node_id: str, output: str):
        import time
        key = f"llm_{node_id}"
        duration = int((time.time() - self._start_times.get(key, 0)) * 1000)
        step = {
            "type": "llm_response",
            "node_id": node_id,
            "output": output[:2000],
            "timestamp": datetime.utcnow().isoformat(),
            "duration_ms": duration,
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "llm_end", "data": step})

    async def on_tool_start(self, tool_name: str, tool_input: str):
        step = {
            "type": "tool_call",
            "tool_name": tool_name,
            "input": tool_input[:500],
            "output": None,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "tool_start", "data": step})

    async def on_tool_end(self, tool_name: str, output: str):
        step = {
            "type": "observation",
            "tool_name": tool_name,
            "output": str(output)[:2000],
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "tool_end", "data": step})

    async def on_error(self, error: str):
        step = {
            "type": "error",
            "output": error,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "error", "data": step})


# ─── Graph Execution ──────────────────────────────────────────────────────────

def _extract_llm_nodes(graph_config: Dict) -> List[Dict]:
    return [n for n in graph_config.get("nodes", []) if n["type"] == "llm"]


def _extract_tool_nodes(graph_config: Dict) -> List[Dict]:
    return [n for n in graph_config.get("nodes", []) if n["type"] == "tool"]


def _build_system_prompt(graph_config: Dict) -> str:
    prompt_nodes = [n for n in graph_config.get("nodes", []) if n["type"] == "prompt"]
    system_parts = []
    for node in prompt_nodes:
        if node["data"].get("role") == "system":
            system_parts.append(node["data"].get("template", ""))
    return "\n\n".join(system_parts) if system_parts else "You are a helpful AI assistant."


async def execute_graph(
    graph_config: Dict,
    user_input: str,
    api_keys: Dict[str, str],
    max_iterations: int = 10,
    callback: Optional[StreamingCallback] = None,
) -> Dict[str, Any]:
    """
    Execute the agent graph. Returns { output, steps, tokens_used }.
    """
    import time
    start = time.time()

    # 1. Find the primary LLM node
    llm_nodes = _extract_llm_nodes(graph_config)
    if not llm_nodes:
        raise ValueError("Graph must contain at least one LLM node")

    primary_llm_node = llm_nodes[0]
    llm_data = primary_llm_node["data"]

    llm = create_llm(
        vendor=llm_data.get("vendor", "groq"),
        model=llm_data.get("model", "llama-3.3-70b-versatile"),
        api_keys=api_keys,
        temperature=float(llm_data.get("temperature", 0.7)),
        max_tokens=llm_data.get("max_tokens"),
    )

    # 2. Build tools list from tool nodes
    tool_nodes = _extract_tool_nodes(graph_config)
    tools: List[Tool] = []
    for tn in tool_nodes:
        tool_name = tn["data"].get("tool_name")
        tool_config = tn["data"].get("tool_config", {})
        if tool_name:
            tool = get_tool_by_name(tool_name, tool_config, api_keys)
            if tool:
                tools.append(tool)

    # 3. Build system prompt from prompt nodes
    system_prompt = _build_system_prompt(graph_config)
    # Override with inline LLM node system prompt if set
    if llm_data.get("system_prompt"):
        system_prompt = llm_data["system_prompt"]

    # 4. Notify start
    if callback:
        await callback.on_llm_start(primary_llm_node["id"], user_input)

    try:
        if tools:
            # ReAct agent with tools
            react_prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt + "\n\nYou have access to the following tools: {tools}\n\nUse the following format:\nThought: ...\nAction: ...\nAction Input: ...\nObservation: ...\n... (this Thought/Action/Observation can repeat N times)\nThought: I now know the final answer\nFinal Answer: ..."),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])

            agent = create_react_agent(llm, tools, react_prompt)
            executor = AgentExecutor(
                agent=agent,
                tools=tools,
                max_iterations=max_iterations,
                verbose=True,
                handle_parsing_errors=True,
            )

            # Capture tool calls via wrapping
            original_tools = {}
            for tool in tools:
                original_func = tool.func
                tool_name_capture = tool.name

                async def wrapped_invoke(inp, tn=tool_name_capture, of=original_func):
                    if callback:
                        await callback.on_tool_start(tn, str(inp))
                    result = of(inp) if not asyncio.iscoroutinefunction(of) else await of(inp)
                    if callback:
                        await callback.on_tool_end(tn, str(result))
                    return result

                original_tools[tool.name] = tool.func
                tool.func = lambda inp, tn=tool_name_capture, of=original_func: of(inp)

            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: executor.invoke({"input": user_input, "tools": tools, "tool_names": [t.name for t in tools]})
            )
            output = result.get("output", "")

        else:
            # Simple LLM call without tools
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_input),
            ]
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: llm.invoke(messages)
            )
            output = response.content

        duration_ms = int((time.time() - start) * 1000)

        if callback:
            await callback.on_llm_end(primary_llm_node["id"], output)
            if callback.queue:
                await callback.queue.put({
                    "event": "done",
                    "data": {"output": output, "duration_ms": duration_ms}
                })

        return {
            "output": output,
            "steps": callback.steps if callback else [],
            "duration_ms": duration_ms,
            "tokens_used": None,
        }

    except Exception as e:
        error_msg = str(e)
        if callback:
            await callback.on_error(error_msg)
            if callback.queue:
                await callback.queue.put({"event": "error", "data": {"message": error_msg}})
        raise
