@echo off
REM Agent Studio v2 - Verification & Testing Script (Windows)

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo Agent Studio v2 - Verification Suite
echo ==========================================
echo.

set TESTS_PASSED=0
set TESTS_FAILED=0

REM ─── Python Syntax Checks ───────────────────────────────────────────────────

echo Checking Python syntax...

python -m py_compile backend\app\main.py >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASS] main.py syntax
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] main.py syntax
    set /a TESTS_FAILED+=1
)

python -m py_compile backend\app\services\agent_service.py >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASS] agent_service.py syntax
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] agent_service.py syntax
    set /a TESTS_FAILED+=1
)

python -m py_compile backend\app\services\custom_tool_service.py >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASS] custom_tool_service.py syntax
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] custom_tool_service.py syntax
    set /a TESTS_FAILED+=1
)

python -m py_compile backend\app\routers\custom_tools.py >nul 2>&1
if !errorlevel! equ 0 (
    echo [PASS] custom_tools.py router syntax
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] custom_tools.py router syntax
    set /a TESTS_FAILED+=1
)

echo.

REM ─── File Existence Checks ───────────────────────────────────────────────────

echo Checking file structure...

if exist "backend\app\models\custom_tool.py" (
    echo [PASS] CustomTool model exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] CustomTool model missing
    set /a TESTS_FAILED+=1
)

if exist "backend\app\schemas\custom_tool.py" (
    echo [PASS] CustomTool schema exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] CustomTool schema missing
    set /a TESTS_FAILED+=1
)

if exist "backend\app\services\custom_tool_service.py" (
    echo [PASS] custom_tool_service.py exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] custom_tool_service.py missing
    set /a TESTS_FAILED+=1
)

if exist "backend\app\routers\custom_tools.py" (
    echo [PASS] custom_tools router exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] custom_tools router missing
    set /a TESTS_FAILED+=1
)

if exist "frontend\src\components\flow\ConditionNode.tsx" (
    echo [PASS] ConditionNode component exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] ConditionNode component missing
    set /a TESTS_FAILED+=1
)

if exist "frontend\src\pages\ToolsWorkbench.tsx" (
    echo [PASS] ToolsWorkbench page exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] ToolsWorkbench page missing
    set /a TESTS_FAILED+=1
)

if exist "frontend\src\store\toolStore.ts" (
    echo [PASS] toolStore exists
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] toolStore missing
    set /a TESTS_FAILED+=1
)

echo.

REM ─── Summary ────────────────────────────────────────────────────────────────

echo ==========================================
echo Test Summary
echo ==========================================
echo Passed: %TESTS_PASSED%
echo Failed: %TESTS_FAILED%
echo ==========================================

if %TESTS_FAILED% equ 0 (
    echo.
    echo [SUCCESS] All checks passed!
    echo.
    echo Next steps:
    echo 1. Start backend: cd backend ^&^& uvicorn app.main:app --reload
    echo 2. Start frontend: cd frontend ^&^& npm run dev
    echo 3. Navigate to http://localhost:5173
    echo 4. Test custom tools at /tools
    echo 5. Create an agent with conditions, retry, fallback
    echo.
    exit /b 0
) else (
    echo.
    echo [ERROR] Some checks failed. Review output above.
    echo.
    exit /b 1
)
