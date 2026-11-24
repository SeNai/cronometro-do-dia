/*
 * Cronómetro: começar/parar atividades, atividade escolhida e duração do bloco.
 */

import { renderDial } from './roda.js';
import { save } from '../nucleo/api.js';
import { actById, busy, durOf, eventsOf } from '../nucleo/dados.js';
import { S } from '../nucleo/estado.js';
import { $, SCALE, hhmm, short, todayStr, uid } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';
import { render } from '../ui/desenho.js';

/* ---------- cronómetro ---------- */
export function stop() {
  if (!S.run) return;
  const end = Date.now();
  if (end - S.run.start > 1000) S.log.push({ uid: uid(), id: S.run.id, start: S.run.start, end });
  S.run = null;
  save();
  render();
}
// Começa uma atividade (ou para-a, se já estiver a correr).
// fromPlan: veio de um bloco do plano · dur: minutos na roda (senão usa durOf).
export function start(id, fromPlan, dur) {
  if (S.run && S.run.id === id) {
    if (!fromPlan) stop();
    return;
  }
  stop();
  const a = actById(id);
  if (!a) return;
  S.run = { id, start: Date.now(), target: dur != null ? Math.min(SCALE, Math.max(0, dur)) : durOf(a) };
  S.sel = id;
  save();
  render();
  const now = Date.now(),
    nx = eventsOf(todayStr()).filter(e => busy(e) && e.inicio > now)[0];
  if (nx) toast(`${a.name}: tens ${short(nx.inicio - now)} livres até "${nx.titulo}" (${hhmm(nx.inicio)}).`);
}

// a roda mostra a atividade selecionada; se for a que está a correr, mostra o tempo a correr
export const curAct = () => actById(S.sel) || (S.run && actById(S.run.id)) || S.acts[0];
export const viewRun = () => {
  const a = curAct();
  return S.run && a && S.run.id === a.id ? S.run : null;
};
export const curTarget = () => {
  const r = viewRun();
  return r ? r.target || 0 : durOf(curAct());
};
// Escolhe a atividade mostrada na roda, sem a começar.
export function select(id) {
  S.sel = id;
  save();
  document.querySelectorAll('#acts .tile').forEach(t => t.classList.toggle('sel', +t.dataset.id === id));
  renderDial();
}

// Muda a duração escolhida na roda (min). Com a atividade a correr, muda o tempo total do bloco.
export function setTarget(m, max = SCALE) {
  m = Math.min(max, Math.max(0, m));
  const a = curAct();
  if (!a) return;
  a.dur = m;
  const r = viewRun();
  if (r) {
    r.target = m;
    if (!m || Date.now() - r.start < m * 60000) r.alerted = false;
  }
  renderDial();
}

$('mainBtn').onclick = () => {
  if (viewRun()) stop();
  else {
    const a = curAct();
    if (a) start(a.id);
  }
};
$('otherRun').onclick = () => {
  if (S.run) select(S.run.id);
};
