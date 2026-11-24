"""Caminhos dos ficheiros, leitura/escrita de JSON e definições da app.

Tudo o que a app guarda fica na pasta do projeto:
  dados.json   → atividades, registo de blocos, planos (escrito pelo browser via /api/dados)
  config.json  → definições (calendários, sons, horas do plano, Google…)
"""
import json
import os
import threading
from datetime import date, datetime, time as dtime
from pathlib import Path

# ---------------------------------------------------------------- caminhos

BASE = Path(__file__).resolve().parent.parent      # pasta do projeto
DATA = BASE / "dados.json"
CONFIG = BASE / "config.json"
CAL_DIR = BASE / "calendarios"                     # ficheiros .ics locais (opcional)
STATIC = BASE / "static"                           # interface (HTML, CSS, JS)
GCRED = BASE / "credenciais_google.json"           # cliente OAuth (transferido da Google Cloud Console)
GTOKEN = BASE / "token_google.json"                # autorização da tua conta
GSYNC = BASE / "google_sync.json"                  # que blocos já estão no Google
PORT = int(os.environ.get("PORT", "8765"))

# ---------------------------------------------------------------- bloqueios
# O servidor atende vários pedidos ao mesmo tempo (ThreadingHTTPServer):
# estes locks evitam que dois pedidos escrevam o mesmo ficheiro em simultâneo.

DATA_LOCK = threading.Lock()   # dados.json
CFG_LOCK = threading.Lock()    # config.json

# ---------------------------------------------------------------- definições

DEFAULT_CONFIG = {
    "calendarios": [],          # [{"nome": "...", "url": "https://...ics", "cor": "#3b6ea8"}]
    "pausar_em_eventos": True,  # pausa o cronómetro quando começa um compromisso
    "aviso_minutos": 10,        # aviso antes de cada compromisso
    "inicio_do_dia": "08:00",   # a partir de quando o plano preenche um dia que ainda não começou
    "fim_do_dia": "23:00",      # até quando o plano automático preenche
    "bloco_max_min": 45,        # duração máxima de cada bloco no plano
    "parar_no_fim": False,      # parar sozinho quando o tempo escolhido na roda acaba
    "som_mudo": False,          # silenciar todos os sons
    "som_volume": 70,           # 0–100
    "som_fim": "sino",          # som quando acaba o tempo de uma atividade
    "som_aviso": "sino",        # som dos avisos de compromissos
    "som_plano": "sino",        # som quando chega a hora de um bloco do plano
    "google_escrever": False,   # escrever os blocos feitos no Google Calendar
    "google_cal_id": "",        # id do calendário "Cronómetro do Dia" (gerido pela app)
    "google_desde": 0,          # só envia blocos a partir deste instante (ms)
}

# Chaves que o browser pode alterar via POST /api/config (as restantes são geridas pelo servidor).
CLIENT_KEYS = {"calendarios", "pausar_em_eventos", "aviso_minutos", "inicio_do_dia", "fim_do_dia",
               "bloco_max_min", "parar_no_fim", "google_escrever",
               "som_mudo", "som_volume", "som_fim", "som_aviso", "som_plano"}


def load_json(path, default):
    """Lê um ficheiro JSON; se não existir ou estiver estragado, devolve `default`."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path, obj):
    """Escreve JSON de forma atómica (ficheiro temporário + rename), para nunca ficar meio escrito."""
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def get_config():
    """Definições atuais: os valores por omissão com o que estiver em config.json por cima."""
    cfg = dict(DEFAULT_CONFIG)
    cfg.update(load_json(CONFIG, {}))
    return cfg


def update_config(changes):
    """Altera algumas definições e grava. Devolve as definições completas."""
    with CFG_LOCK:
        cfg = get_config()
        cfg.update(changes)
        save_json(CONFIG, cfg)
        return cfg


def today_ms():
    """Meia-noite de hoje, em milissegundos (o formato de tempo usado no browser)."""
    return int(datetime.combine(date.today(), dtime.min).timestamp() * 1000)
