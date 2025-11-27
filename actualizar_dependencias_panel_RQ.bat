@echo off
title Actualizar dependencias Panel RQ

echo Eliminando node_modules y package-lock.json ...
rmdir /S /Q "node_modules"
del package-lock.json 2>nul

echo Instalando dependencias nuevamente (npm install)...
npm install

echo Reiniciando servidor...
start cmd /k "npm run dev"

echo.
echo Proceso terminado.
pause
