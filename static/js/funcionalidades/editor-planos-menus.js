/*
 * Menus do editor de planos: atividade de um bloco novo, opções de um bloco e o menu ⋯ de cada dia da semana.
 */

import { eFit, eLen, ePrev, ePrevClear, hm } from './editor-planos-grelha.js';
import { EG, changed, editObj, renderPlanos } from './editor-planos.js';
import { DIAS, dotsOf, modById, modSum, nB, nextId, sumB } from './planos.js';
import { save } from '../nucleo/api.js';
import { actById, color } from '../nucleo/dados.js';
import { S } from '../nucleo/estado.js';
import { $, MIN, esc, pad, short } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';
import { closePop, openPop } from '../ui/popover.js';

// escolher a atividade de um bloco novo
export function openEPick(x, y, bs, s, e, col) {
  ePrev(col, s, e || eFit(bs, s, 30), null, 'Novo bloco');
  const p = openPop(
    x,
    y,
    `<div class="ph">Novo bloco ${e ? `<b>${hm(s)}–${hm(e)}</b>` : `às <b>${hm(s)}</b>`}<br>Que atividade?</div>${S.acts.map((a, i) => `<button class="pa" data-a="${a.id}" style="--c:${color(a)}"><span class="dot"></span><span class="nm">${esc(a.name)}</span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('')}`,
    () => {
      ePrevClear();
    }
  );
  p.querySelectorAll('[data-a]').forEach(b => {
    const a = actById(+b.dataset.a),
      end = () => e || eFit(bs, s, eLen(a));
    b.onmouseenter = b.onfocus = () => ePrev(col, s, end(), color(a), esc(a.name));
    b.onclick = () => {
      const en = end();
      closePop();
      bs.push({ id: a.id, s, e: en });
      bs.sort((x, y) => x.s - y.s);
      changed();
    };
  });
  const f = p.querySelector('[data-a]');
  if (f) f.focus();
}
export function openEBlock(x, y, ci, b) {
  const bs = EG.cols[ci].bs,
    a = actById(b.id),
    len = b.e - b.s,
    durs = [15, 30, 45, 60, 90, 120];
  const p = openPop(
    x,
    y,
    `<div class="ph"><b>${esc(a ? a.name : '?')}</b> · ${hm(b.s)}–${hm(b.e)}</div>
    <div class="sec top"><span class="lbl">Duração</span>${durs.map(m => `<button class="btn sm dur${m === len ? ' cur' : ''}" data-m="${m}">${m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? pad(m % 60) : '')}</button>`).join('')}</div>
    <div class="sec"><span class="lbl">Trocar de atividade</span></div>${S.acts.map((x, i) => `<button class="pa${x.id === b.id ? ' cur' : ''}" data-a="${x.id}" style="--c:${color(x)}"><span class="dot"></span><span class="nm">${esc(x.name)}</span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('')}
    <div class="sec"><button class="btn sm ghost" data-dup>⧉ Duplicar a seguir</button><span style="flex:1"></span><button class="btn sm ghost del" data-del>🗑 Apagar</button></div>`
  );
  p.querySelectorAll('[data-m]').forEach(
    x =>
      (x.onclick = () => {
        b.e = eFit(bs, b.s, +x.dataset.m, b);
        closePop();
        changed();
      })
  );
  p.querySelectorAll('[data-a]').forEach(
    x =>
      (x.onclick = () => {
        b.id = +x.dataset.a;
        closePop();
        changed();
      })
  );
  p.querySelector('[data-dup]').onclick = () => {
    const s = Math.min(1435, b.e + 5);
    bs.push({ id: b.id, s, e: eFit(bs, s, len) });
    bs.sort((x, y) => x.s - y.s);
    closePop();
    changed();
  };
  p.querySelector('[data-del]').onclick = () => {
    bs.splice(bs.indexOf(b), 1);
    closePop();
    changed();
  };
}
// menu ⋯ de cada dia da semana
export function openColMenu(btn, col) {
  const w = editObj(),
    mods = S.modelos || [],
    r = btn.getBoundingClientRect(),
    d = +col.key;
  const copyTo = ds => {
    ds.forEach(k => {
      if (String(k) !== col.key) w.dias[k] = col.bs.map(b => ({ ...b }));
    });
    closePop();
    changed();
    toast(`${DIAS[d]} copiado.`);
  };
  const p = openPop(
    r.left - 120,
    r.bottom + 28,
    `<div class="ph"><b>${DIAS[d]}</b> · ${col.bs.length ? nB(col.bs.length) + ' · ' + short(sumB(col.bs) * MIN) : 'vazio'}</div>
    ${mods.length ? `<div class="sec top"><span class="lbl">Usar um plano do dia</span></div>${mods.map(m => `<button class="pa" data-use="${m.id}"><span class="mdots">${dotsOf(m.blocos)}</span><span class="nm">${esc(m.nome)}</span><small>${modSum(m)}</small></button>`).join('')}` : ''}
    <div class="sec"><span class="lbl">Copiar ${DIAS[d].split('-')[0].toLowerCase()} para…</span>
      <button class="btn sm" data-cp="1,2,3,4,5"${col.bs.length ? '' : ' disabled'}>Dias úteis</button><button class="btn sm" data-cp="0,1,2,3,4,5,6"${col.bs.length ? '' : ' disabled'}>Todos</button><button class="btn sm" data-cp="0,6"${col.bs.length ? '' : ' disabled'}>Fim de semana</button></div>
    <div class="sec">${col.bs.length ? `<button class="btn sm ghost" data-save>💾 Guardar como plano do dia</button>` : ''}<span style="flex:1"></span><button class="btn sm ghost del" data-clr${col.bs.length ? '' : ' disabled'}>Limpar</button></div>`
  );
  p.querySelectorAll('[data-use]').forEach(
    b =>
      (b.onclick = () => {
        const m = modById(+b.dataset.use);
        w.dias[col.key] = m.blocos.map(x => ({ ...x }));
        closePop();
        changed();
      })
  );
  p.querySelectorAll('[data-cp]').forEach(b => (b.onclick = () => copyTo(b.dataset.cp.split(','))));
  const sv = p.querySelector('[data-save]');
  if (sv)
    sv.onclick = () => {
      closePop();
      S.modelos = S.modelos || [];
      const m = {
        id: nextId(S.modelos),
        nome: `${w.nome} · ${DIAS[d]}`,
        blocos: col.bs.map(b => ({ ...b }))
      };
      S.modelos.push(m);
      save();
      renderPlanos();
      toast(`Guardado como plano do dia «${m.nome}».`);
    };
  p.querySelector('[data-clr]').onclick = () => {
    const antes = col.bs.slice();
    w.dias[col.key] = [];
    closePop();
    changed();
    toast(
      `${DIAS[d]} limpo.`,
      '',
      'Desfazer',
      () => {
        w.dias[col.key] = antes;
        changed();
      },
      8000
    );
  };
}
