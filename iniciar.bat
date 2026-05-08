@echo off
echo 🚀 Iniciando HelpDesk HUS...

:: Iniciar Docker Desktop si no está corriendo
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: Esperar a que Docker esté listo
echo ⏳ Esperando que Docker inicie...
timeout /t 2 /nobreak

:: Levantar los contenedores
echo 🐳 Levantando contenedores...
cd /d %~dp0
docker-compose up -d

:: Esperar a que la app esté lista
timeout /t 10 /nobreak

:: Iniciar el servidor del frontend
echo 🌐 Iniciando frontend...
start cmd /k "cd /d %~dp0frontend && python -m http.server 3000"

echo ✅ HelpDesk HUS está corriendo!
echo 📱 Accede desde: http://192.168.1.39:3000
pause