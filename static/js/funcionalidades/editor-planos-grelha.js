/*
 * Grelha do editor de planos: desenhar blocos, criar (clicar/arrastar), mover (também para outro dia), esticar e largar atividades da paleta.
 * Os blocos dos modelos usam minutos desde a meia-noite: {id, s, e}.
 */

import { openEBlock, openEPick } from './editor-planos-menus.js';
import { EG, PXE, changed, editorEstado, renderPlanos } from './editor-planos.js';
import { actById, color } from '../nucleo/dados.js';
import { CFG } from '../nucleo/estado.js';
import { $, MIN, esc, pad, short } from '../nucleo/util.js';

// HTML de um bloco na grelha.
export function eBlockHtml(b, bi) {
  const a = actById(b.id),
    t = (b.s - EG.h0 * 60) * PXE,
    h = Math.max(16, (b.e - b.s) * PXE);
  return `<div class="blk plan ed eblk" data-bi="${bi}" tabindex="0" style="top:${t}px;height:${h}px;--c:${color(a)}" title="${esc(a ? a.name : '(removida)')} · ${hm(b.s)}–${hm(b.e)}"><b>${a ? esc(a.name) : '(removida)'}</b>${h > 30 ? `<small>${hm(b.s)}–${hm(b.e)} · ${short((b.e - b.s) * MIN)}</small>` : ''}<i class="rs"></i></div>`;
}
// «14:30» a partir de minutos desde a meia-noite.
export const hm = m => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
export const eSnap = m => Math.round(m / 5) * 5;
// Minuto do dia numa posição vertical de uma coluna.
export function eMinAt(col, y) {
  return EG.h0 * 60 + (y - col.getBoundingClientRect().top) / PXE;
}
// Coluna (dia da semana) debaixo do rato.
export function eColAt(x) {
  return [...document.querySelectorAll('#pEditor .ecol')].find(c => {
    const r = c.getBoundingClientRect();
    return x >= r.left && x < r.right;
  });
}
// se cair dentro de um bloco que já existe, começa logo a seguir a ele
export function eFree(bs, s) {
  bs.slice()
    .sort((x, y) => x.s - y.s)
    .forEach(b => {
      if (b.s <= s && b.e > s) s = b.e;
    });
  return Math.min(s, 1435);
}
// Encurta um bloco para não passar por cima do seguinte.
export function eFit(bs, s, len, except) {
  let e = Math.min(s + len, 1440);
  bs.forEach(b => {
    if (b !== except && b.s >= s && b.s < e) e = b.s;
  });
  return Math.max(e, s + 5);
}
// Duração por omissão de um bloco novo: a meta, até ao bloco máximo.
export const eLen = a => Math.max(10, Math.min(+CFG.bloco_max_min || 45, a && a.goal ? a.goal : 30));
// Bloco «fantasma» enquanto se cria ou se arrasta da paleta.
export function ePrev(col, s, e, c, label) {
  let el = $('ePrev');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ePrev';
    el.className = 'blk preview';
  }
  if (el.parentNode !== col) col.appendChild(el);
  el.style.top = (s - EG.h0 * 60) * PXE + 'px';
  el.style.height = Math.max(16, (e - s) * PXE) + 'px';
  el.style.setProperty('--c', c || 'var(--accent)');
  el.innerHTML = `<b>${label}</b><small>${hm(s)}–${hm(e)}</small>`;
}
export const ePrevClear = () => {
  const el = $('ePrev');
  if (el) el.remove();
};
// Faz scroll quando se arrasta perto das bordas da grelha.
export function eEdge(y) {
  const sc = document.querySelector('#pEditor .escroll');
  if (!sc) return;
  const r = sc.getBoundingClientRect();
  if (y < r.top + 30) sc.scrollTop -= 12;
  else if (y > r.bottom - 30) sc.scrollTop += 12;
}

