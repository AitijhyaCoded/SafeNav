@echo off
echo Stopping any existing Python processes on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)

timeout /t 2 /nobreak >nul

echo Starting FastAPI server...
cd /d "%~dp0"
call venv\Scripts\activate.bat
uvicorn main:app --reload --host 127.0.0.1 --port 8000
