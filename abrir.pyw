"""Abre o Cronómetro do Dia numa janela própria, sem terminal.

É isto que o atalho da barra de tarefas corre (com pythonw.exe, que não mostra consola).
- Se a app já estiver a correr, só abre a janela.
- Senão, arranca o servidor aqui (escondido) e abre a janela.
- O servidor desliga-se sozinho uns minutos depois de fechares a janela.
"""
import os
import subprocess
import sys
import threading
import urllib.request
import webbrowser
from pathlib import Path

BASE = Path(__file__).resolve().parent
os.chdir(BASE)
sys.path.insert(0, str(BASE))

# pythonw não tem consola: guarda mensagens e erros num ficheiro.
_log = open(BASE / "app.log", "a", encoding="utf-8", buffering=1)
sys.stdout = sys.stderr = _log

PORT = int(os.environ.get("PORT", "8765"))
URL = f"http://localhost:{PORT}"
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def aviso(msg):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(None, msg, "Cronómetro do Dia", 0x40)
    except Exception:
        print(msg)


def ja_a_correr():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/ping", timeout=1.5) as r:
            return b"cronometro" in r.read()
    except Exception:
        return False


def browser_app():
    env = os.environ.get
    for c in (
        Path(env("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(env("ProgramFiles", r"C:\Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        Path(env("LOCALAPPDATA", "")) / "Google/Chrome/Application/chrome.exe",
        Path(env("ProgramFiles", r"C:\Program Files")) / "Google/Chrome/Application/chrome.exe",
    ):
        if c.is_file():
            return str(c)
    return None


def abrir_janela():
    exe = browser_app()
    if exe:
        subprocess.Popen([exe, f"--app={URL}", "--window-size=1320,900"], creationflags=NO_WINDOW)
    else:
        webbrowser.open(URL)


def garantir_bibliotecas():
    try:
        import icalendar, recurring_ical_events, google_auth_oauthlib  # noqa: F401
    except ImportError:
        print("A instalar bibliotecas em falta…")
        subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check",
                        "-r", str(BASE / "requirements.txt")], creationflags=NO_WINDOW)


def main():
    if ja_a_correr():
        abrir_janela()
        return
    garantir_bibliotecas()
    import app
    srv = app.criar_servidor()
    if srv is None:
        aviso(f"A porta {PORT} está ocupada por outro programa. Fecha-o ou muda a variável PORT.")
        return
    threading.Timer(0.3, abrir_janela).start()
    app.servir(srv, auto_fechar=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        aviso(f"Não consegui abrir a app:\n{e}\n\nVê o ficheiro app.log na pasta da app.")
