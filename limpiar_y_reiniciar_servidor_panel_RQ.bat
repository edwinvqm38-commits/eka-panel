@echo off
title Limpiar y Reiniciar Servidor Panel RQ

echo ============================================
echo     LIMPIANDO SERVIDOR PANEL-RQ
echo ============================================

echo.
echo Cerrando procesos Node activos...
taskkill /F /IM node.exe >nul 2>&1
echo Procesos Node cerrados.

echo.
echo Eliminando carpeta .next ...
IF EXIST ".next" (
    rmdir /S /Q ".next"
    echo Carpeta .next eliminada.
) ELSE (
    echo No existe carpeta .next, nada que borrar.
)

echo.
echo Iniciando servidor en puerto 3000 (npm run dev)...
start cmd /k "npm run dev"

echo.
echo Servidor reiniciado correctamente.
pause
