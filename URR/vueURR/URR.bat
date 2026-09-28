@echo off

REM 1. Run the build
START /B /WAIT cmd /c npm run build

REM 2. Delete the unwanted images directory from the dist folder
REM    (the real images are served from URR/static/URR/images)
if exist "C:\Roger\Programming\OnlineBoardGamers\URR\static\URR\URRvuedist\images" (
    rd /s /q "C:\Roger\Programming\OnlineBoardGamers\URR\static\URR\URRvuedist\images"
    echo [CLEANUP] Deleted unwanted images directory.
)

REM 3. Start Dev server
START /B /WAIT cmd /c npm run dev
