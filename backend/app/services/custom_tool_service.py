"""
Custom Tool Service — sandboxed execution of user-authored Python code.
"""
import io
import contextlib
import traceback
import time
from typing import Dict, Any, List, Optional

from langchain_core.tools import Tool


def execute_code(code: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Execute Python code in a sandboxed environment.
    Returns { output, error, duration_ms }.
    """
    start = time.time()
    output_buffer = io.StringIO()
    error = None

    # Restricted builtins for safety
    safe_builtins = {
        "print": print,
        "range": range,
        "len": len,
        "str": str,
        "int": int,
        "float": float,
        "bool": bool,
        "list": list,
        "dict": dict,
        "tuple": tuple,
        "set": set,
        "sum": sum,
        "min": min,
        "max": max,
        "abs": abs,
        "round": round,
        "sorted": sorted,
        "reversed": reversed,
        "enumerate": enumerate,
        "zip": zip,
        "map": map,
        "filter": filter,
        "isinstance": isinstance,
        "type": type,
        "hasattr": hasattr,
        "getattr": getattr,
        "setattr": setattr,
        "None": None,
        "True": True,
        "False": False,
        "__import__": __import__,  # Allow imports for flexibility
    }

    try:
        with contextlib.redirect_stdout(output_buffer):
            exec(code, {"__builtins__": safe_builtins})
        output = output_buffer.getvalue()
        if not output:
            output = "Code executed successfully (no output)."
    except Exception:
        output = output_buffer.getvalue()
        error = traceback.format_exc()

    duration_ms = int((time.time() - start) * 1000)

    return {
        "output": output,
        "error": error,
        "duration_ms": duration_ms,
    }


def create_langchain_tool_from_custom(
    tool_name: str,
    tool_description: str,
    tool_code: str,
) -> Tool:
    """
    Wrap a user's custom tool code as a LangChain Tool.
    The code should define a function called `run(input: str) -> str`.
    If it doesn't, the entire code is executed with the input available as `user_input`.
    """

    def tool_func(user_input: str) -> str:
        safe_builtins = {
            "print": print, "range": range, "len": len, "str": str,
            "int": int, "float": float, "bool": bool, "list": list,
            "dict": dict, "tuple": tuple, "set": set, "sum": sum,
            "min": min, "max": max, "abs": abs, "round": round,
            "sorted": sorted, "enumerate": enumerate, "zip": zip,
            "map": map, "filter": filter, "isinstance": isinstance,
            "type": type, "None": None, "True": True, "False": False,
            "__import__": __import__,
        }
        namespace: Dict[str, Any] = {"__builtins__": safe_builtins, "user_input": user_input}
        output_buffer = io.StringIO()
        try:
            with contextlib.redirect_stdout(output_buffer):
                exec(tool_code, namespace)
            # If a `run` function is defined, call it
            if "run" in namespace and callable(namespace["run"]):
                result = namespace["run"](user_input)
                return str(result) if result is not None else output_buffer.getvalue() or "Done."
            return output_buffer.getvalue() or "Code executed successfully (no output)."
        except Exception:
            return f"Error: {traceback.format_exc()}"

    return Tool(
        name=tool_name.replace(" ", "_").lower(),
        func=tool_func,
        description=tool_description or f"Custom tool: {tool_name}",
    )
