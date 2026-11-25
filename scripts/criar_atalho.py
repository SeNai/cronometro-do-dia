"""Cria o atalho «Cronómetro do Dia» (com ícone) no Ambiente de Trabalho e no Menu Iniciar.

Corre uma vez:  .venv\\Scripts\\python scripts\\criar_atalho.py   (o instalar.bat já o faz)
Depois, no Menu Iniciar, clica com o botão direito no atalho → «Afixar na barra de tarefas».
"""
import base64
import os
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent  # pasta do projeto (este ficheiro está em scripts/)
NOME = "Cronómetro do Dia"


def pythonw():
    p = Path(sys.executable).with_name("pythonw.exe")
    return p if p.exists() else Path(sys.executable)


def ps_str(s):
    return "'" + str(s).replace("'", "''") + "'"


def criar(lnk):
    script = (
        "$ProgressPreference='SilentlyContinue';"
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut(" + ps_str(lnk) + ");"
        f"$s.TargetPath={ps_str(pythonw())};"
        f"$s.Arguments={ps_str(chr(34) + str(BASE / 'scripts' / 'abrir.pyw') + chr(34))};"
        f"$s.WorkingDirectory={ps_str(BASE)};"
        f"$s.IconLocation={ps_str(str(BASE / 'web' / 'public' / 'icone.ico') + ',0')};"
        f"$s.Description={ps_str('Cronometra as partes do teu dia')};"
        "$s.Save()"
    )
    enc = base64.b64encode(script.encode("utf-16-le")).decode()
    subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", enc], check=True,
                   stderr=subprocess.DEVNULL)


def main():
    if os.name != "nt":
        print("Isto só é preciso no Windows. No macOS/Linux usa o scripts/iniciar.command.")
        return
    destinos = [
        Path(os.environ["APPDATA"]) / "Microsoft/Windows/Start Menu/Programs" / f"{NOME}.lnk",
    ]
    try:
        desk = subprocess.run(["powershell", "-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"],
                              capture_output=True, text=True).stdout.strip()
        if desk:
            destinos.append(Path(desk) / f"{NOME}.lnk")
    except Exception:
        pass
    for d in destinos:
        criar(d)
        print(f"Atalho criado: {d}")
    print("\nPara o pores na barra de tarefas: abre o Menu Iniciar, procura «Cronómetro do Dia»,"
          "\nclica com o botão direito → «Afixar na barra de tarefas».")


if __name__ == "__main__":
    main()
