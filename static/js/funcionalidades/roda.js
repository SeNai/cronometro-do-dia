/*
 * Roda do cronómetro (radial slider): desenho, arrastar para escolher a duração e a lista «a seguir».
 */

import { curAct, curTarget, setTarget, viewRun } from './cronometro.js';
import { plansOf } from './plano.js';
import { bigHint, editingBig } from './roda-edicao.js';
import { save } from '../nucleo/api.js';
import { actById, busy, color, eventsOf, totalDay } from '../nucleo/dados.js';
import { S } from '../nucleo/estado.js';
import { $, SCALE, STEP, clock, esc, fmtDur, fmtMS, hhmm, short, todayStr } from '../nucleo/util.js';

/* ---------- roda ---------- */
export const dial = $('dial'),
  knob = $('knob'),
  R = 104;
(function drawTicks() {
  let h = '';
  for (let m = 0; m < SCALE; m += STEP) {
    const maj = m % 30 === 0,
      ang = (m / SCALE) * 2 * Math.PI,
      r1 = 124,
      r2 = maj ? 132 : 129;
    const p = r => [150 + r * Math.sin(ang), 150 - r * Math.cos(ang)];
    const [x1, y1] = p(r1),
      [x2, y2] = p(r2);
    h += `<line class="tick${maj ? ' maj' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    if (maj && m) {
      const [lx, ly] = p(143);
      h += `<text class="tlbl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${m}</text>`;
    }
  }
  $('ticks').innerHTML = h;
})();
// Preenche uma fração (0–1) de um arco da roda.
export const setArc = (el, f) => {
  f = Math.max(0, Math.min(1, f));
  el.setAttribute('stroke-dasharray', `${(f * 100).toFixed(3)} 100`);
  el.style.opacity = f > 0.001 ? 1 : 0;
};

// Atualiza a roda, os números grandes, o botão Começar/Parar, a meta do dia e o título da janela.
export function renderDial() {
  const now = Date.now(),
    r = viewRun(),
    a = curAct(),
    c = color(a),
    card = $('timerCard');
  card.style.setProperty('--c', c);
  const target = curTarget(),
    tf = target / SCALE;
  let lbl,
    big,
    sub,
    over = false;
  if (r) {
    const el = now - r.start;
    if (target) {
      over = el >= target * 60000;
      setArc($('arcT'), tf);
      setArc($('arcE'), over ? tf : el / 60000 / SCALE);
      if (over) {
        lbl = 'Tempo extra';
        big = '+' + clock(el - target * 60000);
        sub = `de ${fmtDur(target)} · total ${clock(el)}`;
      } else {
        lbl = 'Faltam';
        big = clock(target * 60000 - el);
        sub = `${clock(el)} de ${fmtDur(target)}`;
      }
    } else {
      setArc($('arcT'), 0);
      setArc($('arcE'), (el % (SCALE * 60000)) / (SCALE * 60000));
      lbl = 'A decorrer';
      big = clock(el);
      sub = 'sem limite de tempo';
    }
  } else {
    setArc($('arcT'), tf);
    setArc($('arcE'), 0);
    lbl = 'Duração';
    big = target ? fmtMS(target) : '∞';
    sub = target ? 'arrasta ou clica no tempo' : 'sem limite de tempo';
  }
  const ang = Math.min(tf, 1) * 2 * Math.PI;
  knob.setAttribute('cx', (150 + R * Math.sin(ang)).toFixed(2));
  knob.setAttribute('cy', (150 - R * Math.cos(ang)).toFixed(2));
  knob.setAttribute('aria-valuenow', Math.round(target));
  knob.setAttribute('aria-valuetext', target ? fmtDur(target) : 'sem limite');
  card.classList.toggle('running', !!r);
  card.classList.toggle('over', over);
  if (editingBig) {
    lbl = r ? 'Faltam' : 'Duração';
    sub = bigHint;
  }
  $('cLbl').textContent = lbl;
  $('cBig').textContent = big;
  $('cSub').textContent = sub;
  $('nowName').textContent = a ? a.name : 'Cria uma atividade';
  $('nowDot').style.background = c;
  $('mainBtn').innerHTML = r ? '■ Parar' : '▶ Começar';
  $('mainBtn').classList.toggle('primary', !r);
  $('mainBtn').classList.toggle('stop', !!r);
  // outra atividade a correr enquanto vês esta
  const o = S.run && !r ? S.run : null,
    ob = $('otherRun');
  ob.hidden = !o;
  if (o) {
    const oa = actById(o.id),
      oel = now - o.start;
    ob.style.setProperty('--rc', color(oa));
    ob.innerHTML = `<span class="dot"></span>A correr: <b>${esc(oa ? oa.name : '?')}</b> <span class="num">${clock(oel)}</span>`;
    ob.title = 'Clica para voltar a esta atividade';
  }
  if (S.run) {
    const ra = actById(S.run.id),
      rel = now - S.run.start,
      rt = (S.run.target || 0) * 60000;
    document.title = `${rt ? (rel >= rt ? '+' + clock(rel - rt) : clock(rt - rel)) : clock(rel)} · ${ra ? ra.name : ''}`;
  } else document.title = 'Cronómetro do Dia';
  // meta do dia
  if (a && a.goal) {
    const tot = totalDay(a.id, todayStr()),
      g = a.goal * 60000,
      p = tot / g;
    $('goalLine').hidden = false;
    $('goalBar').firstChild.style.width = Math.min(100, p * 100) + '%';
    $('goalBar').classList.toggle('done', p >= 1);
    $('goalTxt').textContent =
      p >= 1
        ? `Meta de hoje cumprida ✓ (${short(tot)})`
        : `Hoje: ${short(tot)} de ${a.goal} min · faltam ${short(g - tot)}`;
  } else if (a) {
    $('goalLine').hidden = false;
    $('goalBar').firstChild.style.width = '0';
    $('goalTxt').textContent = 'Hoje: ' + short(totalDay(a.id, todayStr())) + ' · sem meta';
  } else $('goalLine').hidden = true;
}

