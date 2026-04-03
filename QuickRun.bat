@echo off

REM Set the base directory to the current directory where the script is run
SET OBG_HOME=%~dp0

echo Starting OBG Development Environment...

REM --- Activate the virtual environment using the variable ---
call "%OBG_HOME%\.venv_local\Scripts\activate"

REM Check if activation was successful (optional)
IF ERRORLEVEL 1 (
    echo Failed to activate virtual environment. Exiting.
    pause
    exit /b 1
)

echo Virtual environment activated.

REM --- Set Local Environment Variables for Django-decouple ---
REM These values will override any existing .env file settings when Django runs.
REM Add any other variables you need here:
REM ALLOWED_HOSTS=127.0.0.1,localhost
REM DEBUG=yes
REM LOCAL_DB_NAME=xx
REM LOCAL_DB_USER=xx
REM LOCAL_DB_PWD=xx
REM LOCAL_DB_HOST=xx


REM --- Start Django runserver in a separate command prompt window ---
REM This command runs from the root directory defined by OBG_HOME
start "Django Server" /D "%OBG_HOME%" cmd /k python manage.py runserver

echo Django server started.

REM --- Start Vue development servers in separate command prompt windows ---
REM Using the /D flag with the variable to change directory for each 'start' command

start "Vue Bus" /D "%OBG_HOME%\Bus\busvue" npm run dev
echo Bus server started.

start "Vue TGZ" /D "%OBG_HOME%\TGZ\vueTGZ" npm run dev
echo TGZ server started.

start "Vue Cns" /D "%OBG_HOME%\CNS\vueCNS" npm run dev
echo CNS server started.

start "Vue AQY" /D "%OBG_HOME%\AQY\vueAQY" npm run dev
echo AQY server started.

start "Vue IND" /D "%OBG_HOME%\IND\vueIND" npm run dev
echo IND server started.

start "Vue KFW" /D "%OBG_HOME%\KFW\vueKFW" npm run dev
echo KFW server started.

start "Vue WEB" /D "%OBG_HOME%\WEB\vueWEB" npm run dev
echo WEB server started.

start "Vue RNB" /D "%OBG_HOME%\RNB\vueRNB" npm run dev
echo RNB server started.

echo.
echo ==================================================
echo Batch script finished starting all processes.
echo Keep the new command prompt windows open to run the servers.
echo ==================================================

REM Optional: pause the current window if you want to read the final messages
REM pause
