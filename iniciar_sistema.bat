@echo off
title Iniciando Sistema Açaí do Max

echo ========================================
echo  Iniciando Sistema Açaí do Max
echo ========================================
echo.

REM ====== INICIAR XAMPP ======
echo Iniciando Apache e MySQL...
cd /d "C:\xampp"
start "" xampp_start.exe

REM Aguarda MySQL subir corretamente
echo Aguardando MySQL...
timeout /t 8 >nul

REM ====== BACKEND ======
echo Iniciando Backend...
cd /d "C:\Users\USER\acai-do-max\backend"
start "Backend" /min cmd /k "npm install && npm run dev"

REM Aguarda backend subir
timeout /t 4 >nul

REM ====== FRONTEND ======
echo Iniciando Frontend...
cd /d "C:\Users\USER\acai-do-max\frontend"
start "Frontend" /min cmd /k "npm install && npm run dev"

REM ====== ABRIR NAVEGADOR ======
timeout /t 3 >nul
echo Abrindo navegador...
start "" http://localhost:5173

echo ========================================
echo  Sistema iniciado com sucesso!
echo ========================================
pause