export let dragging = false,
  lastM = 0;
// Minutos (de 5 em 5) e distância ao centro para a posição do rato na roda.
export function pointMinutes(e) {
  const rc = dial.getBoundingClientRect(),
    x = ((e.clientX - rc.left) / rc.width) * 300 - 150,
    y = ((e.clientY - rc.top) / rc.height) * 300 - 150;
  let ang = Math.atan2(x, -y);
  if (ang < 0) ang += 2 * Math.PI;
  return { m: Math.round(((ang / (2 * Math.PI)) * SCALE) / STEP) * STEP, d: Math.hypot(x, y) };
}
export function unwrap(m) {
  // não deixa saltar de 120 para 0 (ou ao contrário) ao passar pelo topo
  if (lastM >= SCALE - 30 && m <= 30) m = SCALE;
  else if (lastM <= 30 && m >= SCALE - 30) m = 0;
  return (lastM = m);
}
dial.addEventListener('pointerdown', e => {
  const { m, d } = pointMinutes(e);
  if (d < 80 || d > 160 || !curAct()) return;
  dragging = true;
  lastM = curTarget();
  dial.setPointerCapture(e.pointerId);
  $('timerCard').classList.add('dragging');
  setTarget(unwrap(m));
  e.preventDefault();
});
dial.addEventListener('pointermove', e => {
  if (dragging) setTarget(unwrap(pointMinutes(e).m));
});
export const endDrag = () => {
  if (!dragging) return;
  dragging = false;
  $('timerCard').classList.remove('dragging');
  save();
};
dial.addEventListener('pointerup', endDrag);
dial.addEventListener('pointercancel', endDrag);
knob.addEventListener('keydown', e => {
  const k = {
    ArrowUp: STEP,
    ArrowRight: STEP,
    ArrowDown: -STEP,
    ArrowLeft: -STEP,
    PageUp: 15,
    PageDown: -15
  }[e.key];
  if (k) {
    e.preventDefault();
    e.stopPropagation();
    setTarget(curTarget() + k);
    save();
  }
});

// Linhas por baixo da roda: próximo compromisso e próximo bloco do plano.
export function renderNexts() {
  const now = Date.now(),
    nx = eventsOf(todayStr()).filter(e => busy(e) && e.inicio > now)[0];
  const np = plansOf(todayStr()).find(p => p.start > now && actById(p.id));
  $('nexts').innerHTML = [
    nx ? `📅 ${esc(nx.titulo)} às ${hhmm(nx.inicio)} <span>(daqui a ${short(nx.inicio - now)})</span>` : '',
    np && actById(np.id) ? `✨ A seguir no plano: ${esc(actById(np.id).name)} às ${hhmm(np.start)}` : ''
  ]
    .filter(Boolean)
    .map(s => `<div>${s}</div>`)
    .join('');
}
