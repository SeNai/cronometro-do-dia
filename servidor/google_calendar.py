"""Escrita dos blocos feitos no Google Calendar (opcional).

Como funciona:
  1. O utilizador carrega as credenciais OAuth (cliente «App para computador»).
  2. «Ligar conta Google» abre o browser para autorizar (g_connect) e guarda o token.
  3. Uma thread (g_worker) acorda sempre que os dados mudam e sincroniza:
     cria/atualiza/apaga eventos num calendário próprio «Cronómetro do Dia».

Só pede acesso aos calendários criados pela própria app (scope calendar.app.created).
"""
import hashlib
import json
import threading
import time
from datetime import datetime
from urllib.parse import quote

from .config import (DATA, DATA_LOCK, GCRED, GSYNC, GTOKEN, get_config, load_json, save_json, today_ms,
                     update_config)

try:
    from google.auth.exceptions import RefreshError
    from google.auth.transport.requests import AuthorizedSession, Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    HAS_GOOGLE = True
except ImportError:  # sem bibliotecas: a interface mostra como as instalar
    HAS_GOOGLE = False

    class RefreshError(Exception):
        pass

GSCOPES = ["https://www.googleapis.com/auth/calendar.app.created"]
GAPI = "https://www.googleapis.com/calendar/v3"
GCAL_NOME = "Cronómetro do Dia"

# Mesma paleta de web/src/lib/consultas.ts, para escolher a cor do Google mais parecida.
COLORS = ['#2f8f78', '#3b6ea8', '#d06a3a', '#8a5aa8', '#c99a22', '#4f8a3a', '#b8456a', '#2f8f9a']
GOOGLE_CORES = {"1": "#7986cb", "2": "#33b679", "3": "#8e24aa", "4": "#e67c73", "5": "#f6bf26", "6": "#f4511e",
                "7": "#039be5", "8": "#616161", "9": "#3f51b5", "10": "#0b8043", "11": "#d50000"}

# Estado mostrado na interface (Definições e chip «✓ Google» no topo).
G = {"a_ligar": False, "erro": "", "ultimo": 0, "enviados": 0}
_gwake = threading.Event()     # «há trabalho»: acorda a thread de sincronização
_gsync_lock = threading.Lock()


def acordar():
    """Pede uma sincronização (por exemplo, depois de gravar dados novos)."""
    _gwake.set()


def g_state():
    """Resumo do estado da ligação, para a interface."""
    cfg = get_config()
    return {
        "disponivel": HAS_GOOGLE,
        "credenciais": GCRED.exists(),
        "ligado": GTOKEN.exists(),
        "escrever": bool(cfg.get("google_escrever")),
        "a_ligar": G["a_ligar"],
        "erro": G["erro"],
        "ultimo": int(G["ultimo"] * 1000),
        "enviados": G["enviados"],
    }


def g_session():
    """Sessão HTTP autenticada; renova o token se tiver expirado."""
    creds = Credentials.from_authorized_user_file(str(GTOKEN), GSCOPES)
    if not creds.valid:
        creds.refresh(Request())
        GTOKEN.write_text(creds.to_json(), encoding="utf-8")
    return AuthorizedSession(creds)


def g_connect():
    """Fluxo de autorização OAuth (abre o browser). Corre numa thread à parte."""
    G["a_ligar"], G["erro"] = True, ""
    try:
        flow = InstalledAppFlow.from_client_secrets_file(str(GCRED), GSCOPES)
        creds = flow.run_local_server(
            port=0, open_browser=True, timeout_seconds=300, prompt="consent",
            authorization_prompt_message="",
            success_message="Ligado! Já podes fechar esta janela e voltar ao Cronómetro do Dia.")
        if not creds or not creds.token:
            raise RuntimeError("a autorização não foi concluída")
        GTOKEN.write_text(creds.to_json(), encoding="utf-8")
        cfg = get_config()
        update_config({"google_escrever": True, "google_desde": cfg.get("google_desde") or today_ms()})
        _gwake.set()
    except Exception as e:
        G["erro"] = f"Não consegui ligar à conta Google: {e}"
    finally:
        G["a_ligar"] = False


def iniciar_ligacao():
    """Começa a ligação em segundo plano (se ainda não estiver a decorrer)."""
    if not G["a_ligar"]:
        threading.Thread(target=g_connect, daemon=True).start()
        G["a_ligar"] = True


def desligar():
    """Esquece o token e deixa de enviar blocos."""
    GTOKEN.unlink(missing_ok=True)
    update_config({"google_escrever": False})
    G["erro"] = ""


