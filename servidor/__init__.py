"""Servidor local do Cronómetro do Dia.

Organização:
  config.py           caminhos, JSON e definições
  calendario.py       leitura de calendários iCal (só leitura)
  google_calendar.py  escrita dos blocos no Google Calendar (opcional)
  rotas.py            pedidos HTTP: interface (static/) e API JSON

Uso (ver app.py e abrir.pyw):
  srv = criar_servidor()      # None se a porta já estiver ocupada (app já aberta)
  servir(srv, auto_fechar=True)
"""
import threading
import time
from http.server import ThreadingHTTPServer

from . import google_calendar as gcal
from .calendario import HAS_ICAL
from .config import CAL_DIR, PORT
from .rotas import LAST_SEEN, Handler

__all__ = ["criar_servidor", "servir", "PORT", "HAS_ICAL"]

FECHAR_APOS_SEG = 300  # sem pedidos durante 5 min (janela fechada) → a app desliga-se


def criar_servidor():
    """Cria o servidor em 127.0.0.1:PORT (só acessível neste computador)."""
    CAL_DIR.mkdir(exist_ok=True)
    try:
        return ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        return None


def servir(srv, auto_fechar=False):
    """Corre o servidor. Com auto_fechar, desliga-se uns minutos depois de fechares a janela da app."""
    threading.Thread(target=gcal.g_worker, daemon=True).start()
    gcal.acordar()
    if auto_fechar:
        def vigia():
            while True:
                time.sleep(15)
                # a janela da app faz pedidos a cada segundo; sem pedidos, foi fechada
                if not gcal.G["a_ligar"] and time.time() - LAST_SEEN[0] > FECHAR_APOS_SEG:
                    srv.shutdown()
                    return
        threading.Thread(target=vigia, daemon=True).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nAté já!")
