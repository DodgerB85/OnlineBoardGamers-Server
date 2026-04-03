@echo off
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
if exist "AQY\vueAQY\package.json" cd AQY\vueAQY && npm install && cd ..\..
if exist "BUS\vueBUS\package.json" cd BUS\vueBUS && npm install && cd ..\..
if exist "CNS\vueCNS\package.json" cd CNS\vueCNS && npm install && cd ..\..
REM if exist "IND\vueIND\package.json" cd IND\vueIND && npm install && cd ..\..
if exist "KFW\vueKFW\package.json" cd KFW\vueKFW && npm install && cd ..\..
REM if exist "PPF\vuePPF\package.json" cd PPF\vuePPF && npm install && cd ..\..
REM if exist "RNB\vueRNB\package.json" cd RNB\vueRNB && npm install && cd ..\..
REM if exist "TGZ\vueTGZ\package.json" cd TGZ\vueTGZ && npm install && cd ..\..
if exist "WEB\vueWEB\package.json" cd WEB\vueWEB && npm install && cd ..\..

REM Run database migrations
echo Running database migrations...
python manage.py migrate

echo.
echo ==================================================
echo Quick setup complete!
echo The project is now configured for local SQLite3 development.
echo.
echo You can now run: QuickRun.bat
echo ==================================================
pause
