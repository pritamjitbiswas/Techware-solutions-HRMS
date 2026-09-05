@echo off
set LOGFILE="C:\techware solution\autostart.log"
echo [%date% %time%] Techware HRMS Auto-Start triggered >> %LOGFILE%

:: Check if Docker Desktop process is running
tasklist /fi "imagename eq Docker Desktop.exe" 2>nul | find /i "Docker Desktop.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Launching Docker Desktop... >> %LOGFILE%
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else (
    echo [%date% %time%] Docker Desktop is already running. >> %LOGFILE%
)

:: Wait for Docker daemon to respond to commands (up to 120 seconds)
set ATTEMPTS=0
:check_docker
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto docker_ready

set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 60 goto force_start
timeout /t 2 /nobreak >nul
goto check_docker

:docker_ready
echo [%date% %time%] Docker engine is ready. Starting HRMS containers... >> %LOGFILE%
cd /d "C:\techware solution"
docker compose up -d >> %LOGFILE% 2>&1
echo [%date% %time%] Techware HRMS containers started successfully. >> %LOGFILE%
goto done

:force_start
echo [%date% %time%] Timeout reached. Attempting docker compose up... >> %LOGFILE%
cd /d "C:\techware solution"
docker compose up -d >> %LOGFILE% 2>&1

:done
echo [%date% %time%] Auto-start routine complete. >> %LOGFILE%
