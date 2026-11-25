"""Leitura de calendários (Google, Outlook, iCloud…) a partir de links iCal/.ics.

Só lê: nunca altera estes calendários. Os links ficam nas definições ("calendarios")
e também se leem os ficheiros .ics que estiverem na pasta calendarios/.
"""
import time
import urllib.request
from datetime import datetime, time as dtime, timedelta

from .config import CAL_DIR, get_config

try:
    import icalendar
    import recurring_ical_events
    HAS_ICAL = True
except ImportError:  # a app funciona sem calendários; avisa na interface
    HAS_ICAL = False

_cache = {}        # url -> (instante, bytes): evita descarregar o mesmo calendário a cada pedido
CACHE_SEG = 300    # 5 minutos


def limpar_cache():
    """Esquece os calendários descarregados (usado no botão «Atualizar» e ao mudar as definições)."""
    _cache.clear()


def fetch(url):
    """Descarrega um calendário (com cache). Aceita links webcal://."""
    now = time.time()
    hit = _cache.get(url)
    if hit and now - hit[0] < CACHE_SEG:
        return hit[1]
    real = "https://" + url[len("webcal://"):] if url.lower().startswith("webcal://") else url
    req = urllib.request.Request(real, headers={"User-Agent": "CronometroDoDia/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = r.read()
    _cache[url] = (now, data)
    return data


def to_local(v):
    """Converte datas do calendário para hora local sem fuso (naive)."""
    if isinstance(v, datetime):
        return v.astimezone().replace(tzinfo=None) if v.tzinfo else v
    return datetime.combine(v, dtime.min)  # evento de dia inteiro


def _fontes():
    """Lista de (nome, cor, conteúdo .ics) de todos os calendários configurados, e os erros."""
    sources, errors = [], []
    for i, c in enumerate(get_config().get("calendarios", [])):
        url = (c.get("url") or "").strip()
        if not url:
            continue
        name = c.get("nome") or f"Calendário {i + 1}"
        try:
            sources.append((name, c.get("cor"), fetch(url)))
        except Exception as e:
            errors.append(f"{name}: não consegui descarregar ({e})")

    if CAL_DIR.exists():
        for f in sorted(CAL_DIR.glob("*.ics")):
            try:
                sources.append((f.stem, None, f.read_bytes()))
            except Exception as e:
                errors.append(f"{f.name}: {e}")
    return sources, errors


def events_for(day):
    """Eventos de um dia (incluindo os que se repetem), já ordenados.

    Devolve (eventos, erros). Cada evento é um dict com: titulo, inicio/fim (ms),
    diaTodo, local, calendario, cor e livre (marcado como "disponível").
    """
    if not HAS_ICAL:
        return [], ["Faltam bibliotecas: corre  pip install -r servidor/requirements.txt"]
    start = datetime.combine(day, dtime.min)
    end = start + timedelta(days=1)
    sources, errors = _fontes()

    out = []
    for name, color, raw in sources:
        try:
            cal = icalendar.Calendar.from_ical(raw)
            for ev in recurring_ical_events.of(cal).between(start, end):
                if str(ev.get("STATUS", "")).upper() == "CANCELLED":
                    continue
                ds = ev.get("DTSTART")
                if ds is None:
                    continue
                s = ds.dt
                allday = not isinstance(s, datetime)
                if ev.get("DTEND") is not None:
                    e = ev.get("DTEND").dt
                elif ev.get("DURATION") is not None:
                    e = s + ev.get("DURATION").dt
                else:
                    e = s + (timedelta(days=1) if allday else timedelta(0))
                ls, le = to_local(s), to_local(e)
                if le <= start or ls >= end:
                    continue
                out.append({
                    "titulo": str(ev.get("SUMMARY") or "(sem título)"),
                    "inicio": int(ls.timestamp() * 1000),
                    "fim": int(le.timestamp() * 1000),
                    "diaTodo": allday,
                    "local": str(ev.get("LOCATION") or ""),
                    "calendario": name,
                    "cor": color,
                    "livre": str(ev.get("TRANSP", "")).upper() == "TRANSPARENT",
                })
        except Exception as e:
            errors.append(f"{name}: não consegui ler o calendário ({e})")

    out.sort(key=lambda x: (x["inicio"], x["titulo"]))
    return out, errors
