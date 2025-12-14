@echo off
REM Get the directory where this batch file is located (project root)
set "BASE_DIR=%~dp0"
set "BASE_DIR=%BASE_DIR:~0,-1%"  REM Remove trailing backslash

REM Change to the CNS Vue directory (adjust if this batch file lives elsewhere)
cd /d "%BASE_DIR%\CNS\vueCNS"

echo Building Vue app...
START /B /WAIT cmd /c npm run build

echo Copying built main.js to current directory...
START /B /WAIT cmd /c copy "%BASE_DIR%\CNS\static\CNS\CNSvuedist\main.js" .

echo Obfuscating main.js...
START /B /WAIT cmd /c javascript-obfuscator.cmd main.js

echo Replacing the original main.js in the dist folder with the obfuscated version...
copy main-obfuscated.js "%BASE_DIR%\CNS\static\CNS\CNSvuedist\main.js"

echo Starting dev server...
START /B /WAIT cmd /c npm run dev