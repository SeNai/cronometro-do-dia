@echo off
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
.venv\Scripts\python -m pip install --quiet --disable-pip-version-check -r requirements.txt
.venv\Scripts\python app.py
pause
