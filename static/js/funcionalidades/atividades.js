/*
 * Cartões das atividades: escolher (clique), começar (duplo clique), arrastar para o plano e o modo de edição.
 */

import { curAct, select, start, stop } from './cronometro.js';
import { clearPreview, tdrag, tlEl } from './linha-do-tempo-arrastar.js';
import { renderTimeline } from './linha-do-tempo.js';
import { canPlan } from './plano.js';
import { renderDial } from './roda.js';
import { save } from '../nucleo/api.js';
import { actById, color, totalDay } from '../nucleo/dados.js';
import { S, ui } from '../nucleo/estado.js';
import { $, short, todayStr } from '../nucleo/util.js';
import { ask, toast } from '../ui/avisos.js';
import { render } from '../ui/desenho.js';
import { closePop } from '../ui/popover.js';

// modo de edição dos cartões (nome, cor, meta)
export let editing = false;
// Desenha os cartões das atividades (normal ou modo de edição).
export function renderActs() {
  const box = $('acts');
  box.innerHTML = editing
    ? '<div class="ehead"><span></span><span>Atividade</span><span>Meta diária</span><span></span></div>'
    : '';
  box.classList.toggle('editing', editing);
  $('editBtn').textContent = editing ? '✓ Concluído' : '✎ Editar';
  $('addRow').hidden = !editing;
  S.acts.forEach((a, i) => {
    const on = S.run && S.run.id === a.id;
    const d = document.createElement(editing ? 'div' : 'button');
    d.className =
      'tile' + (on ? ' on' : '') + (editing ? ' edit' : '') + (!editing && curAct() === a ? ' sel' : '');
    d.style.setProperty('--c', color(a));
    d.dataset.id = a.id;
    if (editing) {
      d.innerHTML = `<input type="color" title="Cor"><input class="nmi" aria-label="Nome">
        <div class="stepper" title="Meta diária (carrega e mantém, ou usa a roda do rato)"><button type="button" data-d="-5" title="Menos 5 min">−</button><label class="val"><input type="number" min="0" step="5" inputmode="numeric" placeholder="0" aria-label="Meta diária em minutos">min</label><button type="button" data-d="5" title="Mais 5 min">+</button></div>
        <button class="x" title="Remover">✕</button>`;
      const [col, nm, gl] = d.querySelectorAll('input');
      col.value = color(a);
      col.oninput = () => {
        a.color = col.value;
        d.style.setProperty('--c', col.value);
        save();
        renderDial();
      };
      col.onchange = () => render();
      nm.value = a.name;
      nm.onchange = () => {
        a.name = nm.value.trim() || a.name;
        save();
        renderDial();
      };
      nm.onkeydown = e => {
        if (e.key === 'Enter') nm.blur();
      };
      gl.value = a.goal || 0;
      gl.onchange = () => {
        a.goal = Math.max(0, Math.round(+gl.value || 0));
        gl.value = a.goal;
        save();
        renderDial();
      };
      gl.onfocus = () => gl.select();
      const bump = n => {
        a.goal = Math.min(600, Math.max(0, Math.round(((a.goal || 0) + n) / 5) * 5));
        gl.value = a.goal;
        save();
        renderDial();
      };
      d.querySelectorAll('[data-d]').forEach(b => {
        // carregar e manter: repete cada vez mais depressa
        let t;
        const n = +b.dataset.d,
          end = () => clearTimeout(t);
        b.onpointerdown = e => {
          e.preventDefault();
          bump(n);
          let wait = 400;
          const rep = () => {
            bump(n);
            wait = Math.max(60, wait * 0.8);
            t = setTimeout(rep, wait);
          };
          t = setTimeout(rep, wait);
        };
        b.onpointerup = b.onpointerleave = b.onpointercancel = end;
        b.onkeydown = e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            bump(n);
          }
        };
      });
      d.querySelector('.stepper').addEventListener(
        'wheel',
        e => {
          e.preventDefault();
          bump(e.deltaY < 0 ? 5 : -5);
        },
        { passive: false }
      );
      d.querySelector('.x').onclick = () =>
        ask(`Remover "${a.name}"? Os blocos já registados ficam como "(removida)".`, () => {
          if (S.run && S.run.id === a.id) stop();
          S.acts = S.acts.filter(x => x !== a);
          save();
          render();
        });
    } else {
      d.innerHTML = `<div class="top"><span class="dot"></span><span class="nm"></span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</div>
        <div class="tm num" data-t="${a.id}"></div><div class="tb"><i data-tb="${a.id}"></i></div>`;
      d.querySelector('.nm').textContent = a.name;
      d.title =
        (on ? 'A correr · duplo clique para parar' : 'Clica para escolher · duplo clique para começar') +
        '\nArrasta para a coluna Plano da linha do tempo para planear';
      d.onclick = () => select(a.id);
      d.ondblclick = e => {
        e.preventDefault();
        start(a.id);
      };
      d.draggable = true;
      d.ondragstart = ev => {
        if (!canPlan(ui.viewDay)) {
          ev.preventDefault();
          toast('Esse dia já passou. Escolhe hoje ou um dia à frente para planear.');
          return;
        }
        ev.dataTransfer.setData('text/plain', a.name);
        ev.dataTransfer.effectAllowed = 'copy';
        closePop();
        ui.dragAct = a;
        ui.tlLock = true;
        tlEl.classList.add('dropping');
      };
      d.ondragend = () => {
        ui.dragAct = null;
        tlEl.classList.remove('dropping');
        clearPreview();
        if (!$('pop') && !tdrag) {
          ui.tlLock = false;
          renderTimeline();
        }
      };
    }
    box.appendChild(d);
  });
}
// Atualiza só os tempos e as barras dos cartões (corre a cada segundo).
export function tickTiles() {
  const ds = todayStr();
  document.querySelectorAll('[data-t]').forEach(e => {
    const a = actById(+e.dataset.t);
    if (!a) return;
    const t = totalDay(a.id, ds);
    e.textContent = short(t) + (a.goal ? ` / ${a.goal} min` : ' hoje');
  });
  document.querySelectorAll('[data-tb]').forEach(e => {
    const a = actById(+e.dataset.tb);
    if (!a) return;
    e.style.width = a.goal ? Math.min(100, totalDay(a.id, ds) / (a.goal * 600)) + '%' : '0';
  });
}

$('editBtn').onclick = () => {
  editing = !editing;
  renderActs();
  tickTiles();
};
$('addBtn').onclick = () => {
  const n = $('newName').value.trim();
  if (!n) return;
  S.acts.push({ id: S.next++, name: n, goal: 0 });
  $('newName').value = '';
  save();
  render();
};
$('newName').onkeydown = e => {
  if (e.key === 'Enter') $('addBtn').click();
};
