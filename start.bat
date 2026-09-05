@echo off
setlocal

cd /d "%~dp0"

if not defined SystemRoot set "SystemRoot=C:\Windows"
if not defined ComSpec set "ComSpec=%SystemRoot%\System32\cmd.exe"
set "PATH=%SystemRoot%\System32;%PATH%"

echo Stopping stale dev servers on ports 3001 and 5173...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
  taskkill /PID %%P /F >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
  echo Installing npm packages...
  call npm install
  if errorlevel 1 goto :fail
)

echo [2/3] Skipping Prisma db push for existing SQLite data...
echo Runtime schema initialization handles account database updates safely.

echo [3/3] Regenerating Prisma client...
call npm run prisma:generate
if errorlevel 1 goto :fail

echo Starting Candle Business app in separate windows...
start "Candle API" /D "%~dp0" "%ComSpec%" /k npm run dev:api
if errorlevel 1 goto :fail
start "Candle Web" /D "%~dp0" "%ComSpec%" /k npm run dev:web
if errorlevel 1 goto :fail

echo.
echo Candle Business app is starting.
echo API window: Candle API
echo Web window: Candle Web
echo.
pause
goto :eof

:fail
echo.
echo Start failed. Check the error output above.
pause
exit /b 1
