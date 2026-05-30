"""
Agent Service — converts a React Flow graph JSON config into a LangGraph
StateGraph executor and runs it, streaming events to a callback.

Graph node types and their data shapes:
  input       : { label }
  llm         : { vendor, model, temperature, system_prompt, max_tokens,
                  fallback_vendor, fallback_model, retry_max, retry_backoff, timeout }
  tool        : { tool_name, tool_config, retry_max, retry_backoff }
  prompt      : { template, role: "system"|"human" }
  conditional : { condition_key, true_target, false_target }  (legacy)
  condition   : { condition_type, condition_value }  (v2 — uses sourceHandle for routing)
  output      : { label, structured_output_enabled, structured_output_schema }
"""

import asyncio
import json
import re
import time
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

    async def on_condition_eval(self, node_id: str, condition_type: str, result: bool):
        step = {
            "type": "condition",
            "node_id": node_id,
            "condition_type": condition_type,
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "condition", "data": step})

    async def on_retry(self, node_id: str, attempt: int, error: str):
        step = {
            "type": "retry",
            "node_id": node_id,
            "attempt": attempt,
            "error": error[:500],
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "retry", "data": step})

    async def on_fallback(self, node_id: str, fallback_vendor: str, fallback_model: str):
        step = {
            "type": "fallback",
            "node_id": node_id,
            "fallback_vendor": fallback_vendor,
            "fallback_model": fallback_model,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "fallback", "data": step})

    async def on_error(self, error: str):
        step = {
            "type": "error",
            "output": error,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.steps.append(step)
        if self.queue:
            await self.queue.put({"event": "error", "data": step})


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _extract_llm_nodes(graph_config: Dict) -> List[Dict]:
    return [n for n in graph_config.get("nodes", []) if n["type"] == "llm"]


def _extract_tool_nodes(graph_config: Dict) -> List[Dict]:
    return [n for n in graph_config.get("nodes", []) if n["type"] == "tool"]


def _extract_condition_nodes(graph_config: Dict) -> List[Dict]:
    return [n for n in graph_config.get("nodes", []) if n["type"] in ("condition", "conditional")]


def _build_system_prompt(graph_config: Dict) -> str:
    prompt_nodes = [n for n in graph_config.get("nodes", []) if n["type"] == "prompt"]
    system_parts = []
    for node in prompt_nodes:
        if node["data"].get("role") == "system":
            system_parts.append(node["data"].get("template", ""))
    return "\n\n".join(system_parts) if system_parts else "You are a helpful AI assistant."


def _evaluate_condition(condition_type: str, condition_value: str, text: str) -> bool:
    """Evaluate a condition against text."""
    text_lower = text.lower() if text else ""
    value_lower = condition_value.lower() if condition_value else ""

    if condition_type == "contains":
        return value_lower in text_lower
    elif condition_type == "not_contains":
        return value_lower not in text_lower
    elif condition_type == "equals":
        return text_lower.strip() == value_lower.strip()
    elif condition_type == "not_empty":
        return bool(text and text.strip())
    elif condition_type == "regex":
        try:
            return bool(re.search(condition_value, text, re.IGNORECASE))
        except re.error:
            return False
    elif condition_type == "starts_with":
        return text_lower.startswith(value_lower)
    elif condition_type == "ends_with":
        return text_lower.endswith(value_lower)
    elif condition_type == "length_gt":
        try:
            return len(text) > int(condition_value)
        except (ValueError, TypeError):
            return False
    else:
        return bool(text and text.strip())


def _build_structured_output_instruction(schema: Dict) -> str:
    """Build an instruction string that tells the LLM to return structured JSON."""
    schema_str = json.dumps(schema, indent=2)
    return (
        "\n\n--- STRUCTURED OUTPUT REQUIREMENT ---\n"
        "You MUST respond with valid JSON that conforms to the following JSON Schema:\n"
        f"```json\n{schema_str}\n```\n"
        "Return ONLY the JSON object, no markdown fences, no explanation.\n"
        "--- END STRUCTURED OUTPUT REQUIREMENT ---"
    )


async def _invoke_llm_with_retry(
    llm,
    messages,
    node_id: str,
    retry_config: Dict,
    callback: Optional[StreamingCallback],
    fallback_llm=None,
) -> str:
    """Invoke LLM with retry logic and fallback support."""
    max_retries = int(retry_config.get("max_retries", 0))
    backoff_multiplier = float(retry_config.get("backoff_multiplier", 1.5))

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: llm.invoke(messages)
            )
            return response.content
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                if callback:
                    await callback.on_retry(node_id, attempt + 1, str(e))
                await asyncio.sleep(backoff_multiplier * (attempt + 1))

    # All retries exhausted — try fallback
    if fallback_llm:
        if callback:
            await callback.on_fallback(node_id, "", "")
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: fallback_llm.invoke(messages)
            )
            return response.content
        except Exception as e:
            raise Exception(f"Primary and fallback LLM both failed. Last error: {e}")

    raise last_error or Exception("LLM invocation failed")


