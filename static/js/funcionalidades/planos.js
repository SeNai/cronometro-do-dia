/*
 * Planos do dia e semanas: modelos guardados, semana ativa (enche sozinha os dias sem plano) e o menu «📋 Planos».
 */

import { start } from './cronometro.js';
import { renderPlanos } from './editor-planos.js';
import { afterPlan, canPlan, plansOf, setPlans } from './plano.js';
import { save } from '../nucleo/api.js';
import { actById, color } from '../nucleo/dados.js';
import { S, ui } from '../nucleo/estado.js';
import { $, MIN, dayLabel, dayStart, esc, short, todayStr, uid } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';
import { setView } from '../ui/navegacao.js';
import { closePop, openPop } from '../ui/popover.js';

/* ---------- planos do dia e semanas ---------- */
// S.modelos     = [{id, nome, blocos:[{id, s, e}]}]             planos do dia (s/e = minutos desde a meia-noite)
// S.semanas     = [{id, nome, dias:{"0":[blocos], …, "6":[…]}}]  programas para a semana (0 = domingo … 6 = sábado)
// S.semanaAtiva = id da semana que enche sozinha os dias sem plano (ou null)
export const DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];
export const DIAS3 = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  ORDEM = [1, 2, 3, 4, 5, 6, 0];
export const wdOf = ds => new Date(dayStart(ds)).getDay();
// Plano do dia (modelo) pelo id.
export const modById = id => (S.modelos || []).find(m => m.id === id);
// Semana pelo id.
export const semById = id => (S.semanas || []).find(w => w.id === id);
// Próximo id livre numa lista.
export const nextId = arr => Math.max(0, ...arr.map(x => x.id)) + 1;
// Minutos somados de uma lista de blocos de modelo.
export const sumB = bs => (bs || []).reduce((s, b) => s + b.e - b.s, 0);
export const nB = n => `${n} bloco${n === 1 ? '' : 's'}`;
export const modSum = m => `${nB(m.blocos.length)} · ${short(sumB(m.blocos) * MIN)}`;
export const semDays = w => ORDEM.filter(d => ((w.dias || {})[d] || []).length);
export const semSum = w => {
  const n = semDays(w).length;
  return `${n} dia${n === 1 ? '' : 's'} · ${short(ORDEM.reduce((s, d) => s + sumB((w.dias || {})[d]), 0) * MIN)}`;
};
export const dotsOf = bs =>
  [...new Set((bs || []).map(b => b.id))]
    .filter(actById)
    .slice(0, 6)
    .map(id => `<span class="dot" style="--c:${color(actById(id))}"></span>`)
    .join('');
// Converte blocos de modelo (minutos desde a meia-noite) em blocos de um dia concreto (ms).
export const toPlan = (bs, ds) => {
  const d0 = dayStart(ds);
  return (bs || [])
    .filter(b => actById(b.id) && b.e > b.s)
    .map(b => ({ uid: uid(), id: b.id, start: d0 + b.s * MIN, end: d0 + b.e * MIN }));
};
// Programa da semana para o dia da semana de ds.
export const weekDayBlocks = (w, ds) => (w ? (w.dias || {})[wdOf(ds)] || [] : []);
// dia ainda sem plano + semana ativa com programa para esse dia da semana → o plano aparece sozinho
export function ensureWeekly(ds) {
  if (!canPlan(ds) || (S.plans && S.plans[ds] !== undefined)) return false;
  const bs = weekDayBlocks(semById(S.semanaAtiva), ds);
  if (!bs.length) return false;
  S.plans = S.plans || {};
  S.plans[ds] = toPlan(bs, ds);
  save();
  return true;
}
// Aplica blocos de um modelo a um dia (mode: substituir ou juntar), com «Desfazer».
export function applyBlocks(ds, bs, nome, mode) {
  const before = plansOf(ds).slice(),
    novos = toPlan(bs, ds);
  setPlans(ds, mode === 'juntar' ? [...before, ...novos] : novos);
  save();
  afterPlan();
  toast(
    `«${nome}» aplicado a ${dayLabel(ds).toLowerCase()}.`,
    '',
    'Desfazer',
    () => {
      setPlans(ds, before);
      save();
      afterPlan();
    },
    10000
  );
}
// Escolhe a semana ativa (0/null = nenhuma) e enche já hoje e o dia mostrado, se estiverem vazios.
export function setActiveWeek(id) {
  S.semanaAtiva = id || null;
  save();
  const t = todayStr(),
    w = semById(id);
  ensureWeekly(t);
  ensureWeekly(ui.viewDay);
  afterPlan();
  renderPlanos();
  if (!w) {
    toast('Nenhuma semana ativa. Os dias novos começam sem plano.');
    return;
  }
  const bs = weekDayBlocks(w, t),
    igual =
      plansOf(t).length &&
      bs.length &&
      plansOf(t).length === bs.length &&
      plansOf(t).every((p, i) => p.id === bs[i].id && p.start === dayStart(t) + bs[i].s * MIN);
  if (bs.length && plansOf(t).length && !igual)
    toast(
      `Semana «${w.nome}» ativa. Hoje já tinhas um plano, por isso não lhe mexi.`,
      '',
      'Usar a semana hoje',
      () => applyBlocks(t, bs, w.nome + ' · ' + DIAS3[wdOf(t)], 'substituir'),
      12000
    );
  else toast(`Semana «${w.nome}» ativa. Os dias sem plano recebem o programa desse dia.`);
}

