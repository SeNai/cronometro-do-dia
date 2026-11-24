/*
 * Navegação: separadores da barra lateral e escolha do dia no topo (‹ Hoje ›).
 */

import { loadEvents } from '../funcionalidades/calendario.js';
import { renderPlanos } from '../funcionalidades/editor-planos.js';
import { renderTimeline } from '../funcionalidades/linha-do-tempo.js';
import { evCache, ui } from '../nucleo/estado.js';
import { $, addDays, dayLabel, todayStr } from '../nucleo/util.js';
import { render } from './desenho.js';

// Muda o dia mostrado (linha do tempo, resumo e registo).
export function goDay(ds) {
  ui.viewDay = ds;
  $('dayLbl').textContent = dayLabel(ds);
  if (!evCache[ds]) loadEvents(ds);
  render();
}
$('prevDay').onclick = () => goDay(addDays(ui.viewDay, -1));
$('nextDay').onclick = () => goDay(addDays(ui.viewDay, 1));
$('todayBtn').onclick = () => goDay(todayStr());

/* ---------- separadores ---------- */
export function setView(v) {
  if (!$('v-' + v)) v = 'hoje';
  document
    .querySelectorAll('nav.side [data-view]')
    .forEach(b => b.classList.toggle('on', b.dataset.view === v));
  document.querySelectorAll('main .view').forEach(el => (el.hidden = el.id !== 'v-' + v));
  try {
    localStorage.setItem('vista', v);
  } catch (e) {}
  if (v === 'hoje') {
    ui.scrolledFor = null;
    renderTimeline();
  }
  if (v === 'planos') renderPlanos();
  window.scrollTo(0, 0);
}
document.querySelectorAll('nav.side [data-view]').forEach(b => (b.onclick = () => setView(b.dataset.view)));
// Guarda a altura do topo numa variável CSS (a barra lateral fica logo por baixo).
export const fixHeader = () =>
  document.documentElement.style.setProperty('--hh', document.querySelector('header').offsetHeight + 'px');
window.addEventListener('resize', fixHeader);
fixHeader();