// Contentor do editor (os eventos de rato ficam aqui; o conteúdo é redesenhado).
export const pEd = $('pEditor');
pEd.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !EG) return;
  const col = e.target.closest('.ecol');
  if (!col) return;
  const ci = +col.dataset.ci,
    blk = e.target.closest('.eblk');
  if (blk) {
    const b = EG.cols[ci].bs[+blk.dataset.bi];
    editorEstado.drag = {
      mode: e.target.classList.contains('rs') ? 'resize' : 'move',
      ci,
      b,
      el: blk,
      y0: e.clientY,
      x0: e.clientX,
      s: b.s,
      e: b.e,
      to: ci,
      moved: false
    };
  } else {
    const m = eSnap(eMinAt(col, e.clientY));
    editorEstado.drag = { mode: 'new', ci, col, a0: m, s: m, e: m + 30, y0: e.clientY, moved: false };
  }
  e.preventDefault();
  try {
    pEd.setPointerCapture(e.pointerId);
  } catch (_) {}
});
pEd.addEventListener('pointermove', e => {
  const d = editorEstado.drag;
  if (!d) return;
  if (!d.moved && Math.abs(e.clientY - d.y0) < 4 && Math.abs(e.clientX - (d.x0 ?? e.clientX)) < 6) return;
  d.moved = true;
  eEdge(e.clientY);
  if (d.mode === 'move') {
    const len = d.b.e - d.b.s,
      col = (EG.isW && eColAt(e.clientX)) || d.el.parentNode;
    let s = eSnap(d.b.s + (e.clientY - d.y0) / PXE);
    s = Math.min(Math.max(s, 0), 1440 - len);
    d.s = s;
    d.e = s + len;
    d.to = +col.dataset.ci;
    if (d.el.parentNode !== col) col.appendChild(d.el);
    d.el.classList.add('moving');
    d.el.style.top = (s - EG.h0 * 60) * PXE + 'px';
    const sm = d.el.querySelector('small');
    if (sm) sm.textContent = `${hm(s)}–${hm(d.e)} · ${short(len * MIN)}`;
  } else if (d.mode === 'resize') {
    d.e = Math.min(1440, Math.max(d.b.s + 5, eSnap(eMinAt(d.el.parentNode, e.clientY))));
    d.el.classList.add('moving');
    d.el.style.height = Math.max(16, (d.e - d.b.s) * PXE) + 'px';
    const sm = d.el.querySelector('small');
    if (sm) sm.textContent = `${hm(d.b.s)}–${hm(d.e)} · ${short((d.e - d.b.s) * MIN)}`;
  } else {
    const m = Math.min(1440, Math.max(0, eSnap(eMinAt(d.col, e.clientY))));
    d.s = Math.min(d.a0, m);
    d.e = Math.max(d.a0, m);
    if (d.e - d.s < 5) d.e = d.s + 5;
    ePrev(d.col, d.s, d.e, null, 'Novo bloco');
  }
});
pEd.addEventListener('pointerup', e => {
  const d = editorEstado.drag;
  if (!d) return;
  editorEstado.drag = null;
  if (d.mode === 'new') {
    const bs = EG.cols[d.ci].bs;
    openEPick(e.clientX, e.clientY, bs, d.s, d.moved ? Math.max(d.e, d.s + 10) : null, d.col);
    return;
  }
  if (!d.moved) {
    openEBlock(e.clientX, e.clientY, d.ci, d.b);
    return;
  }
  if (d.mode === 'move') {
    d.b.s = d.s;
    d.b.e = d.e;
    if (d.to !== d.ci) {
      const from = EG.cols[d.ci].bs;
      from.splice(from.indexOf(d.b), 1);
      EG.cols[d.to].bs.push(d.b);
    }
  } else d.b.e = d.e;
  EG.cols.forEach(c => c.bs.sort((x, y) => x.s - y.s));
  changed();
});
pEd.addEventListener('pointercancel', () => {
  editorEstado.drag = null;
  ePrevClear();
  renderPlanos();
});
pEd.addEventListener('keydown', e => {
  const blk = e.target.closest && e.target.closest('.eblk');
  if (!blk || !EG) return;
  const bs = EG.cols[+blk.closest('.ecol').dataset.ci].bs,
    b = bs[+blk.dataset.bi];
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    bs.splice(bs.indexOf(b), 1);
    changed();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const r = blk.getBoundingClientRect();
    openEBlock(r.right, r.top + 20, +blk.closest('.ecol').dataset.ci, b);
  }
});
pEd.addEventListener('dragover', e => {
  const col = e.target.closest && e.target.closest('.ecol');
  if (!editorEstado.dragAct || !col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  eEdge(e.clientY);
  const bs = EG.cols[+col.dataset.ci].bs,
    s = eFree(bs, Math.max(0, eSnap(eMinAt(col, e.clientY) - 10)));
  ePrev(
    col,
    s,
    eFit(bs, s, eLen(editorEstado.dragAct)),
    color(editorEstado.dragAct),
    esc(editorEstado.dragAct.name)
  );
});
pEd.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('.ecol');
  if (!editorEstado.dragAct || !col) return;
  e.preventDefault();
  const bs = EG.cols[+col.dataset.ci].bs,
    s = eFree(bs, Math.max(0, eSnap(eMinAt(col, e.clientY) - 10)));
  bs.push({ id: editorEstado.dragAct.id, s, e: eFit(bs, s, eLen(editorEstado.dragAct)) });
  bs.sort((x, y) => x.s - y.s);
  editorEstado.dragAct = null;
  ePrevClear();
  changed();
});
