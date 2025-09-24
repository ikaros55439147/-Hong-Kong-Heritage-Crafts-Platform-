@echo off
REM Make shell scripts executable on Windows/WSL

echo Making scripts executable...

REM For WSL/Linux environments
if exist "C:\Windows\System32\bash.exe" (
    bash -c "chmod +x scripts/*.sh"
    echo Scripts made executable in WSL
) else (
    echo WSL not found. Scripts are ready for Linux deployment.
)

echo Done!