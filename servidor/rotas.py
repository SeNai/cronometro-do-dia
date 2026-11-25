"""Pedidos HTTP: ficheiros da interface (web/dist/, gerada pelo Vite) e a API JSON usada pelo browser.

API
  GET  /api/ping              → a app está a correr? (usado por scripts/abrir.pyw)
  GET  /api/dados             → dados.json
  GET  /api/config            → definições
  GET  /api/eventos?dia=AAAA-MM-DD[&refrescar=1] → eventos dos calendários nesse dia
  GET  /api/google/estado     → estado da ligação ao Google
  POST /api/dados             → grava dados.json
  POST /api/config            → altera definições (só as chaves em CLIENT_KEYS)
  POST /api/google/credenciais|ligar|desligar|enviar

Todos os POST exigem o cabeçalho «X-App: cronometro», para que outros sites abertos
no browser não consigam escrever nos teus dados.
"""
import json
import time
from datetime import date
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, unquote, urlparse

from . import calendario, google_calendar as gcal
from .config import (CLIENT_KEYS, DATA, DATA_LOCK, GCRED, INTERFACE, get_config, load_json, save_json, today_ms,
                     update_config)

# Último pedido recebido: serve para desligar a app quando a janela é fechada (ver servidor/__init__.py).
LAST_SEEN = [time.time()]

# Tipos MIME explícitos: no Windows o registo pode dizer que .js é "text/plain",
# e o browser recusa carregar módulos JavaScript com esse tipo.
MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
}


# Página mostrada se a interface ainda não foi gerada (web/dist não existe).
SEM_INTERFACE = """<!doctype html><meta charset="utf-8"><title>Cronómetro do Dia</title>
<body style="font:16px system-ui;max-width:560px;margin:60px auto;line-height:1.5">
<h1>Falta gerar a interface</h1>
<p>A interface da app está na pasta <code>web</code> e tem de ser gerada uma vez com o Node.js:</p>
<pre style="background:#eee;padding:10px;border-radius:8px">cd web
npm install
npm run build</pre>
<p>Depois volta a carregar esta página. (Se abrires a app pelo atalho, isto é feito sozinho.)</p></body>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # sem registo de cada pedido no terminal
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")  # a app é local: sempre a versão mais recente
        self.end_headers()
        self.wfile.write(body)

    # ------------------------------------------------------------ ficheiros da interface

    def send_static(self, path):
        """Serve um ficheiro da interface gerada (sem deixar sair dessa pasta)."""
        if not (INTERFACE / "index.html").exists():
            return self.send(503, SEM_INTERFACE, "text/html; charset=utf-8")
        rel = unquote(path).lstrip("/") or "index.html"
        f = (INTERFACE / rel).resolve()
        if INTERFACE.resolve() not in f.parents or not f.is_file():
            return self.send(404, {"erro": "não encontrado"})
        self.send(200, f.read_bytes(), MIME.get(f.suffix.lower(), "application/octet-stream"))

    # ------------------------------------------------------------ GET

    def do_GET(self):
        LAST_SEEN[0] = time.time()
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return self.send_static(u.path)
        if u.path == "/api/ping":
            return self.send(200, {"ok": True, "app": "cronometro"})
        if u.path == "/api/dados":
            with DATA_LOCK:
                return self.send(200, load_json(DATA, {}))
        if u.path == "/api/config":
            return self.send(200, get_config())
        if u.path == "/api/google/estado":
            return self.send(200, gcal.g_state())
        if u.path == "/api/eventos":
            q = parse_qs(u.query)
            d = q.get("dia", [None])[0]
            try:
                day = date.fromisoformat(d) if d else date.today()
            except ValueError:
                return self.send(400, {"erro": "dia inválido"})
            if q.get("refrescar"):
                calendario.limpar_cache()
            ev, err = calendario.events_for(day)
            return self.send(200, {"eventos": ev, "erros": err})
        self.send(404, {"erro": "não encontrado"})

    # ------------------------------------------------------------ POST

    def do_POST(self):
        LAST_SEEN[0] = time.time()
        # Cabeçalho próprio: impede que outros sites escrevam nos teus dados.
        if self.headers.get("X-App") != "cronometro":
            return self.send(403, {"erro": "pedido recusado"})
        u = urlparse(self.path)
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self.send(400, {"erro": "JSON inválido"})

        if u.path == "/api/dados":
            with DATA_LOCK:
                save_json(DATA, body)
            gcal.acordar()  # pode haver blocos novos para enviar ao Google
            return self.send(200, {"ok": True})

        if u.path == "/api/config":
            changes = {k: v for k, v in body.items() if k in CLIENT_KEYS}
            if changes.get("google_escrever") and not get_config().get("google_desde"):
                changes["google_desde"] = today_ms()
            cfg = update_config(changes)
            calendario.limpar_cache()
            gcal.acordar()
            return self.send(200, cfg)

        if u.path == "/api/google/credenciais":
            if "web" in body:
                return self.send(400, {"erro": "Este cliente é do tipo «Aplicação Web». Cria um do tipo «App para computador»."})
            if "installed" not in body or "client_id" not in body["installed"]:
                return self.send(400, {"erro": "Este ficheiro não parece ser um cliente OAuth do Google."})
            save_json(GCRED, body)
            return self.send(200, gcal.g_state())

        if u.path == "/api/google/ligar":
            if not gcal.HAS_GOOGLE:
                return self.send(400, {"erro": "Faltam bibliotecas: corre  pip install -r servidor/requirements.txt"})
            if not GCRED.exists():
                return self.send(400, {"erro": "Primeiro carrega o ficheiro de credenciais."})
            gcal.iniciar_ligacao()
            return self.send(200, gcal.g_state())

        if u.path == "/api/google/desligar":
            gcal.desligar()
            return self.send(200, gcal.g_state())

        if u.path == "/api/google/enviar":
            gcal.acordar()
            return self.send(200, gcal.g_state())

        self.send(404, {"erro": "não encontrado"})
