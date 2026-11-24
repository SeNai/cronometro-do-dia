#!/usr/bin/env python3
"""Cronómetro do Dia — app local que junta cronómetro de atividades com o teu calendário.

Corre com:  python app.py   e abre  http://localhost:8765
(ou usa o atalho criado pelo criar_atalho.py, que abre a app numa janela própria e sem terminal)

Estrutura do projeto:
  app.py          este ficheiro: arranque pela linha de comandos
  abrir.pyw       arranque sem terminal (atalho do Windows)
  servidor/       backend em Python (definições, calendários, Google, API HTTP)
  web/            interface em React + TypeScript (gerada para web/dist/ com npm run build)
  dados.json      os teus dados · config.json as tuas definições

Opções:  --sem-browser   não abre o browser
         --auto-fechar   desliga-se uns minutos depois de fechares a janela
"""
import sys
import threading
import webbrowser

from servidor import HAS_ICAL, PORT, criar_servidor, servir
from servidor.interface import garantir_interface

__all__ = ["criar_servidor", "servir", "main"]  # usados pelo abrir.pyw


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
        print("Aviso: sem as bibliotecas de calendário. Corre: pip install -r requirements.txt")
    if "--sem-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    servir(srv, auto_fechar="--auto-fechar" in sys.argv)


if __name__ == "__main__":
    main()
