/*
 * Consultas sobre os dados: atividade por id, cor, tempo feito num dia, eventos de um dia.
 */

import { CFG, S, evCache } from './estado.js';
import { COLORS, SCALE, STEP, addDays, dayStart, todayStr } from './util.js';

// Atividade pelo id.
export const actById = id => S.acts.find(a => a.id === id);
// Cor da atividade (a escolhida ou uma da paleta).
export const color = a => (a ? a.color || COLORS[(a.id - 1) % COLORS.length] : '#888');
// Evento que ocupa tempo (não é de dia inteiro nem marcado como «livre»).
export const busy = e => !e.diaTodo && !e.livre;
// Eventos já lidos de um dia (vazio se ainda não chegaram).
export const eventsOf = ds => (evCache[ds] || {}).eventos || [];

// Milissegundos feitos numa atividade num dia (inclui o bloco a correr).
export function totalDay(id, ds) {
  const a = dayStart(ds),
    b = dayStart(addDays(ds, 1));
  let t = 0;
  const seg = (s, e) => {
    t += Math.max(0, Math.min(e, b) - Math.max(s, a));
  };
  S.log.forEach(l => {
    if (l.id === id) seg(l.start, l.end);
  });
  if (S.run && S.run.id === id) seg(S.run.start, Date.now());
  return t;
}
// duração sugerida para a roda: a última que usaste nesta atividade, ou o que falta para a meta
export function durOf(a) {
  if (!a) return 25;
  if (a.dur != null) return a.dur;
  const rem = a.goal ? a.goal - Math.round(totalDay(a.id, todayStr()) / 60000) : 0;
  const m = Math.min(+CFG.bloco_max_min || 45, rem > 0 ? rem : 25);
  return Math.min(SCALE, Math.max(STEP, Math.round(m / STEP) * STEP));
}
