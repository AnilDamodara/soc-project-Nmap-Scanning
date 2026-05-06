@echo off
REM Nmap Network Scanner - Windows Setup Script

echo.
echo ========================================
echo Nmap Network Scanner - Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [✓] Python detected
python --version

REM Check if Nmap is installed
nmap -V >nul 2>&1
if errorlevel 1 (
    echo Error: Nmap is not installed or not in PATH
    echo Please install Nmap from https://nmap.org/download.html
    pause
    exit /b 1
)

echo [✓] Nmap detected
nmap -V

echo.
echo Setting up Backend...
echo ========================================

cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo [✓] Backend setup complete!
echo.

cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo 1. Start Backend:
echo    cd backend
echo    venv\Scripts\activate
echo    python app.py
echo.
echo 2. Start Frontend (in another terminal):
echo    cd frontend
echo    python -m http.server 8000
echo.
echo 3. Open browser to http://localhost:8000
echo.
pause
