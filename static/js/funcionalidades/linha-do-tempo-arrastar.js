/*
 * Interação com a coluna Plano: passar o rato, clicar/arrastar para criar, mover e esticar blocos, e largar atividades vindas dos cartões.
 */

import { openBlockPop, openNewPop } from './linha-do-tempo-menus.js';
import { TL, renderTimeline } from './linha-do-tempo.js';
import {
  addPlan,
  afterPlan,
  canPlan,
  delPlan,
  fitEnd,
  plansOf,
  setPlans,
  startPlan,
  suggestLen
} from './plano.js';
import { save } from '../nucleo/api.js';
import { color } from '../nucleo/dados.js';
import { ui } from '../nucleo/estado.js';
import { $, MIN, PX, SNAP, addDays, dayStart, esc, hhmm, short, snap, todayStr } from '../nucleo/util.js';
import { closePop } from '../ui/popover.js';

/* ---------- linha do tempo: arrastar, esticar, criar ---------- */
export const tlEl = $('tl');
// Instante (ms) correspondente a uma posição vertical do rato.
export const tAt = y => {
  const r = tlEl.firstElementChild.getBoundingClientRect();
  return TL.lo + ((y - r.top) / PX) * MIN;
};
// Posição vertical (px) de um instante.
export const yOf = t => ((t - TL.lo) / MIN) * PX;
// Bloco do plano do dia mostrado, pelo uid.
export const planByUid = u => plansOf(TL.ds).find(p => p.uid === u);
// Hoje não se planeia para trás de agora.
export const minStart = () => (TL.ds === todayStr() ? Math.floor(Date.now() / SNAP) * SNAP : dayStart(TL.ds));
// Bloco «fantasma» enquanto se cria ou arrasta.
export function showPreview(s, e, c, label) {
  const inner = tlEl.firstElementChild;
  if (!inner) return;
  let el = $('tlPrev');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tlPrev';
    el.className = 'blk preview';
    el.dataset.lane = '2';
    inner.appendChild(el);
  }
  const t = yOf(s);
  el.style.top = t + 'px';
  el.style.height = Math.max(18, yOf(e) - t) + 'px';
  el.style.setProperty('--c', c || 'var(--accent)');
  el.innerHTML = `<b>${label}</b><small>${hhmm(s)}–${hhmm(e)} · ${short(e - s)}</small>`;
}
export const clearPreview = () => {
  const el = $('tlPrev');
  if (el) el.remove();
};
// Linha «＋ 14:30» ao passar o rato na coluna Plano.
export function showHover(t) {
  const inner = tlEl.firstElementChild;
  if (!inner) return;
  let el = $('tlHover');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tlHover';
    el.className = 'hoverline';
    inner.appendChild(el);
  }
  el.style.top = yOf(t) + 'px';
  el.innerHTML = `<span>＋ ${hhmm(t)}</span>`;
}
export const clearHover = () => {
  const el = $('tlHover');
  if (el) el.remove();
};
// Faz scroll quando se arrasta perto das bordas.
export function edgeScroll(y) {
  const r = tlEl.getBoundingClientRect();
  if (y < r.top + 36) tlEl.scrollTop -= 12;
  else if (y > r.bottom - 36) tlEl.scrollTop += 12;
}

