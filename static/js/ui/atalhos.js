/*
 * Atalhos de teclado (1–9, Espaço, Esc) e voltar a desenhar quando a janela volta a ficar visível.
 */

import { start, stop } from '../funcionalidades/cronometro.js';
import { loadGoogle } from '../funcionalidades/google.js';
import { S } from '../nucleo/estado.js';
import { $ } from '../nucleo/util.js';
import { render } from './desenho.js';
import { closePop } from './popover.js';

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('pop')) {
      closePop();
      return;
    }
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    return;
  }
  if ($('pop')) {
    // no menu do plano, 1–9 escolhem a atividade
    if (/^[1-9]$/.test(e.key) && !e.target.matches('input')) {
      const b = $('pop').querySelectorAll('[data-a]')[+e.key - 1];
      if (b) {
        e.preventDefault();
        b.click();
      }
    }
    return;
  }
  if (
    e.target.matches('input,textarea') ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    document.querySelector('.modal.show')
  )
    return;
  if (/^[1-9]$/.test(e.key)) {
    const a = S.acts[+e.key - 1];
    if (a) {
      e.preventDefault();
      start(a.id);
    }
  } else if (e.key === ' ' && !e.target.matches('button')) {
    e.preventDefault();
    stop();
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    render();
    loadGoogle();
  }
});