# ─── Graph Execution ──────────────────────────────────────────────────────────

async def execute_graph(
    graph_config: Dict,
    user_input: str,
    api_keys: Dict[str, str],
    max_iterations: int = 10,
    callback: Optional[StreamingCallback] = None,
    timeout_seconds: int = 120,
    retry_config: Optional[Dict] = None,
    fallback_config: Optional[Dict] = None,
    structured_output_schema: Optional[Dict] = None,
    custom_tools: Optional[List[Tool]] = None,
) -> Dict[str, Any]:
    """
    Execute the agent graph. Returns { output, steps, tokens_used, duration_ms }.
    """
    start = time.time()
    retry_config = retry_config or {}
    fallback_config = fallback_config or {}

    # 1. Find the primary LLM node
    llm_nodes = _extract_llm_nodes(graph_config)
    if not llm_nodes:
        raise ValueError("Graph must contain at least one LLM node")

    primary_llm_node = llm_nodes[0]
    llm_data = primary_llm_node["data"]

    # Per-node retry overrides agent-level
    node_retry_config = {
        "max_retries": llm_data.get("retry_max", retry_config.get("max_retries", 0)),
        "backoff_multiplier": llm_data.get("retry_backoff", retry_config.get("backoff_multiplier", 1.5)),
    }

    # Per-node timeout
    node_timeout = int(llm_data.get("timeout", timeout_seconds))

    llm = create_llm(
        vendor=llm_data.get("vendor", "groq"),
        model=llm_data.get("model", "llama-3.3-70b-versatile"),
        api_keys=api_keys,
        temperature=float(llm_data.get("temperature", 0.7)),
        max_tokens=llm_data.get("max_tokens"),
    )

    # Build fallback LLM if configured
    fallback_llm = None
    fb_vendor = llm_data.get("fallback_vendor") or fallback_config.get("vendor", "")
    fb_model = llm_data.get("fallback_model") or fallback_config.get("model", "")
    if fb_vendor and fb_model:
        try:
            fallback_llm = create_llm(
                vendor=fb_vendor,
                model=fb_model,
                api_keys=api_keys,
                temperature=float(llm_data.get("temperature", 0.7)),
            )
        except Exception:
            pass  # Fallback creation failed, proceed without

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

    # Add custom tools (from user's saved tools)
    if custom_tools:
        tools.extend(custom_tools)

    # 3. Build system prompt from prompt nodes
    system_prompt = _build_system_prompt(graph_config)
    # Override with inline LLM node system prompt if set
    if llm_data.get("system_prompt"):
        system_prompt = llm_data["system_prompt"]

    # 4. Append structured output instructions if enabled
    # Check output nodes for structured output
    output_nodes = [n for n in graph_config.get("nodes", []) if n["type"] == "output"]
    for on in output_nodes:
        od = on.get("data", {})
        if od.get("structured_output_enabled") and od.get("structured_output_schema"):
            try:
                schema = od["structured_output_schema"]
                if isinstance(schema, str):
                    schema = json.loads(schema)
                system_prompt += _build_structured_output_instruction(schema)
            except (json.JSONDecodeError, TypeError):
                pass

    # Also check agent-level structured output
    if structured_output_schema and structured_output_schema.get("enabled"):
        schema_def = structured_output_schema.get("schema_def", {})
        if schema_def:
            system_prompt += _build_structured_output_instruction(schema_def)

    # 5. Notify start
    if callback:
        await callback.on_llm_start(primary_llm_node["id"], user_input)

    async def _run_execution():
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
                # Simple LLM call without tools — with retry + fallback
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_input),
                ]
                output = await _invoke_llm_with_retry(
                    llm, messages, primary_llm_node["id"],
                    node_retry_config, callback, fallback_llm,
                )

            # 6. Evaluate condition nodes (if any)
            condition_nodes = _extract_condition_nodes(graph_config)
            for cond_node in condition_nodes:
                cond_data = cond_node["data"]
                cond_type = cond_data.get("condition_type", "not_empty")
                cond_value = cond_data.get("condition_value", "")
                result = _evaluate_condition(cond_type, cond_value, output)
                if callback:
                    await callback.on_condition_eval(cond_node["id"], cond_type, result)

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

    # Wrap with timeout
    try:
        return await asyncio.wait_for(_run_execution(), timeout=node_timeout)
    except asyncio.TimeoutError:
        error_msg = f"Execution timed out after {node_timeout}s"
        if callback:
            await callback.on_error(error_msg)
            if callback.queue:
                await callback.queue.put({"event": "error", "data": {"message": error_msg}})
        raise TimeoutError(error_msg)
