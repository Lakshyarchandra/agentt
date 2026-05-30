#!/bin/bash
# Agent Studio v2 - Verification & Testing Script

set -e

echo "=========================================="
echo "Agent Studio v2 - Verification Suite"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# ─── Python Syntax Checks ───────────────────────────────────────────────────

echo "Checking Python syntax..."
python -m py_compile backend/app/main.py && log_pass "main.py syntax" || log_fail "main.py syntax"
python -m py_compile backend/app/services/agent_service.py && log_pass "agent_service.py syntax" || log_fail "agent_service.py syntax"
python -m py_compile backend/app/services/custom_tool_service.py && log_pass "custom_tool_service.py syntax" || log_fail "custom_tool_service.py syntax"
python -m py_compile backend/app/routers/custom_tools.py && log_pass "custom_tools.py router syntax" || log_fail "custom_tools.py router syntax"

echo ""

# ─── File Existence Checks ───────────────────────────────────────────────────

echo "Checking file structure..."

# Backend files
[ -f "backend/app/models/custom_tool.py" ] && log_pass "CustomTool model exists" || log_fail "CustomTool model missing"
[ -f "backend/app/schemas/custom_tool.py" ] && log_pass "CustomTool schema exists" || log_fail "CustomTool schema missing"
[ -f "backend/app/services/custom_tool_service.py" ] && log_pass "custom_tool_service.py exists" || log_fail "custom_tool_service.py missing"
[ -f "backend/app/routers/custom_tools.py" ] && log_pass "custom_tools router exists" || log_fail "custom_tools router missing"

# Frontend files
[ -f "frontend/src/components/flow/ConditionNode.tsx" ] && log_pass "ConditionNode component exists" || log_fail "ConditionNode component missing"
[ -f "frontend/src/pages/ToolsWorkbench.tsx" ] && log_pass "ToolsWorkbench page exists" || log_fail "ToolsWorkbench page missing"
[ -f "frontend/src/store/toolStore.ts" ] && log_pass "toolStore exists" || log_fail "toolStore missing"

echo ""

# ─── Code Pattern Checks ────────────────────────────────────────────────────

echo "Checking implementation patterns..."

# Backend patterns
grep -q "retry_config" backend/app/models/agent.py && log_pass "retry_config in Agent model" || log_fail "retry_config missing"
grep -q "fallback_config" backend/app/models/agent.py && log_pass "fallback_config in Agent model" || log_fail "fallback_config missing"
grep -q "structured_output_schema" backend/app/models/agent.py && log_pass "structured_output_schema in Agent model" || log_fail "structured_output_schema missing"

grep -q "_invoke_llm_with_retry" backend/app/services/agent_service.py && log_pass "Retry logic function exists" || log_fail "Retry logic function missing"
grep -q "asyncio.wait_for" backend/app/services/agent_service.py && log_pass "Timeout wrapper exists" || log_fail "Timeout wrapper missing"
grep -q "_evaluate_condition" backend/app/services/agent_service.py && log_pass "Condition evaluation exists" || log_fail "Condition evaluation missing"
grep -q "_build_structured_output_instruction" backend/app/services/agent_service.py && log_pass "Structured output function exists" || log_fail "Structured output function missing"

grep -q "custom_tool" backend/app/services/tool_registry.py && log_pass "Custom tool handler added" || log_fail "Custom tool handler missing"

# Frontend patterns
grep -q "retryConfig\|retry_config" frontend/src/pages/AgentBuilder.tsx && log_pass "Retry config in AgentBuilder" || log_fail "Retry config missing"
grep -q "fallbackConfig\|fallback_config" frontend/src/pages/AgentBuilder.tsx && log_pass "Fallback config in AgentBuilder" || log_fail "Fallback config missing"
grep -q "customTools\|custom_tools" frontend/src/pages/AgentBuilder.tsx && log_pass "Custom tools integration in AgentBuilder" || log_fail "Custom tools integration missing"

grep -q "collapsible" frontend/src/index.css && log_pass "Collapsible CSS exists" || log_fail "Collapsible CSS missing"
grep -q "toggle-switch" frontend/src/index.css && log_pass "Toggle switch CSS exists" || log_fail "Toggle switch CSS missing"
grep -q "tools-workbench" frontend/src/index.css && log_pass "Tools workbench CSS exists" || log_fail "Tools workbench CSS missing"

echo ""

# ─── Summary ────────────────────────────────────────────────────────────────

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "=========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start backend: cd backend && uvicorn app.main:app --reload"
    echo "2. Start frontend: cd frontend && npm run dev"
    echo "3. Navigate to http://localhost:5173"
    echo "4. Test custom tools at /tools"
    echo "5. Create an agent with conditions, retry, fallback"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some checks failed. Review output above.${NC}"
    echo ""
    exit 1
fi