// Arrasto em curso na coluna Plano: {mode: new|move|resize, …} ou null.
export let tdrag = null;
tlEl.addEventListener('pointermove', e => {
  if (tdrag) return;
  if (e.target.id === 'planLane' && canPlan(TL.ds) && !ui.tlLock) {
    const t = snap(tAt(e.clientY));
    if (t >= minStart()) showHover(t);
    else clearHover();
  } else clearHover();
});
tlEl.addEventListener('pointerleave', () => {
  if (!tdrag) clearHover();
});
tlEl.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !canPlan(TL.ds)) return;
  let b = e.target.closest('.blk.plan[data-uid]');
  // se um menu acabou de fechar, a linha do tempo foi redesenhada: usa o bloco novo
  if (b && !b.isConnected) b = tlEl.querySelector(`.blk.plan[data-uid="${b.dataset.uid}"]`);
  if (b) {
    const p = planByUid(b.dataset.uid);
    if (!p) return;
    tdrag = {
      mode: e.target.classList.contains('rs') ? 'resize' : 'move',
      p,
      el: b,
      y0: e.clientY,
      s: p.start,
      e: p.end,
      moved: false
    };
  } else if (e.target.id === 'planLane' || e.target.closest('#tlHover')) {
    const t = Math.max(minStart(), snap(tAt(e.clientY)));
    tdrag = { mode: 'new', a0: t, s: t, e: null, y0: e.clientY, moved: false };
  } else return;
  e.preventDefault();
  clearHover();
  ui.tlLock = true;
  try {
    tlEl.setPointerCapture(e.pointerId);
  } catch (_) {}
});
tlEl.addEventListener('pointermove', e => {
  const d = tdrag;
  if (!d) return;
  if (!d.moved && Math.abs(e.clientY - d.y0) < 4) return;
  d.moved = true;
  edgeScroll(e.clientY);
  const dayA = dayStart(TL.ds),
    dayB = dayStart(addDays(TL.ds, 1));
  if (d.mode === 'move') {
    const len = d.p.end - d.p.start;
    let s = snap(d.p.start + ((e.clientY - d.y0) / PX) * MIN);
    s = Math.min(Math.max(s, minStart(), dayA), dayB - len);
    d.s = s;
    d.e = s + len;
    d.el.classList.add('moving');
    d.el.style.top = yOf(s) + 'px';
    const sm = d.el.querySelector('small');
    if (sm) sm.textContent = `${hhmm(s)}–${hhmm(d.e)} · ${short(len)}`;
  } else if (d.mode === 'resize') {
    d.e = Math.min(dayB, Math.max(d.p.start + SNAP, snap(tAt(e.clientY))));
    d.el.classList.add('moving');
    d.el.style.height = Math.max(18, yOf(d.e) - yOf(d.p.start)) + 'px';
    const sm = d.el.querySelector('small');
    if (sm) sm.textContent = `${hhmm(d.p.start)}–${hhmm(d.e)} · ${short(d.e - d.p.start)}`;
  } else {
    const t = Math.min(dayB, Math.max(minStart(), snap(tAt(e.clientY))));
    d.s = Math.min(d.a0, t);
    d.e = Math.max(d.a0, t);
    if (d.e - d.s < SNAP) d.e = d.s + SNAP;
    showPreview(d.s, d.e, null, 'Novo bloco');
  }
});
// Fim de um arrasto: aplica a mudança, ou abre um menu se foi só um clique.
export const endTDrag = e => {
  const d = tdrag;
  if (!d) return;
  tdrag = null;
  if (d.mode === 'new') {
    if (!d.moved) d.e = null;
    else if (d.e - d.s < 10 * MIN) d.e = d.s + 10 * MIN;
    openNewPop(e.clientX, e.clientY, TL.ds, d.s, d.e);
    return;
  }
  ui.tlLock = false;
  if (d.moved) {
    d.p.start = d.s;
    d.p.end = d.e;
    setPlans(TL.ds, plansOf(TL.ds).slice());
    save();
    afterPlan();
  } else openBlockPop(e.clientX, e.clientY, TL.ds, d.p);
};
tlEl.addEventListener('pointerup', endTDrag);
tlEl.addEventListener('pointercancel', () => {
  tdrag = null;
  ui.tlLock = false;
  clearPreview();
  renderTimeline();
});
tlEl.addEventListener('dblclick', e => {
  const b = e.target.closest('.blk.plan[data-uid]');
  const p = b && planByUid(b.dataset.uid);
  if (p && TL.ds === todayStr() && p.end > Date.now()) {
    closePop();
    startPlan(p);
  }
});
tlEl.addEventListener('keydown', e => {
  const b = e.target.closest('.blk.plan[data-uid]');
  const p = b && planByUid(b.dataset.uid);
  if (!p || !canPlan(TL.ds)) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    delPlan(TL.ds, p);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const r = b.getBoundingClientRect();
    openBlockPop(r.right, r.top + 20, TL.ds, p);
  }
});

// arrastar uma atividade (dos cartões) para a linha do tempo
export function dropSlot(y, a) {
  const s = Math.max(minStart(), snap(tAt(y) - 10 * MIN));
  return [s, fitEnd(TL.ds, s, suggestLen(a, TL.ds))];
}
tlEl.addEventListener('dragover', e => {
  if (!ui.dragAct || !canPlan(TL.ds)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  edgeScroll(e.clientY);
  const [s, en] = dropSlot(e.clientY, ui.dragAct);
  showPreview(s, en, color(ui.dragAct), esc(ui.dragAct.name));
});
tlEl.addEventListener('dragleave', e => {
  if (!tlEl.contains(e.relatedTarget)) clearPreview();
});
tlEl.addEventListener('drop', e => {
  if (!ui.dragAct || !canPlan(TL.ds)) return;
  e.preventDefault();
  const a = ui.dragAct,
    [s, en] = dropSlot(e.clientY, a);
  ui.dragAct = null;
  clearPreview();
  tlEl.classList.remove('dropping');
  ui.tlLock = false;
  addPlan(TL.ds, a.id, s, en);
});
