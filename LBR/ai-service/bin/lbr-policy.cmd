@echo off
rem lbr-policy is a static Linux binary; run it through WSL.
setlocal
set "DIR=%~dp0"
set "DRIVE=%DIR:~0,1%"
for %%L in (a b c d e f g h i j k l m n o p q r s t u v w x y z) do if /i "%DRIVE%"=="%%L" set "DRIVE=%%L"
set "REST=%DIR:~2%"
set "REST=%REST:\=/%"
wsl.exe -e sh "/mnt/%DRIVE%%REST%lbr-policy-wsl.sh" %*
exit /b %ERRORLEVEL%
