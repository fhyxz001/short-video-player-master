@echo off
setlocal

echo ==========================================
echo      Vertical Video Player (Local)
echo ==========================================

:: 1. Backend Setup & Start
echo.
echo [1/3] Checking Backend...
cd backend
if not exist node_modules (
    echo Node modules not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install backend dependencies.
        pause
        exit /b %errorlevel%
    )
) else (
    echo Backend dependencies ready.
)

echo Starting Backend Server...
start "Video Player Backend" cmd /k "npm start"
cd ..

:: 2. Frontend Setup & Start
echo.
echo [2/3] Checking Frontend...
cd frontend
if not exist node_modules (
    echo Node modules not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install frontend dependencies.
        pause
        exit /b %errorlevel%
    )
) else (
    echo Frontend dependencies ready.
)

echo Starting Frontend Client...
start "Video Player Frontend" cmd /k "npm run dev"
cd ..

:: 3. Summary
echo.
echo ==========================================
echo [3/3] Launching Complete!
echo.
echo Backend running at: http://localhost:7978
echo Frontend running at: http://localhost:5173
echo.
echo To access from mobile:
echo 1. Connect to the same Wi-Fi
echo 2. Find your PC IP address (ipconfig)
echo 3. Open http://<YOUR-IP>:5173 on your phone
echo ==========================================
echo.
pause
