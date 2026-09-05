@echo off
:: Batch script to allow inbound access through Windows Defender Firewall for HRMS
echo ==============================================================
echo   Adding Windows Firewall Rule for HRMS Network Access
echo ==============================================================
echo.

netsh advfirewall firewall delete rule name="HRMS System" >nul 2>&1
netsh advfirewall firewall add rule name="HRMS System" dir=in action=allow protocol=TCP localport=80,8080,5173,8001

echo.
echo ==============================================================
echo   SUCCESS! Ports 80, 8080, 5173, and 8001 are now open for LAN.
echo ==============================================================
echo.
echo Other computers on your network can now open:
echo   -- Direct Standard HTTP (Port 80):  http://172.28.161.26
echo   -- Portal (Port 8080):             http://172.28.161.26:8080
echo   -- Or by Hostname:                 http://VM-TRACKNG
echo.
pause