def g_color(act, act_id):
    """colorId do Google mais parecido com a cor da atividade."""
    hexc = (act or {}).get("color") or COLORS[(act_id - 1) % len(COLORS)]
    try:
        r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    except Exception:
        return None
    dist = lambda h: sum((int(h[i:i + 2], 16) - v) ** 2 for i, v in zip((1, 3, 5), (r, g, b)))
    return min(GOOGLE_CORES, key=lambda k: dist(GOOGLE_CORES[k]))


def iso(ms):
    return datetime.fromtimestamp(ms / 1000).astimezone().isoformat(timespec="seconds")


def g_calendar(s, mapping):
    """Id do calendário «Cronómetro do Dia»; cria-o se ainda não existir (ou se foi apagado)."""
    cid = get_config().get("google_cal_id")
    if cid:
        r = s.get(f"{GAPI}/calendars/{quote(cid, safe='')}")
        if r.status_code == 200:
            return cid
    r = s.post(f"{GAPI}/calendars", json={
        "summary": GCAL_NOME,
        "description": "Blocos de tempo registados pela app Cronómetro do Dia."})
    r.raise_for_status()
    cid = r.json()["id"]
    update_config({"google_cal_id": cid})
    mapping.clear()
    return cid


def _eventos_desejados(cfg):
    """O que devia estar no Google: um evento por bloco do registo (chave = uid do bloco)."""
    with DATA_LOCK:
        d = load_json(DATA, {})
    acts = {a.get("id"): a for a in d.get("acts", [])}
    desde = cfg.get("google_desde") or 0
    want = {}
    for l in d.get("log", []):
        uid = l.get("uid")
        if not uid or l.get("start", 0) < desde or l.get("end", 0) <= l.get("start", 0):
            continue
        a = acts.get(l.get("id"))
        body = {
            "summary": a["name"] if a else "(atividade removida)",
            "description": "Registado pelo Cronómetro do Dia.",
            "start": {"dateTime": iso(l["start"])},
            "end": {"dateTime": iso(l["end"])},
            "transparency": "transparent",  # não te marca como ocupado
        }
        cor = g_color(a, l.get("id") or 1)
        if cor:
            body["colorId"] = cor
        want[uid] = body
    return want


def g_sync_once():
    """Compara o registo com o que já foi enviado (google_sync.json) e envia só as diferenças."""
    cfg = get_config()
    if not (HAS_GOOGLE and cfg.get("google_escrever") and GTOKEN.exists()):
        return
    want = _eventos_desejados(cfg)

    m = load_json(GSYNC, {})
    s = g_session()
    ev = m.get("ev", {})            # uid do bloco -> {"id": id do evento no Google, "h": hash do conteúdo}
    cid = g_calendar(s, ev)
    if m.get("cal") != cid:
        ev = {}
    m = {"cal": cid, "ev": ev}
    base = f"{GAPI}/calendars/{quote(cid, safe='')}/events"

    # criar ou atualizar
    for uid, body in want.items():
        h = hashlib.sha1(json.dumps(body, sort_keys=True).encode()).hexdigest()
        cur = ev.get(uid)
        if cur and cur.get("h") == h:
            continue
        r = None
        if cur:
            r = s.put(f"{base}/{quote(cur['id'], safe='')}", json=body)
            if r.status_code in (404, 410):
                r = None
        if r is None:
            r = s.post(base, json=body)
        r.raise_for_status()
        ev[uid] = {"id": r.json()["id"], "h": h}
        G["enviados"] += 1
        save_json(GSYNC, m)

    # apagar os blocos que saíram do registo
    for uid in [u for u in ev if u not in want]:
        r = s.delete(f"{base}/{quote(ev[uid]['id'], safe='')}")
        if r.status_code not in (200, 204, 404, 410):
            r.raise_for_status()
        del ev[uid]
        save_json(GSYNC, m)


def g_worker():
    """Thread que sincroniza quando é acordada (ou a cada 5 minutos)."""
    while True:
        _gwake.wait(timeout=300)
        _gwake.clear()
        time.sleep(2)  # junta várias gravações seguidas num só envio
        with _gsync_lock:
            try:
                g_sync_once()
                G["erro"], G["ultimo"] = "", time.time()
            except RefreshError:
                G["erro"] = "A ligação ao Google expirou ou foi revogada. Volta a carregar em «Ligar conta Google»."
            except Exception as e:
                G["erro"] = f"Erro a enviar para o Google: {str(e)[:250]}"
