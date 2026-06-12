@echo off
setlocal Enabledelayedexpansion

echo ====================================================
echo             Website to PDF Exporter
echo ====================================================
echo.

set "TIMEOUT_SECS=3"
set "BOOT_NOTE="

:: 1. Check if node_modules folder exists
echo [1/3] Checking dependencies...
if not exist "%~dp0node_modules" (
    echo [!] node_modules not found. Installing packages...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install dependencies. Please run "npm install" manually.
        pause
        exit /b !errorlevel!
    )
    echo [SUCCESS] Dependencies installed successfully.
    :: Increase delay for first-time pre-bundling and set warning message
    set "TIMEOUT_SECS=30"
    set "BOOT_NOTE= (First boot after installation takes longer for Vite to pre-bundle assets)"
) else (
    echo [INFO] Dependencies are already installed.
)
echo.

:: 2. Check and kill any process running on port 4444
echo [2/3] Checking port 4444...
set "PORT_PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4444 ^| findstr LISTENING') do (
    set "PORT_PID=%%a"
)

if defined PORT_PID (
    echo [INFO] Port 4444 is currently occupied by PID !PORT_PID!.
    echo [!] Terminating process to free up port 4444...
    taskkill /f /pid !PORT_PID! >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] Lingering process !PORT_PID! terminated successfully.
    ) else (
        echo [WARNING] Failed to terminate process !PORT_PID!. You may need administrator rights.
    )
) else (
    echo [INFO] Port 4444 is free.
)
echo.

:: 3. Start server and open browser
echo [3/3] Starting server and browser...
echo [INFO] Launching browser link in !TIMEOUT_SECS! seconds...!BOOT_NOTE!

:: Launch browser after the calculated delay via a temporary minimized background cmd
start "" /min cmd /c "timeout /t !TIMEOUT_SECS! /nobreak >nul && start http://localhost:4444"

echo [INFO] Starting dev server (Press Ctrl+C to stop)...
echo ====================================================
echo.

:: Run npm run dev directly in the foreground.
:: Without "call", when the process is terminated (Ctrl+C), it exits immediately
:: and closes the window without prompting "Terminate batch job (Y/N)?".
npm run dev
