@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo Analyzing system environments...
echo ==================================================

REM --- REQUIREMENTS CONFIGURATION ---
set "MIN_PY_MAJOR=3"
set "MIN_PY_MINOR=10"
set "MIN_NODE_MAJOR=20"

REM --- DETECT AND PARSE PYTHON VERSION ---
set "PY_VERSION=Unknown"
set "NEED_PY_WARN=0"
for /f "tokens=2" %%i in ('python --version 2^>nul') do set "PY_VERSION=%%i"
if "%PY_VERSION%"=="Unknown" (
    set "NEED_PY_WARN=1"
) else (
    for /f "tokens=1,2 delims=." %%a in ("%PY_VERSION%") do (
        set "PY_MAJOR=%%a"
        set "PY_MINOR=%%b"
    )
    if !PY_MAJOR! lss %MIN_PY_MAJOR% set "NEED_PY_WARN=1"
    if !PY_MAJOR! equ %MIN_PY_MAJOR% if !PY_MINOR! lss %MIN_PY_MINOR% set "NEED_PY_WARN=1"
)

REM --- DETECT AND PARSE NODE.JS VERSION ---
set "NODE_VERSION=Unknown"
set "NEED_NODE_WARN=0"
for /f %%i in ('node -v 2^>nul') do set "NODE_VERSION=%%i"
if "%NODE_VERSION%"=="Unknown" (
    set "NEED_NODE_WARN=1"
) else (
    set "CLEAN_NODE=!NODE_VERSION:v=!"
    for /f "tokens=1 delims=." %%a in ("!CLEAN_NODE!") do set "NODE_MAJOR=%%a"
    if !NODE_MAJOR! lss %MIN_NODE_MAJOR% set "NEED_NODE_WARN=1"
)

REM --- DISPLAY CAUTION SCREEN IF REQ NOT MET ---
if "%NEED_PY_WARN%"=="1" goto SHOW_CAUTION
if "%NEED_NODE_WARN%"=="1" goto SHOW_CAUTION
goto START_SETUP

:SHOW_CAUTION
echo .
echo *******************************************************************************
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  CAUTION  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo *******************************************************************************
echo  Your system environment does not meet the recommended requirements.
echo  If this setup script fails or crashes, please update your tools.
echo.
if "%NEED_PY_WARN%"=="1" (
echo  [-] PYTHON VERSION CHECK: FAILED
echo      Detected: %PY_VERSION% ^| Required: %MIN_PY_MAJOR%.%MIN_PY_MINOR%.x or higher
echo      * WHY: Django 5.2+ requires Python 3.10+. Older versions will block 'pip install'.
echo      * FIX: Download Python 3.11+ from https://python.org
echo             Ensure "Add python.exe to PATH" is checked during installation.
echo             Delete the '.venv_local' folder before running this script again.
echo.
) else (
echo  [+] PYTHON VERSION CHECK: PASSED ^(%PY_VERSION%^)
echo.
)
if "%NEED_NODE_WARN%"=="1" (
echo  [-] NODE.JS VERSION CHECK: FAILED
echo      Detected: %NODE_VERSION% ^| Required: v%MIN_NODE_MAJOR%.x or higher
echo      * WHY: Modern Vue components and Vite 6/7 will fail to compile on Node v12.
echo      * FIX: Download the latest LTS version (v22+) from https://nodejs.org
echo.
) else (
echo  [+] NODE.JS VERSION CHECK: PASSED ^(%NODE_VERSION%^)
echo.
)
echo *******************************************************************************
echo  Press ANY KEY to try running the script anyway...
echo *******************************************************************************
pause > nul
echo.

:START_SETUP
echo Setting up local development environment...

REM Create virtual environment if it doesn't exist
if not exist ".venv_local" (
    echo Creating virtual environment...
    python -m venv .venv_local
)

REM Activate virtual environment
echo Activating virtual environment...
call ".venv_local\Scripts\activate"

REM Install requirements
echo Installing Python requirements...
pip install -r requirements.txt

REM Install development requirements if available
if exist "requirements-dev.txt" (
    echo Installing development requirements...
    pip install -r requirements-dev.txt
)

REM Copy docker.env to .env
if exist ".env.docker" (
    echo Copying docker.env to .env...
    copy ".env.docker" ".env"
) else (
    echo Warning: .env.docker not found, creating basic .env...
    echo DEBUG=True > .env
    echo LOCAL_USER=True >> .env
)

REM Set SQLite3 flag for local development
echo Setting SQLite3 configuration...
python -c "import fileinput; import sys; [print(line.replace('LOCAL_USER_SQLITE3=False', 'LOCAL_USER_SQLITE3=True'), end='') for line in fileinput.input('.env', inplace=True)]"

REM Install Vue dependencies for all games
echo Installing Vue dependencies...
if exist "AQY\vueAQY\package.json" (
    cd AQY\vueAQY && call npm install && cd ..\..
) || echo Warning: npm install failed for AQY
if exist "BUS\vueBUS\package.json" (
    cd BUS\vueBUS && call npm install && cd ..\..
) || echo Warning: npm install failed for BUS
if exist "CNS\vueCNS\package.json" (
    cd CNS\vueCNS && call npm install && cd ..\..
) || echo Warning: npm install failed for CNS
REM if exist "IND\vueIND\package.json" (
REM     cd IND\vueIND && call npm install && cd ..\..
REM ) || echo Warning: npm install failed for IND
if exist "KFW\vueKFW\package.json" (
    cd KFW\vueKFW && call npm install && cd ..\..
) || echo Warning: npm install failed for KFW
REM if exist "PPF\vuePPF\package.json" (
REM     cd PPF\vuePPF && call npm install && cd ..\..
REM ) || echo Warning: npm install failed for PPF
REM if exist "RNB\vueRNB\package.json" (
REM     cd RNB\vueRNB && call npm install && cd ..\..
REM ) || echo Warning: npm install failed for RNB
if exist "TGZ\vueTGZ\package.json" (
    cd TGZ\vueTGZ && call npm install && cd ..\..
) || echo Warning: npm install failed for TGZ
if exist "WEB\vueWEB\package.json" (
    cd WEB\vueWEB && call npm install && cd ..\..
) || echo Warning: npm install failed for WEB

REM Run database migrations
echo Running database migrations...
python manage.py migrate

REM Create superuser automatically
echo Creating superuser...
set DJANGO_SUPERUSER_USERNAME=admin
set DJANGO_SUPERUSER_EMAIL=admin@admin.com
python manage.py createsuperuser --noinput --username %DJANGO_SUPERUSER_USERNAME% --email %DJANGO_SUPERUSER_EMAIL% || echo Superuser may already exist

REM Set password for admin user
echo Setting admin password...
set DJANGO_SETTINGS_MODULE=OnlineBoardGamers.settings
python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'OnlineBoardGamers.settings'); import django; django.setup(); from Lobby.models import User; admin = User.objects.get(username='admin'); admin.set_password('password'); admin.save()"

REM Update initial users with admin password hash
echo Updating initial users password...
python quick_setup_update_user_passwords.py

REM Load initial users
echo Loading initial users...
python manage.py loaddata initial_users.json

echo.
echo ==================================================
echo Quick setup complete!
echo The project is now configured for local SQLite3 development.
echo.
echo You can now run: QuickRun.bat
echo ==================================================
pause
