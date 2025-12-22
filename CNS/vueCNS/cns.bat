@echo off

REM 1. Run the build
START /B /WAIT cmd /c npm run build

REM 2. Delete the unwanted images directory from the dist folder
REM /s removes all directories and files in the specified directory
REM /q runs in quiet mode (won't ask for confirmation)
if exist "C:\Roger\Programming\OnlineBoardGamers\CNS\static\CNS\CNSvuedist\images" (
    rd /s /q "C:\Roger\Programming\OnlineBoardGamers\CNS\static\CNS\CNSvuedist\images"
    echo [CLEANUP] Deleted unwanted images directory.
)

REM --- Your existing REMs ---
REM START /B /WAIT cmd /c copy C:\Roger\Programming\MyOG\CNS\static\CNS\CNSvuedist\main.js .
REM START /B /WAIT cmd /c javascript-obfuscator.cmd main.js
REM copy main-obfuscated.js ..\static\CNS\CNSvuedist\main.js

REM 3. Start Dev server
START /B /WAIT cmd /c npm run dev
