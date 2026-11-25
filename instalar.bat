@echo off
rem Instala o Cronómetro do Dia no Windows (corre uma vez; volta a correr se algo deixar de funcionar).
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Nao encontrei o Python. Instala-o em https://www.python.org/downloads/ ^(marca "Add python.exe to PATH"^) e volta a abrir este ficheiro.
  pause
  exit /b
)
where npm >nul 2>nul
if errorlevel 1 (
  echo Nao encontrei o Node.js ^(precisa dele para gerar a interface^). Instala-o em https://nodejs.org e volta a abrir este ficheiro.
  pause
  exit /b
)
if not exist .venv (
  echo A preparar a app pela primeira vez...
  python -m venv .venv
)
echo A instalar o que o servidor precisa...
.venv\Scripts\python -m pip install --quiet --disable-pip-version-check -r servidor\requirements.txt
echo A gerar a interface...
pushd web
call npm install --no-fund --no-audit --loglevel=error
call npm run build --silent
popd
.venv\Scripts\python scripts\criar_atalho.py
echo.
echo Pronto! A abrir a app...
start "" .venv\Scripts\pythonw.exe scripts\abrir.pyw
pause
