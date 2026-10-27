@echo off

REM 1. Run the build
START /B /WAIT cmd /c npm run build

REM 2. Delete the unwanted images directory from the dist folder
REM /s removes all directories and files in the specified directory
REM /q runs in quiet mode (won't ask for confirmation)
if exist "C:\Roger\Programming\OnlineBoardGamers\NTR\static\NTR\NTRvuedist\images" (
    rd /s /q "C:\Roger\Programming\OnlineBoardGamers\NTR\static\NTR\NTRvuedist\images"
    echo [CLEANUP] Deleted unwanted images directory.
)

REM 3. Start Dev server (port 3066)
START /B /WAIT cmd /c npm run dev
