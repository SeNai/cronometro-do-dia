@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Nao encontrei o Python. Instala-o em https://www.python.org/downloads/ ^(marca "Add python.exe to PATH"^) e volta a abrir este ficheiro.
  pause
  exit /b
)
if not exist .venv (
  echo A preparar a app pela primeira vez...
  python -m venv .venv
)
echo A instalar o que a app precisa...
.venv\Scripts\python -m pip install --quiet --disable-pip-version-check -r requirements.txt
.venv\Scripts\python criar_atalho.py
echo.
echo Pronto! A abrir a app...
start "" .venv\Scripts\pythonw.exe abrir.pyw
pause
