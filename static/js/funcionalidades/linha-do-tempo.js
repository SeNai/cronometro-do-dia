/*
 * Desenho da linha do tempo (colunas Agenda / Feito / Plano) e o resumo do plano por cima.
 */

import { canPlan, planFrom, plannedMin, plansOf } from './plano.js';
import { ensureWeekly } from './planos.js';
import { actById, color, eventsOf, totalDay } from '../nucleo/dados.js';
import { S, ui } from '../nucleo/estado.js';
import { $, MIN, PX, dayLabel, dayStart, esc, hhmm, pad, short, todayStr } from '../nucleo/util.js';

// Dia mostrado e intervalo de horas desenhado (lo/hi em ms).
export let TL = { ds: null, lo: 0, hi: 0 };
// Desenha a linha do tempo do dia escolhido: compromissos, blocos feitos, plano e a linha «agora».
export function renderTimeline() {
  if (ui.tlLock) return; // não redesenha a meio de arrastar ou com o menu aberto
  ensureWeekly(ui.viewDay);
  const ds = ui.viewDay,
    d0 = dayStart(ds),
    ev = eventsOf(ds),
    ed = canPlan(ds),
    now = Date.now();
  let h0 = Math.min(7, Math.floor((planFrom(ds) - d0) / 3600000));
  const h1 = 24;
  if (ds === todayStr()) h0 = 7;
  const consider = t => {
    const h = (t - d0) / 3600000;
    if (h >= 0 && h < h0) h0 = Math.floor(h);
  };
  ev.filter(e => !e.diaTodo).forEach(e => consider(Math.max(e.inicio, d0)));
  S.log.forEach(l => consider(Math.max(l.start, d0)));
  plansOf(ds).forEach(p => consider(Math.max(p.start, d0)));
  if (S.run) consider(Math.max(S.run.start, d0));
  h0 = Math.max(0, h0);
  const lo = d0 + h0 * 3600000,
    hi = d0 + h1 * 3600000;
  TL = { ds, lo, hi };
  const top = t => ((t - lo) / MIN) * PX;
  let html = `<div class="tl-inner" style="height:${(h1 - h0) * 60 * PX + 10}px">`;
  for (let h = h0; h <= h1; h++)
    html += `<div class="hr" style="top:${(h - h0) * 60 * PX}px"><span class="num">${pad(h % 24)}:00</span></div>`;
  html += `<div class="planlane${ed ? '' : ' ro'}" id="planLane"${ed ? ' title="Clica ou arrasta para planear"' : ''}></div>`;
  const block = (lane, s, e, cls, style, label, sub, attrs, extra) => {
    const a = Math.max(s, lo),
      b = Math.min(e, hi);
    if (b <= a) return '';
    const t = top(a),
      hh = Math.max(18, top(b) - t);
    return `<div class="blk ${cls}" style="top:${t}px;height:${hh}px;${style}" data-lane="${lane}" ${attrs || ''}><b>${label}</b>${hh > 32 && sub ? `<small>${sub}</small>` : ''}${extra || ''}</div>`;
  };
  ev.filter(e => !e.diaTodo).forEach(
    e =>
      (html += block(
        0,
        e.inicio,
        e.fim,
        'ev' + (e.livre ? ' livre' : ''),
        e.cor ? `border-left-color:${esc(e.cor)}` : '',
        esc(e.titulo),
        `${hhmm(e.inicio)}–${hhmm(e.fim)}${e.local ? ' · ' + esc(e.local) : ''}`,
        `title="${esc(e.titulo)} (${esc(e.calendario)})"`
      ))
  );
  S.log.forEach(l => {
    const a = actById(l.id);
    html += block(
      1,
      l.start,
      l.end,
      'done',
      '--c:' + color(a),
      a ? esc(a.name) : '(removida)',
      `${hhmm(l.start)}–${hhmm(l.end)}`
    );
  });
  if (S.run) {
    const a = actById(S.run.id);
    html += block(1, S.run.start, now, 'done running', '--c:' + color(a), esc(a ? a.name : ''), 'a correr…');
  }
  plansOf(ds).forEach(p => {
    const a = actById(p.id);
    if (!a) return;
    html += block(
      2,
      p.start,
      p.end,
      'plan' + (ed ? ' ed' : '') + (p.end < now ? ' past' : ''),
      '--c:' + color(a),
      esc(a.name),
      `${hhmm(p.start)}–${hhmm(p.end)} · ${short(p.end - p.start)}`,
      `data-uid="${p.uid}" tabindex="0" title="${esc(a.name)} · ${hhmm(p.start)}–${hhmm(p.end)}${ed ? '\nArrasta para mover · puxa a base para mudar a duração · clica para opções' : ''}"`,
      ed ? '<i class="rs"></i>' : ''
    );
  });
  if (ds === todayStr()) html += `<div class="nowline" style="top:${top(now)}px"></div>`;
  html += '</div>';
  const tl = $('tl'),
    keep = tl.scrollTop;
  tl.innerHTML = html;
  tl.scrollTop = keep;
  $('allday').innerHTML = ev
    .filter(e => e.diaTodo)
    .map(e => `<span>${esc(e.titulo)}</span>`)
    .join('');
  if (ui.scrolledFor !== ds) {
    ui.scrolledFor = ds;
    tl.scrollTop = ds === todayStr() ? Math.max(0, top(now) - 140) : Math.max(0, top(planFrom(ds)) - 40);
  }
  // cabeçalho do cartão
  const isT = ds === todayStr();
  $('tlDay').textContent = isT ? '' : dayLabel(ds);
  $('planBtn').hidden = !ed;
  $('planBtn').textContent = isT ? '✨ Preencher o resto do dia' : '✨ Preencher o dia';
  $('clearPlanBtn').hidden = !ed || !plansOf(ds).length;
  renderPlanSum(ds);
}
// Chips por cima da linha do tempo: feito + planeado de cada meta nesse dia.
export function renderPlanSum(ds) {
  const isT = ds === todayStr(),
    ps = plansOf(ds);
  if (!canPlan(ds)) {
    $('planSum').innerHTML = ps.length ? '<span class="hint">Plano que tinhas para este dia.</span>' : '';
    return;
  }
  const chips = S.acts
    .map(a => {
      const pl = Math.round(plannedMin(a.id, ds)),
        dn = isT ? Math.round(totalDay(a.id, ds) / MIN) : 0;
      if (!a.goal && !pl) return '';
      const got = pl + dn,
        ok = a.goal && got >= a.goal;
      return `<span class="pchip${ok ? ' ok' : ''}" style="--c:${color(a)}" title="${esc(a.name)}: ${isT ? `${dn} min feitos + ` : ''}${pl} min planeados${a.goal ? ` · meta ${a.goal} min` : ''}"><span class="dot"></span>${esc(a.name)} <b class="num">${short(got * MIN)}</b>${a.goal ? `/${a.goal}` : ''}${ok ? ' ✓' : ''}</span>`;
    })
    .join('');
  $('planSum').innerHTML =
    chips +
    (ps.length
      ? ''
      : `<span class="hint">Arrasta uma atividade para a coluna Plano, ou clica lá para escolher.</span>`);
}
