/*
 * Plano de cada dia: blocos planeados, quanto falta das metas e «✨ Preencher o dia».
 */

import { loadEvents } from './calendario.js';
import { start } from './cronometro.js';
import { renderTimeline } from './linha-do-tempo.js';
import { renderNexts } from './roda.js';
import { save } from '../nucleo/api.js';
import { busy, eventsOf, totalDay } from '../nucleo/dados.js';
import { CFG, S, evCache, ui } from '../nucleo/estado.js';
import { $, MIN, SNAP, STEP, addDays, dayLabel, dayStart, short, todayStr, uid } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';

// Blocos planeados para um dia.
export const plansOf = ds => (S.plans && S.plans[ds]) || [];
// um dia com [] foi limpo de propósito (a semana tipo não volta a encher esse dia)
export function setPlans(ds, arr) {
  S.plans = S.plans || {};
  arr.sort((a, b) => a.start - b.start);
  S.plans[ds] = arr;
}
// Só se planeia hoje ou dias futuros.
export const canPlan = ds => ds >= todayStr();
// Hora «08:00» nesse dia → instante (ms).
export const hmOn = (ds, s, def) => {
  const [h, m] = String(s || def)
    .split(':')
    .map(Number);
  return dayStart(ds) + ((h || 0) * 60 + (m || 0)) * MIN;
};
// Onde começa o plano: agora (hoje) ou a hora de início das Definições (dias futuros).
export const planFrom = ds =>
  ds === todayStr() ? Math.ceil(Date.now() / SNAP) * SNAP : hmOn(ds, CFG.inicio_do_dia, '08:00');
// Onde acaba o plano: a hora de fim das Definições.
export const planEnd = ds => hmOn(ds, CFG.fim_do_dia, '23:00');
// minutos planeados (a partir de agora, se for hoje)
export function plannedMin(id, ds, except) {
  const f = ds === todayStr() ? Date.now() : 0;
  return plansOf(ds)
    .filter(p => p.id === id && p !== except && p.end > f)
    .reduce((s, p) => s + (p.end - Math.max(p.start, f)) / MIN, 0);
}
// quanto falta da meta nesse dia, já contando o que fizeste (hoje) e o que planeaste
export function goalLeft(a, ds, except) {
  if (!a.goal) return null;
  return Math.round(
    a.goal - (ds === todayStr() ? totalDay(a.id, ds) / MIN : 0) - plannedMin(a.id, ds, except)
  );
}
// Duração sugerida (min) para um bloco novo: o que falta da meta, até ao bloco máximo.
export function suggestLen(a, ds) {
  const r = goalLeft(a, ds),
    max = Math.max(10, +CFG.bloco_max_min || 45);
  return Math.max(10, Math.round(Math.min(max, r != null && r >= 10 ? r : 30) / 5) * 5);
}
// encurta o bloco para não passar por cima do bloco seguinte do plano nem de um compromisso
export function fitEnd(ds, s, len, except) {
  let e = Math.min(s + len * MIN, dayStart(addDays(ds, 1)));
  plansOf(ds).forEach(p => {
    if (p !== except && p.start >= s && p.start < e) e = p.start;
  });
  eventsOf(ds)
    .filter(busy)
    .forEach(v => {
      if (v.inicio > s && v.inicio < e) e = v.inicio;
    });
  return Math.max(e, s + SNAP);
}
// Junta um bloco ao plano de um dia.
export function addPlan(ds, id, s, e) {
  const arr = plansOf(ds).slice();
  const p = { uid: uid(), id, start: s, end: e };
  arr.push(p);
  setPlans(ds, arr);
  save();
  afterPlan();
  return p;
}
// Apaga um bloco do plano (com «Desfazer»).
export function delPlan(ds, p) {
  const before = plansOf(ds).slice();
  setPlans(
    ds,
    before.filter(x => x !== p)
  );
  save();
  afterPlan();
  toast(
    'Bloco apagado do plano.',
    '',
    'Desfazer',
    () => {
      setPlans(ds, before);
      save();
      afterPlan();
    },
    7000
  );
}
// Redesenha o que depende do plano.
export function afterPlan() {
  renderTimeline();
  renderNexts();
}
// Começa a atividade de um bloco do plano, com o tempo que falta até ao fim do bloco.
export function startPlan(p) {
  start(p.id, true, Math.max(STEP, Math.round((p.end - Math.max(p.start, Date.now())) / MIN / STEP) * STEP));
}

