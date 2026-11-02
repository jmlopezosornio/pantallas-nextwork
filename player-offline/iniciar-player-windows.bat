@echo off
cd /d %~dp0
if not exist config.json (
  echo Falta config.json. Copiando ejemplo...
  copy /Y config.example.json config.json >nul
  echo Edita config.json y completa playerKey antes de continuar.
  pause
  exit /b 1
)
start "NextWork Player Server" /min cmd /c "node server.js"
timeout /t 3 /nobreak >nul
start "" chrome --kiosk --autoplay-policy=no-user-gesture-required --disable-pinch --overscroll-history-navigation=0 http://127.0.0.1:8787
