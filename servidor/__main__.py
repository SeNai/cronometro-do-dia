"""Arranca o Cronómetro do Dia pela linha de comandos.

Na pasta do projeto:  python -m servidor   e abre  http://localhost:8765
(o atalho do Windows faz o mesmo sem terminal — ver scripts/abrir.pyw)

Opções:  --sem-browser   não abre o browser
         --auto-fechar   desliga-se uns minutos depois de fechares a janela
"""
import sys
import threading
import webbrowser

from . import HAS_ICAL, PORT, criar_servidor, servir
from .interface import garantir_interface


def main():
    url = f"http://localhost:{PORT}"
    erro = garantir_interface()
    if erro:
        print(erro)
    srv = criar_servidor()
    if srv is None:
        print(f"A app já parece estar aberta. Abre {url} no browser.")
        webbrowser.open(url)
        return
    print(f"Cronómetro do Dia a correr em {url}  (fecha esta janela ou Ctrl+C para parar)")
    if not HAS_ICAL:
        print("Aviso: sem as bibliotecas de calendário. Corre: pip install -r servidor/requirements.txt")
    if "--sem-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    servir(srv, auto_fechar="--auto-fechar" in sys.argv)


if __name__ == "__main__":
    main()
