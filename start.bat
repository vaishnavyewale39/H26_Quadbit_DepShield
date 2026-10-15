@echo off
echo ========================================================
echo   Starting DepShield AI Dependency Resilience Engine
echo ========================================================
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "DepShield Backend" cmd /k ".\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"
echo Starting Vite Frontend on http://localhost:5173 ...
cd frontend
npm run dev
