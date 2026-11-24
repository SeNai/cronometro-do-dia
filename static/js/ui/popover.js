/*
 * Menu flutuante genérico (um de cada vez), usado pela linha do tempo e pelo editor de planos.
 */

import { clearPreview } from '../funcionalidades/linha-do-tempo-arrastar.js';
import { renderTimeline } from '../funcionalidades/linha-do-tempo.js';
import { ui } from '../nucleo/estado.js';
import { $ } from '../nucleo/util.js';

/* ---------- menus do plano ---------- */
export function popOutside(e) {
  if (!e.target.closest('#pop')) closePop();
}
export let popOnClose = null;
// Fecha o menu aberto (se houver) e volta a desenhar a linha do tempo.
export function closePop() {
  const p = $('pop');
  if (!p) return;
  p.remove();
  document.removeEventListener('pointerdown', popOutside, true);
  const f = popOnClose;
  popOnClose = null;
  if (f) f();
  ui.tlLock = false;
  clearPreview();
  renderTimeline();
}
// Abre um menu flutuante perto de (x, y). onClose corre quando fecha; cls = classe extra (ex.: "wide").
export function openPop(x, y, html, onClose, cls) {
  closePop();
  ui.tlLock = true;
  popOnClose = onClose || null;
  const p = document.createElement('div');
  p.className = 'pop' + (cls ? ' ' + cls : '');
  p.id = 'pop';
  p.innerHTML = html;
  document.body.appendChild(p);
  const w = p.offsetWidth,
    h = p.offsetHeight;
  p.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 10)) + 'px';
  p.style.top = Math.max(8, Math.min(innerHeight - h - 8, y - 24)) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', popOutside, true));
  return p;
}
