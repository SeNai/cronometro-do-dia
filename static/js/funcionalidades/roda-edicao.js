/*
 * Edição rápida no cartão do cronómetro: escrever o tempo nos números grandes e mudar o nome da atividade.
 */

import { curAct, setTarget, viewRun } from './cronometro.js';
import { renderDial } from './roda.js';
import { save } from '../nucleo/api.js';
import { $, pad, parseDur } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';
import { render } from '../ui/desenho.js';

// Máximo que se pode escrever: 12 horas.
export const MAXT = 12 * 60;
export const HINTS = {
  idle: 'escreve os números · Enter',
  run: 'quanto falta · Enter',
  bad: 'no máximo 12 horas'
};
export let editingBig = false,
  bigHint = HINTS.idle;
// campo com os dois pontos fixos: os números entram pela direita (6 → 3 → 4 = 06:34) e só se aceitam algarismos
export function openBigEdit() {
  if (editingBig || !curAct()) return;
  const big = $('cBig'),
    r = viewRun(),
    over = $('timerCard').classList.contains('over');
  editingBig = true;
  bigHint = r ? HINTS.run : HINTS.idle;
  const toDigits = min => {
    const t = Math.max(0, Math.round(min * 60));
    return t ? String(Math.floor(t / 60)) + pad(t % 60) : '';
  };
  const toMin = d => {
    const s = d.padStart(3, '0');
    return (+s.slice(0, -2) * 60 + +s.slice(-2)) / 60;
  }; // 00:90 conta como 1:30
  let d = over || big.textContent === '∞' ? '' : toDigits(parseDur(big.textContent) || 0),
    fresh = true;
  const inp = document.createElement('input');
  inp.className = 'bigedit';
  inp.autocomplete = 'off';
  inp.spellcheck = false;
  inp.inputMode = 'numeric';
  inp.setAttribute(
    'aria-label',
    r ? 'Tempo que falta, minutos e segundos' : 'Duração do bloco, minutos e segundos'
  );
  const show = () => {
    const s = d.padStart(4, '0');
    inp.value = s.slice(0, -2) + ':' + s.slice(-2);
    inp.style.width = inp.value.length + 0.9 + 'ch';
    inp.classList.toggle('fresh', fresh);
    const n = inp.value.length;
    inp.setSelectionRange(n, n);
  };
  const flash = () => {
    inp.classList.remove('bad');
    void inp.offsetWidth;
    inp.classList.add('bad');
  };
  big.hidden = true;
  big.after(inp);
  renderDial();
  show();
  inp.focus();
  show();
  let done = false;
  const close = () => {
    done = true;
    inp.remove();
    big.hidden = false;
    editingBig = false;
    bigHint = HINTS.idle;
    renderDial();
  };
  const apply = () => {
    if (!d && fresh) {
      close();
      return;
    }
    const v = toMin(d);
    if (v > MAXT) {
      flash();
      bigHint = HINTS.bad;
      renderDial();
      return;
    }
    const rr = viewRun();
    // com o cronómetro a correr, o que escreves é o tempo que falta
    const m = rr && v > 0 ? (Date.now() - rr.start) / 60000 + v : v;
    close();
    setTarget(Math.round(m * 60) / 60, MAXT + (rr ? (Date.now() - rr.start) / 60000 : 0));
    save();
  };
  inp.onkeydown = e => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || e.altKey) return; // deixa Ctrl+V, Ctrl+C…
    if (e.key === 'Tab') return; // sai do campo (e aplica)
    e.preventDefault();
    if (/^[0-9]$/.test(e.key)) {
      if (fresh) {
        d = '';
        fresh = false;
      }
      if (d.length >= 5) {
        flash();
        return;
      }
      d = (d + e.key).replace(/^0+/, '');
    } else if (e.key === 'Backspace') {
      d = fresh ? '' : d.slice(0, -1);
      fresh = false;
    } else if (e.key === 'Delete') {
      d = '';
      fresh = false;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const step = e.shiftKey ? 1 / 60 : 1;
      d = toDigits(Math.min(MAXT, Math.max(0, toMin(d) + (e.key === 'ArrowUp' ? step : -step))));
      fresh = false;
    } else if (e.key === 'Enter') {
      apply();
      return;
    } else if (e.key === 'Escape') {
      close();
      return;
    } else {
      if (e.key.length === 1) flash();
      return;
    } // letras, espaços, ":" e outros símbolos não entram
    bigHint = r ? HINTS.run : HINTS.idle;
    show();
  };
  inp.onpaste = e => {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text');
    const v = parseDur(t);
    if (v != null && v <= MAXT) {
      d = toDigits(v);
      fresh = false;
      show();
    } else flash();
  };
  inp.oninput = () => {
    d = inp.value.replace(/\D/g, '').replace(/^0+/, '').slice(-5);
    fresh = false;
    show();
  }; // teclados de ecrã
  inp.onpointerup = () => show();
  inp.onblur = () => {
    if (!done) apply();
  };
}
$('cBig').onclick = openBigEdit;
$('cBig').onkeydown = e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    openBigEdit();
  }
};

/* ---------- mudar o nome da atividade (clicar no nome por baixo da roda) ---------- */
export let editingName = false;
// Troca o nome por baixo da roda por uma caixa de texto (Enter grava, Esc cancela).
export function openNameEdit() {
  const a = curAct();
  if (!a || editingName) return;
  editingName = true;
  const sp = $('nowName'),
    inp = document.createElement('input');
  inp.className = 'nameedit';
  inp.value = a.name;
  inp.maxLength = 40;
  inp.spellcheck = false;
  inp.setAttribute('aria-label', 'Nome da atividade');
  sp.hidden = true;
  sp.after(inp);
  inp.focus();
  inp.select();
  let done = false;
  const close = ok => {
    if (done) return;
    done = true;
    const n = inp.value.replace(/\s+/g, ' ').trim();
    inp.remove();
    sp.hidden = false;
    editingName = false;
    if (ok && n && n !== a.name) {
      a.name = n;
      save();
      render();
      toast(`Nome mudado para «${n}».`);
    } else renderDial();
  };
  inp.onkeydown = e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(false);
    }
  };
  inp.onblur = () => close(true);
}
$('nowName').onclick = openNameEdit;
$('nowName').onkeydown = e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    openNameEdit();
  }
};
