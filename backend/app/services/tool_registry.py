"""
Tool Registry — built-in tools available to agents.

Available tools:
  - web_search    : Tavily web search
  - wikipedia     : Wikipedia article lookup
  - calculator    : Math expression evaluator
  - python_repl   : Sandboxed Python code execution
  - http_request  : Fetch a URL and return its text content
"""
from typing import Optional, Dict, Any
from langchain_core.tools import Tool


def get_tool_by_name(
    tool_name: str,
    tool_config: Dict[str, Any],
    api_keys: Dict[str, str],
) -> Optional[Tool]:
    """Return a LangChain Tool instance for the given tool name."""

    name = tool_name.lower()

    if name == "web_search":
        tavily_key = api_keys.get("tavily") or tool_config.get("api_key", "")
        if not tavily_key:
            return None
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)

            def web_search(query: str) -> str:
                results = client.search(query, max_results=3)
                return "\n\n".join(
                    f"**{r['title']}**\n{r['content']}\nURL: {r['url']}"
                    for r in results.get("results", [])
                )

            return Tool(
                name="web_search",
                func=web_search,
                description="Search the web for current information. Input: search query string.",
            )
        except Exception:
            return None

    elif name == "wikipedia":
        try:
            import wikipedia as wiki

            def wikipedia_search(query: str) -> str:
                try:
                    page = wiki.page(query, auto_suggest=True)
                    return page.summary[:3000]
                except wiki.DisambiguationError as e:
                    return f"Disambiguation: {e.options[:5]}"
                except wiki.PageError:
                    return "Page not found."

            return Tool(
                name="wikipedia",
                func=wikipedia_search,
                description="Look up a topic on Wikipedia. Input: topic or article title.",
            )
        except Exception:
            return None

    elif name == "calculator":
        def calculate(expression: str) -> str:
            try:
                import ast
                import operator
                # Safe eval for math expressions
                allowed = {
                    ast.Add: operator.add,
                    ast.Sub: operator.sub,
                    ast.Mult: operator.mul,
                    ast.Div: operator.truediv,
                    ast.Pow: operator.pow,
                    ast.Mod: operator.mod,
                    ast.USub: operator.neg,
                }

                def eval_expr(node):
                    if isinstance(node, ast.Constant):
                        return node.value
                    elif isinstance(node, ast.BinOp):
                        return allowed[type(node.op)](eval_expr(node.left), eval_expr(node.right))
                    elif isinstance(node, ast.UnaryOp):
                        return allowed[type(node.op)](eval_expr(node.operand))
                    else:
                        raise TypeError(f"Unsupported operation: {node}")

                tree = ast.parse(expression, mode='eval')
                result = eval_expr(tree.body)
                return str(result)
            except Exception as e:
                return f"Error: {e}"

        return Tool(
            name="calculator",
            func=calculate,
            description="Evaluate a math expression. Input: expression like '2 + 3 * 4'.",
        )

    elif name == "python_repl":
        def python_repl(code: str) -> str:
            import io
            import contextlib
            import traceback
            output_buffer = io.StringIO()
            try:
                with contextlib.redirect_stdout(output_buffer):
                    exec(code, {"__builtins__": {"print": print, "range": range, "len": len,
                                                  "str": str, "int": int, "float": float,
                                                  "list": list, "dict": dict, "sum": sum,
                                                  "min": min, "max": max, "abs": abs}})
                return output_buffer.getvalue() or "Code executed successfully (no output)."
            except Exception:
                return traceback.format_exc()

        return Tool(
            name="python_repl",
            func=python_repl,
            description="Execute Python code in a sandboxed environment. Input: Python code as a string.",
        )

    elif name == "http_request":
        def http_request(url: str) -> str:
            try:
                import httpx
                response = httpx.get(url, timeout=10, follow_redirects=True)
                # Strip HTML tags simply
                text = response.text
                import re
                text = re.sub(r'<[^>]+>', ' ', text)
                text = re.sub(r'\s+', ' ', text).strip()
                return text[:3000]
            except Exception as e:
                return f"Error fetching URL: {e}"

        return Tool(
            name="http_request",
            func=http_request,
            description="Fetch the content of a URL and return its text. Input: a valid URL.",
        )

    return None


AVAILABLE_TOOLS = [
    {
        "name": "web_search",
        "label": "Web Search",
        "description": "Search the web using Tavily (requires Tavily API key)",
        "requires_key": "tavily",
        "icon": "Search",
    },
    {
        "name": "wikipedia",
        "label": "Wikipedia",
        "description": "Look up articles on Wikipedia",
        "requires_key": None,
        "icon": "BookOpen",
    },
    {
        "name": "calculator",
        "label": "Calculator",
        "description": "Evaluate mathematical expressions",
        "requires_key": None,
        "icon": "Calculator",
    },
    {
        "name": "python_repl",
        "label": "Python REPL",
        "description": "Execute Python code in a sandboxed environment",
        "requires_key": None,
        "icon": "Code",
    },
    {
        "name": "http_request",
        "label": "HTTP Request",
        "description": "Fetch text content from any URL",
        "requires_key": None,
        "icon": "Globe",
    },
]
