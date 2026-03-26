@echo off

REM 1. Run the build
START /B /WAIT cmd /c npm run build

REM 2. Delete the unwanted images directory from the dist folder
REM /s removes all directories and files in the specified directory
REM /q runs in quiet mode (won't ask for confirmation)
if exist "C:\Roger\Programming\OnlineBoardGamers\Bus\static\Bus\Busvuedist\images" (
    rd /s /q "C:\Roger\Programming\OnlineBoardGamers\Bus\static\Bus\Busvuedist\images"
    echo [CLEANUP] Deleted unwanted images directory.
)

REM --- Your existing REMs ---
REM START /B /WAIT cmd /c copy C:\Roger\Programming\MyOG\Bus\static\Bus\Busvuedist\main.js .
REM START /B /WAIT cmd /c javascript-obfuscator.cmd main.js
REM copy main-obfuscated.js ..\static\Bus\Busvuedist\main.js

REM 3. Start Dev server
START /B /WAIT cmd /c npm run dev
