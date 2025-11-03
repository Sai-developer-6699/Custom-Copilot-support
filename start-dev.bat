@echo off
echo Starting Atlan AI Development Environment...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