// «✨ Preencher o dia»: encaixa o que falta de cada meta nos espaços livres,
// sem mexer nos blocos que já existem nem nos compromissos.
export async function makePlan(ds) {
  if (!canPlan(ds)) {
    toast('Esse dia já passou.');
    return;
  }
  if (!evCache[ds]) await loadEvents(ds);
  const now = Date.now(),
    isToday = ds === todayStr(),
    from = planFrom(ds),
    endT = planEnd(ds);
  if (from >= endT) {
    toast('Já passou da hora de fim do dia (muda nas Definições).');
    return;
  }
  const keep = plansOf(ds);
  const occ = [
    ...eventsOf(ds)
      .filter(busy)
      .map(e => [e.inicio, e.fim]),
    ...keep.filter(p => p.end > from).map(p => [p.start, p.end])
  ].sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let cur = from;
  for (const [s, e] of occ) {
    if (e <= cur) continue;
    if (s >= endT) break;
    if (s > cur) gaps.push([cur, Math.min(s, endT)]);
    cur = Math.max(cur, e);
  }
  if (cur < endT) gaps.push([cur, endT]);
  const need = {};
  S.acts.forEach(a => {
    const r = goalLeft(a, ds);
    if (r != null && r >= 10) need[a.id] = r;
  });
  if (!Object.keys(need).length) {
    toast(
      S.acts.some(a => a.goal)
        ? 'As metas desse dia já estão todas cumpridas ou planeadas ✓'
        : 'Define metas em minutos nas atividades (✎ Editar) para o plano saber o que encaixar.'
    );
    return;
  }
  const maxB = Math.max(10, +CFG.bloco_max_min || 45),
    PAUSA = 5,
    novos = [];
  let last = isToday && S.run ? S.run.id : null;
  for (const [gs, ge] of gaps) {
    let t = gs;
    while (true) {
      const left = Math.floor((ge - t) / MIN);
      if (left < 10) break;
      const ids = Object.keys(need)
        .map(Number)
        .filter(i => need[i] >= 10)
        .sort((x, y) => need[y] - need[x]);
      if (!ids.length) break;
      const pick = ids.find(i => i !== last) ?? ids[0];
      const len = Math.min(need[pick], maxB, left);
      if (len < 10) break;
      novos.push({ uid: uid(), id: pick, start: t, end: t + len * MIN });
      need[pick] -= len;
      last = pick;
      t += (len + PAUSA) * MIN;
    }
  }
  const before = keep.slice();
  setPlans(ds, [...keep, ...novos]);
  save();
  afterPlan();
  const falta = Object.values(need).reduce((s, v) => s + Math.max(0, v), 0);
  if (novos.length)
    toast(
      `Juntei ${novos.length} bloco${novos.length > 1 ? 's' : ''} ao plano.` +
        (falta >= 5 ? ` Faltou espaço para ${short(falta * MIN)} das metas.` : ''),
      '',
      'Desfazer',
      () => {
        setPlans(ds, before);
        save();
        afterPlan();
      },
      10000
    );
  else toast('Não há espaços livres suficientes até ao fim do dia.');
}

$('planBtn').onclick = () => makePlan(ui.viewDay);

$('clearPlanBtn').onclick = () => {
  const ds = ui.viewDay,
    before = plansOf(ds).slice();
  if (!before.length) return;
  setPlans(ds, []);
  save();
  afterPlan();
  toast(
    `Plano de ${dayLabel(ds).toLowerCase()} limpo.`,
    '',
    'Desfazer',
    () => {
      setPlans(ds, before);
      save();
      afterPlan();
    },
    10000
  );
};
