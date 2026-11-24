/*
 * Menus da coluna Plano: escolher a atividade de um bloco novo e as opções de um bloco (duração, trocar, duplicar, apagar).
 */

import { showPreview } from './linha-do-tempo-arrastar.js';
import { addPlan, afterPlan, delPlan, fitEnd, goalLeft, startPlan, suggestLen } from './plano.js';
import { save } from '../nucleo/api.js';
import { actById, color } from '../nucleo/dados.js';
import { S } from '../nucleo/estado.js';
import { $, MIN, dayLabel, esc, hhmm, pad, short, todayStr } from '../nucleo/util.js';
import { closePop, openPop } from '../ui/popover.js';

// Lista de atividades para escolher, com quanto falta de cada meta.
export function actRows(ds, curId, except) {
  return (
    S.acts
      .map((a, i) => {
        const r = goalLeft(a, ds, except);
        return `<button class="pa${a.id === curId ? ' cur' : ''}" data-a="${a.id}" style="--c:${color(a)}"><span class="dot"></span><span class="nm">${esc(a.name)}</span>${r != null ? `<small>${r > 0 ? 'faltam ' + short(r * MIN) : '✓'}</small>` : ''}${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`;
      })
      .join('') ||
    '<div class="muted small" style="padding:6px">Ainda não tens atividades. Cria uma em ✎ Editar.</div>'
  );
}
// Menu «Que atividade?» para um bloco novo (e = null → usa a duração sugerida).
export function openNewPop(x, y, ds, s, e) {
  const prevLen = e ? e : fitEnd(ds, s, 30);
  showPreview(s, prevLen, null, 'Novo bloco');
  const p = openPop(
    x,
    y,
    `<div class="ph">Planear ${e ? `<b>${hhmm(s)}–${hhmm(e)}</b>` : `às <b>${hhmm(s)}</b>`}${ds === todayStr() ? '' : ' · ' + esc(dayLabel(ds))}<br>Que atividade?</div>${actRows(ds)}`
  );
  p.querySelectorAll('[data-a]').forEach(b => {
    const a = actById(+b.dataset.a);
    b.onmouseenter = b.onfocus = () =>
      showPreview(s, e || fitEnd(ds, s, suggestLen(a, ds)), color(a), esc(a.name));
    b.onclick = () => {
      closePop();
      addPlan(ds, a.id, s, e || fitEnd(ds, s, suggestLen(a, ds)));
    };
  });
  const f = p.querySelector('[data-a]');
  if (f) f.focus();
}
// Menu de um bloco do plano: começar, duração, trocar de atividade, duplicar, apagar.
export function openBlockPop(x, y, ds, pl) {
  const a = actById(pl.id),
    len = Math.round((pl.end - pl.start) / MIN),
    isT = ds === todayStr();
  const durs = [15, 30, 45, 60, 90, 120];
  const p = openPop(
    x,
    y,
    `<div class="ph"><b>${esc(a ? a.name : '?')}</b> · ${hhmm(pl.start)}–${hhmm(pl.end)} (${short(pl.end - pl.start)})</div>
    ${isT && pl.end > Date.now() ? `<button class="btn sm primary" data-go style="width:100%;justify-content:center;margin-bottom:8px">▶ Começar agora</button>` : ''}
    <div class="sec" style="border:none;margin:0;padding:0"><span class="lbl">Duração</span>${durs.map(m => `<button class="btn sm dur${m === len ? ' cur' : ''}" data-m="${m}">${m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? pad(m % 60) : '')}</button>`).join('')}</div>
    <div class="sec"><span class="lbl">Trocar de atividade</span></div>${actRows(ds, pl.id, pl)}
    <div class="sec"><button class="btn sm ghost" data-dup>⧉ Duplicar a seguir</button><span style="flex:1"></span><button class="btn sm ghost del" data-del>🗑 Apagar</button></div>`
  );
  const go = p.querySelector('[data-go]');
  if (go)
    go.onclick = () => {
      closePop();
      startPlan(pl);
    };
  p.querySelectorAll('[data-m]').forEach(
    b =>
      (b.onclick = () => {
        pl.end = fitEnd(ds, pl.start, +b.dataset.m, pl);
        closePop();
        save();
        afterPlan();
      })
  );
  p.querySelectorAll('[data-a]').forEach(
    b =>
      (b.onclick = () => {
        pl.id = +b.dataset.a;
        closePop();
        save();
        afterPlan();
      })
  );
  p.querySelector('[data-dup]').onclick = () => {
    const s = pl.end + 5 * MIN;
    closePop();
    addPlan(ds, pl.id, s, fitEnd(ds, s, len));
  };
  p.querySelector('[data-del]').onclick = () => {
    closePop();
    delPlan(ds, pl);
  };
  (go || p.querySelector('.pa.cur') || p.querySelector('button')).focus();
}
