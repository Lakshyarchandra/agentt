# Agent Studio v2 - Features Guide

This document describes the new features added to Agent Studio v2.

## Table of Contents

1. [Conditions](#conditions)
2. [Retry Logic](#retry-logic)
3. [Fallback Models](#fallback-models)
4. [Timeout Settings](#timeout-settings)
5. [Structured Output](#structured-output)
6. [Custom Tools](#custom-tools)
7. [Tools Workbench](#tools-workbench)

---

## Conditions

**What it does:** Route agent execution based on condition evaluation.

### Using Conditions

1. In the Agent Builder, drag a **Condition** node from the palette
2. Configure the condition:
   - **Type**: `contains`, `regex`, `equals`, `not_empty`, `starts_with`, `ends_with`, `length_gt`, `not_contains`
   - **Value**: The value to match against (if applicable)
3. Connect the input to the condition node
4. Connect two outputs:
   - **✓ True** (green, bottom-left): Executed if condition is true
   - **✗ False** (red, bottom-right): Executed if condition is false

### Example Scenarios

- **Sentiment check**: If output contains "sad", route to empathy_response node
- **Length check**: If output length > 100, route to summarize node
- **Regex pattern**: If output matches `/^error:/i`, route to error_handler
- **Not empty**: If agent output is not empty, route to save_result

### How It Works

During execution:
1. The LLM produces output
2. Each condition node evaluates the output against its configuration
3. Execution branches to true_target or false_target based on result
4. Both branches are traced for debugging

---

## Retry Logic

**What it does:** Automatically retry failed operations with exponential backoff.

### Configuring Retry

#### Global Retry (Agent Level)
In the Agent Builder, click **⚙️ Advanced Settings** and configure:
- **Max Retries**: Number of retry attempts (0-10)
- **Backoff (s)**: Multiplier for exponential backoff (e.g., 1.5)

#### Per-Node Retry (LLM Node)
Click the **⚙️ Retry** section on an LLM node to override global settings for that node.

### How Backoff Works

Backoff delay = `backoff_multiplier × attempt_number`

Example with backoff_multiplier = 1.5:
- Attempt 1: fails, wait 1.5s
- Attempt 2: fails, wait 3.0s
- Attempt 3: fails, wait 4.5s
- Attempt 4: success! ✓

### Usage Example

```
LLM Node → Max Retries: 3, Backoff: 1.5
  ├─ Try 1: API timeout → retry
  ├─ Try 2: Rate limited → retry after 1.5s
  ├─ Try 3: Rate limited → retry after 3.0s
  └─ Try 4: Success! Returns output
```

---

## Fallback Models

**What it does:** Switch to a backup model if the primary model fails.

### Configuring Fallback

#### Global Fallback (Agent Level)
In the Agent Builder, click **⚙️ Advanced Settings** and configure:
- **Vendor**: Backup vendor (groq, google, mistral, ollama, openrouter)
- **Model**: Model name from that vendor

#### Per-Node Fallback (LLM Node)
Click the **🛡️ Fallback Model** section on an LLM node to override global settings.

### How It Works

1. Primary model is tried first
2. On failure (after retries exhausted), fallback model is used
3. If fallback also fails, error is returned
4. Both attempts are logged in the trace

### Configuration Example

```
Primary:  groq/llama-3.3-70b
Fallback: google/gemini-1.5-flash

Execution flow:
  ├─ Try Primary: groq fails
  ├─ Retry with backoff: groq fails again
  ├─ Max retries exhausted
  └─ Switch to Fallback: google succeeds ✓
```

---

## Timeout Settings

**What it does:** Limit execution time to prevent hanging.

### Configuring Timeout

#### Global Timeout (Agent Level)
In the Agent Builder toolbar:
- **Timeout**: Seconds before execution is terminated (5-600s)

#### Per-Node Timeout (LLM Node)
Click the **⏱️ Timeout** section on an LLM node to set node-specific timeout.

### When Timeout Triggers

If execution exceeds the timeout:
1. Execution is aborted
2. Trace status is set to `timeout`
3. Error message is recorded
4. Agent returns gracefully

### Example Configuration

```
Global timeout: 120s
LLM Node timeout: 30s

If LLM takes >30s:
  ├─ LLM timeout triggers
  ├─ Tool calls are canceled
  ├─ Output is "Execution timed out after 30s"
  └─ Trace status: timeout
```

---

## Structured Output

**What it does:** Force the LLM to respond with valid JSON matching a schema.

### Configuring Structured Output

In the **Output Node**, click the **{}  Structured Output** section:

1. **Enable JSON Schema**: Toggle checkbox
2. Choose a template (optional):
   - **Simple Object**: Basic result + confidence
   - **List Response**: Array of items + count
   - **Analysis**: Summary, sentiment, key_points, score
3. Or paste a custom JSON Schema

### JSON Schema Format

```json
{
  "type": "object",
  "properties": {
    "result": { "type": "string", "description": "Main result" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  },
  "required": ["result"]
}
```

### How It Works

1. Schema is appended as instruction to system prompt
2. LLM is instructed to return ONLY valid JSON
3. Response is parsed and validated
4. If parsing fails, error is returned

### Example Use Case

**Task**: Extract sentiment from text
**Schema**:
```json
{
  "type": "object",
  "properties": {
    "sentiment": { "enum": ["positive", "negative", "neutral"] },
    "score": { "type": "number", "minimum": -1, "maximum": 1 }
  },
  "required": ["sentiment", "score"]
}
```

**LLM Response**:
```json
{
  "sentiment": "positive",
  "score": 0.85
}
```

---

## Custom Tools

**What it does:** Use user-defined Python functions as agent tools.

### Creating a Custom Tool

1. Navigate to the **Tools** page (Tools icon in navbar)
2. Click **+ New Tool**
3. Write Python code:
   ```python
   def run(user_input: str) -> str:
       # Process user_input
       return "Result"
   ```
4. Click **Save**
5. Toggle **Agent Tool** to make it available in agents

### Using Custom Tools in Agents

1. In Agent Builder, add a **Tool Node**
2. Click the tool dropdown
3. Under **My Custom Tools**, select your tool
4. The tool is now part of the agent

### Custom Tool Capabilities

- **Access to builtins**: print, len, range, str, int, list, dict, math, etc.
- **Imports allowed**: Can import standard library (requests, json, etc.)
- **Input/Output**: Takes string input, returns string output
- **Timeout**: Code has 30s timeout (configurable)

### Example Custom Tools

#### URL Validator
```python
import re

def run(user_input: str) -> str:
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, user_input)
    return f"Found {len(urls)} URLs: {', '.join(urls)}"
```

#### Text Counter
```python
def run(user_input: str) -> str:
    return f"Characters: {len(user_input)}, Words: {len(user_input.split())}"
```

#### Simple Calculator (if no calculator tool available)
```python
import ast
import operator

def run(user_input: str) -> str:
    try:
        result = eval(user_input)
        return str(result)
    except:
        return "Invalid expression"
```

### Standalone Tool Execution

In the **Tools Workbench**, you can run code without saving:
1. Write code in the editor
2. Click **Run** or Ctrl+Enter
3. See output in the right panel
4. Code is NOT saved (playground mode)

---

## Tools Workbench

**What it does:** Create, test, and manage custom Python tools.

### Accessing Tools Workbench

- Click **Tools** in the navbar
- Or navigate to `/tools`

### Workbench Layout

```
┌─ Tools Workbench ─────────────────────────────────┐
│                                                     │
│ [+ New] My Tools    [Name] [Desc] [✓ Agent] [⚙️]  │
│ ├─ Tool 1                                          │
│ ├─ Tool 2          def run(user_input):    Output │
│ └─ Tool 3              return "..."        Error  │
│                                            123ms   │
│ Left:              Center:                Right:   │
│ Tool List          Code Editor             Console │
│                    [Run] [Save] [Ctrl+⏎]         │
└─────────────────────────────────────────────────────┘
```

### Features

| Feature | Action |
|---------|--------|
| Create Tool | Click **+** in sidebar |
| Select Tool | Click tool name in list |
| Save Tool | Ctrl+S or click Save button |
| Run Code | Ctrl+⏎ or click Run button |
| Delete Tool | Right-click and confirm |
| Mark as Agent Tool | Toggle **Agent Tool** checkbox |
| Use in Agents | Tool appears in ToolNode dropdown |

### Keyboard Shortcuts

- **Ctrl+S** or **Cmd+S**: Save current tool
- **Ctrl+Enter** or **Cmd+Enter**: Run code
- **Tab**: Insert 4 spaces (in code editor)

### Output Console

Shows execution results:
- **Standard output** (print statements)
- **Errors** (red text if code fails)
- **Duration** (milliseconds to execute)

---

## Complete Example: Sentiment Agent with Conditions

### Setup

1. Create a custom tool (Tools page):
   ```python
   def run(user_input: str) -> str:
       sentiments = {"good": 1, "bad": -1, "okay": 0}
       text = user_input.lower()
       for word, score in sentiments.items():
           if word in text:
               return str(score)
       return "0"
   ```
   - Name: "sentiment_score"
   - Mark as "Agent Tool"

2. Create an agent (Agent Builder):
   - Input Node → LLM Node → Sentiment Tool → Condition → Output (Positive/Negative)
   - Configure condition:
     - Type: `equals`
     - Value: `1`
     - True → "Great! Responding to positive sentiment"
     - False → "Acknowledging neutral/negative sentiment"

3. Execute:
   ```
   Input: "This is wonderful!"
   └─ LLM generates sentiment analysis
   └─ Sentiment Tool scores it: 1
   └─ Condition checks: score == 1?  YES ✓
   └─ Routes to positive branch
   └─ Output: "Great! Responding to positive sentiment"
   ```

---

## Troubleshooting

### Condition not evaluating correctly
- Check condition type matches your use case
- For regex: ensure pattern is valid
- For length_gt: ensure value is a number
- Check the trace to see what value was actually evaluated

### Retry not happening
- Ensure LLM is actually failing (check logs)
- Verify max_retries > 0
- Check backoff_multiplier is > 1.0

### Fallback never triggered
- Ensure primary model is configured to fail
- Check fallback vendor/model are valid
- Verify API keys for both models are set

### Timeout too aggressive
- Increase timeout_seconds (default 120)
- Per-node timeout overrides global setting
- Check actual LLM performance in traces

### Custom tool not appearing
- Verify tool is marked `is_agent_tool` = true
- Refresh agent builder page to reload list
- Check tool was saved successfully

### Structured output parsing failed
- Validate JSON schema syntax
- Ensure schema has required properties
- Check LLM is actually returning JSON

---

## Best Practices

1. **Conditions**: Use simple, fast evaluations (no LLM calls)
2. **Retry**: Don't set too high (exponential backoff gets long)
3. **Fallback**: Ensure fallback vendor has sufficient quota
4. **Timeout**: Set based on typical LLM response time
5. **Structured Output**: Keep schemas simple and realistic
6. **Custom Tools**: Test in workbench before using in agents
7. **Trace**: Always review trace steps for debugging

---

## See Also

- [Architecture Guide](./IMPLEMENTATION_SUMMARY.md)
- [API Reference](./backend/app/routers/README.md)
- [Frontend Components](./frontend/src/components/README.md)

---

**Last Updated**: 2026-05-30
**Version**: Agent Studio v2.0.0
