@echo off

REM 1. Run the build
START /B /WAIT cmd /c npm run build

REM 2. Delete the unwanted images directory from the dist folder
if exist "C:\Roger\Programming\OnlineBoardGamers\LBR\static\LBR\LBRvuedist\images" (
    rd /s /q "C:\Roger\Programming\OnlineBoardGamers\LBR\static\LBR\LBRvuedist\images"
    echo [CLEANUP] Deleted unwanted images directory.
)

REM 3. Start Dev server (port 3069)
START /B /WAIT cmd /c npm run dev
