@echo off
title Iniciando Sistema Açaí do max

echo ========================================
echo Iniciando Servidor e Sistema Açaí do max...
echo ========================================
echo.

REM -- 1) Iniciar o XAMPP automaticamente
echo Iniciando Apache e MySQL...
cd /d "C:\xampp"
start "" xampp_start.exe

REM -- 2) Esperar alguns segundos
timeout /t 3 >nul

REM -- 3) Iniciar o backend Node.js (minimizado)
echo Iniciando Backend...
cd /d "C:\qolop-main\backend"
start "" /min cmd /k "npm run dev"

REM -- 4) Esperar
timeout /t 2 >nul

REM -- 5) Iniciar o frontend Vite (minimizado)
echo Iniciando Frontend...
cd /d "C:\qolop-main\frontend"
start "" /min cmd /k "npm run dev"

REM -- 6) Abrir o navegador
echo Abrindo navegador...
start "" http://localhost:5173

echo ========================================
echo Sistema Açaí do max iniciado com sucesso!
echo ========================================
pause