/* menu «📋 Planos» na linha do tempo: aplicar um plano a este dia ou escolher a semana ativa */
export function openModelsPop(x, y) {
  const ds = ui.viewDay,
    ed = canPlan(ds),
    mods = S.modelos || [],
    sems = S.semanas || [],
    aw = semById(S.semanaAtiva),
    wb = weekDayBlocks(aw, ds);
  const opts = [
    ...(wb.length
      ? [
          {
            k: 'w',
            nome: `${aw.nome} · ${DIAS[wdOf(ds)]}`,
            bs: wb,
            sum: `${nB(wb.length)} · ${short(sumB(wb) * MIN)}`,
            icon: '📅'
          }
        ]
      : []),
    ...mods.map(m => ({ k: 'm' + m.id, nome: m.nome, bs: m.blocos, sum: modSum(m) }))
  ];
  const p = openPop(
    x,
    y,
    `<div class="ph"><b>Planos</b></div>
    ${
      ed
        ? `<div class="sec top"><span class="lbl">Aplicar a ${esc(dayLabel(ds).toLowerCase())}</span></div>
      <div id="apList">${
        opts
          .map(
            (o, i) =>
              `<div class="mrow"><button class="pa" data-ap="${i}"><span class="mdots">${o.icon || dotsOf(o.bs)}</span><span class="nm">${esc(o.nome)}</span><small>${o.sum}</small></button></div>`
          )
          .join('') ||
        '<div class="muted small" style="padding:2px 6px 6px">Ainda não tens planos do dia.</div>'
      }</div>`
        : '<div class="muted small" style="padding:2px 6px 6px">Este dia já passou. Escolhe hoje ou um dia à frente para aplicar um plano.</div>'
    }
    <div class="sec"><span class="lbl">Semana ativa · enche sozinha os dias sem plano</span></div>
    ${[{ id: 0, nome: 'Nenhuma' }, ...sems].map(w => `<button class="pa${(S.semanaAtiva || 0) === w.id ? ' cur' : ''}" data-sem="${w.id}"><span class="radio"></span><span class="nm">${esc(w.nome)}</span>${w.id ? `<small>${semSum(w)}</small>` : ''}</button>`).join('')}
    <div class="sec"><button class="btn sm" data-edit style="width:100%;justify-content:center">✎ Criar e editar planos</button></div>`,
    null,
    'wide'
  );
  p.querySelectorAll('[data-ap]').forEach(
    b =>
      (b.onclick = () => {
        const o = opts[+b.dataset.ap];
        if (!plansOf(ds).length) {
          closePop();
          applyBlocks(ds, o.bs, o.nome, 'substituir');
          return;
        }
        const row = b.closest('.mrow');
        p.querySelectorAll('.mask').forEach(m => m.remove());
        row.insertAdjacentHTML(
          'beforeend',
          `<div class="mask">Este dia já tem ${nB(plansOf(ds).length)}.
      <button class="btn sm primary" data-r>Substituir</button><button class="btn sm" data-j>Juntar</button></div>`
        );
        row.querySelector('[data-r]').onclick = () => {
          closePop();
          applyBlocks(ds, o.bs, o.nome, 'substituir');
        };
        row.querySelector('[data-j]').onclick = () => {
          closePop();
          applyBlocks(ds, o.bs, o.nome, 'juntar');
        };
      })
  );
  p.querySelectorAll('[data-sem]').forEach(
    b =>
      (b.onclick = () => {
        closePop();
        setActiveWeek(+b.dataset.sem);
      })
  );
  p.querySelector('[data-edit]').onclick = () => {
    closePop();
    setView('planos');
  };
}

$('modelsBtn').onclick = e => {
  if ($('pop')) {
    closePop();
    return;
  }
  const r = e.currentTarget.getBoundingClientRect();
  openModelsPop(r.left - 60, r.bottom + 30);
};
