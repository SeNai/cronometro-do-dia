/*
 * Calendários lidos (iCal): carregar eventos de um dia e o cartão «Agenda de hoje».
 */

import { openCfg } from './definicoes.js';
import { renderTimeline } from './linha-do-tempo.js';
import { api } from '../nucleo/api.js';
import { busy } from '../nucleo/dados.js';
import { CFG, evCache, ui } from '../nucleo/estado.js';
import { $, esc, hhmm, short, todayStr } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';

/* ---------- calendário ---------- */
export async function loadEvents(ds, force) {
  try {
    evCache[ds] = await api('/api/eventos?dia=' + ds + (force ? '&refrescar=1' : ''));
  } catch (e) {
    evCache[ds] = { eventos: [], erros: ['Não consegui falar com a app. Ela ainda está aberta?'] };
  }
  renderAgenda();
  renderTimeline();
}
// Volta a ler hoje e o dia escolhido.
export function refreshCalendars(force) {
  loadEvents(todayStr(), force);
  if (ui.viewDay !== todayStr()) loadEvents(ui.viewDay, force);
}

// Cartão «Agenda de hoje»: compromisso atual, próximos e tempo livre até lá.
export function renderAgenda() {
  const ds = todayStr(),
    c = evCache[ds],
    now = Date.now();
  if (!c) {
    $('agenda').innerHTML = '<span class="muted">A ler o calendário…</span>';
    return;
  }
  const ev = c.eventos;
  const cur = ev.filter(e => busy(e) && e.inicio <= now && e.fim > now);
  const nxt = ev.filter(e => busy(e) && e.inicio > now);
  const allday = ev.filter(e => e.diaTodo);
  let h = '';
  cur.forEach(
    e =>
      (h += `<div class="ag cur"><span class="h">Agora</span><span><b>${esc(e.titulo)}</b> até às ${hhmm(e.fim)}</span></div>`)
  );
  nxt
    .slice(0, 4)
    .forEach(
      e =>
        (h += `<div class="ag"><span class="h num">${hhmm(e.inicio)}</span><span>${esc(e.titulo)} <span class="muted">· daqui a ${short(e.inicio - now)}</span></span></div>`)
    );
  if (!cur.length)
    h += nxt.length
      ? `<div class="free">Tens <b>${short(nxt[0].inicio - now)}</b> livres até ao próximo compromisso.</div>`
      : `<div class="free">Nada mais marcado hoje. O resto do dia é teu.</div>`;
  if (allday.length)
    h += `<div class="muted" style="margin-top:8px">Dia todo: ${allday.map(e => esc(e.titulo)).join(', ')}</div>`;
  if (!CFG.calendarios.length && !ev.length)
    h += `<div class="muted" style="margin-top:8px">Ainda não ligaste nenhum calendário. <a href="#" id="linkCfg">Ligar calendário</a></div>`;
  c.erros.forEach(e => (h += `<div class="err">⚠ ${esc(e)}</div>`));
  $('agenda').innerHTML = h;
  const l = $('linkCfg');
  if (l)
    l.onclick = e => {
      e.preventDefault();
      openCfg();
    };
}

$('refreshBtn').onclick = () => {
  refreshCalendars(true);
  toast('A atualizar o calendário…');
};
