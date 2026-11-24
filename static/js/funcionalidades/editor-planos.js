/*
 * Separador Planos: listas de semanas e planos do dia, e o cabeçalho do editor (nome, ativar, duplicar, apagar).
 * O editor mostra uma grelha com uma coluna (plano do dia) ou sete (semana, Seg–Dom).
 */

import { eBlockHtml, ePrevClear } from './editor-planos-grelha.js';
import { openColMenu } from './editor-planos-menus.js';
import { canPlan, plansOf } from './plano.js';
import {
  DIAS,
  DIAS3,
  ORDEM,
  applyBlocks,
  dotsOf,
  modById,
  modSum,
  nB,
  nextId,
  semById,
  semSum,
  setActiveWeek,
  sumB
} from './planos.js';
import { save } from '../nucleo/api.js';
import { actById, color } from '../nucleo/dados.js';
import { S, ui } from '../nucleo/estado.js';
import { $, MIN, dayLabel, esc, pad, short } from '../nucleo/util.js';
import { ask, toast } from '../ui/avisos.js';
import { closePop, openPop } from '../ui/popover.js';

/* ---------- separador Planos: editor ---------- */
export const PXE = 0.9; // píxeis por minuto no editor
// O que está aberto no editor: {kind: "dia"|"semana", id}. EG: dados da grelha desenhada.
export let PE = null,
  EG = null;
// estado partilhado com a grelha: o bloco que está a ser arrastado e a atividade que vem da paleta
export const editorEstado = { drag: null, dragAct: null };
try {
  PE = JSON.parse(localStorage.getItem('planoAberto'));
} catch (e) {}
// O plano do dia ou a semana aberta no editor.
export function editObj() {
  return PE ? (PE.kind === 'semana' ? semById(PE.id) : modById(PE.id)) : null;
}
// Abre um plano do dia ou uma semana no editor (e lembra-o para a próxima vez).
export function openEditor(kind, id) {
  PE = { kind, id };
  try {
    localStorage.setItem('planoAberto', JSON.stringify(PE));
  } catch (e) {}
  renderPlanos();
}
// Depois de qualquer alteração no editor: grava e redesenha.
export function changed() {
  save();
  renderPlanos();
}
// Cria um plano do dia novo e abre-o, com o nome pronto a escrever.
export function newDayPlan(blocos, nome) {
  S.modelos = S.modelos || [];
  const m = { id: nextId(S.modelos), nome: nome || `Plano ${S.modelos.length + 1}`, blocos: blocos || [] };
  S.modelos.push(m);
  save();
  openEditor('dia', m.id);
  setTimeout(() => {
    const n = $('pName');
    if (n) {
      n.focus();
      n.select();
    }
  });
}
// Cria uma semana nova e abre-a, com o nome pronto a escrever.
export function newWeek() {
  S.semanas = S.semanas || [];
  const w = {
    id: nextId(S.semanas),
    nome: S.semanas.length ? `Semana ${S.semanas.length + 1}` : 'Semana tipo',
    dias: {}
  };
  S.semanas.push(w);
  save();
  openEditor('semana', w.id);
  setTimeout(() => {
    const n = $('pName');
    if (n) {
      n.focus();
      n.select();
    }
  });
}

// Desenha o separador Planos: listas da esquerda e o editor.
export function renderPlanos() {
  if ($('v-planos').hidden || editorEstado.drag) return;
  const mods = S.modelos || [],
    sems = S.semanas || [];
  if (PE && !editObj()) PE = null;
  if (!PE && (sems.length || mods.length))
    PE = sems.length ? { kind: 'semana', id: sems[0].id } : { kind: 'dia', id: mods[0].id };
  const on = (k, id) => (PE && PE.kind === k && PE.id === id ? ' on' : '');
  $('wkList').innerHTML =
    sems
      .map(
        w =>
          `<button class="pitem${on('semana', w.id)}" data-k="semana" data-id="${w.id}"><span class="nm">${esc(w.nome)}</span>${S.semanaAtiva === w.id ? '<span class="badge">ativa</span>' : ''}<small>${semSum(w)}</small></button>`
      )
      .join('') || '<p class="small muted pnone">Um programa para cada dia da semana.</p>';
  $('dpList').innerHTML =
    mods
      .map(
        m =>
          `<button class="pitem${on('dia', m.id)}" data-k="dia" data-id="${m.id}"><span class="mdots">${dotsOf(m.blocos)}</span><span class="nm">${esc(m.nome)}</span><small>${modSum(m)}</small></button>`
      )
      .join('') || '<p class="small muted pnone">Um plano para um dia, para aplicares quando quiseres.</p>';
  document
    .querySelectorAll('#v-planos .pitem')
    .forEach(b => (b.onclick = () => openEditor(b.dataset.k, +b.dataset.id)));
  renderEditor();
}

// Editor: cabeçalho, paleta de atividades e a grelha (1 coluna ou 7).
export function renderEditor() {
  const box = $('pEditor'),
    o = editObj();
  if (!o) {
    box.innerHTML = `<div class="pempty"><h2>Planos</h2>
      <p>Aqui preparas o teu tempo com antecedência, sem mexer no dia de hoje:</p>
      <ul><li><b>Semana</b>: um programa para cada dia, de segunda a domingo. Quando a ativas, cada dia sem plano recebe o programa desse dia.</li>
      <li><b>Plano do dia</b>: um dia-modelo, por exemplo «Dia de estudo», que aplicas a qualquer dia.</li></ul>
      <p>Depois, na linha do tempo do <b>Hoje</b>, usa o botão <b>📋 Planos</b> para aplicar um plano ou escolher a semana ativa.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="e1">+ Nova semana</button><button class="btn" id="e2">+ Novo plano do dia</button></div></div>`;
    $('e1').onclick = newWeek;
    $('e2').onclick = () => newDayPlan();
    return;
  }
  const isW = PE.kind === 'semana';
  if (isW) o.dias = o.dias || {};
  const cols = isW
    ? ORDEM.map(d => ({ key: String(d), label: DIAS3[d], title: DIAS[d], bs: (o.dias[d] = o.dias[d] || []) }))
    : [{ key: 'd', bs: o.blocos }];
  // horas visíveis: das 6h (ou antes, se houver blocos antes) até à meia-noite
  let h0 = 6;
  cols.forEach(c =>
    c.bs.forEach(b => {
      h0 = Math.min(h0, Math.floor(b.s / 60));
    })
  );
  EG = { h0, cols, isW };
  const H = (24 - h0) * 60 * PXE,
    tpl = `grid-template-columns:46px repeat(${cols.length},minmax(0,1fr))`;
  const act = isW && S.semanaAtiva === o.id;
  box.innerHTML = `<div class="phead">
      <span class="kind">${isW ? 'Semana' : 'Plano do dia'}</span>
      <input class="inp pname" id="pName" maxlength="40" aria-label="Nome" value="${esc(o.nome)}">
      ${
        isW
          ? `<button class="btn sm ${act ? '' : 'primary'}" id="pAct">${act ? '✓ Ativa · desativar' : 'Ativar esta semana'}</button>`
          : `<button class="btn sm primary" id="pApply" title="Aplica este plano ao dia que está escolhido no topo">Aplicar a ${esc(dayLabel(ui.viewDay).split(',')[0].toLowerCase())}</button>`
      }
      <button class="btn sm ghost" id="pDup">⧉ Duplicar</button><button class="btn sm ghost del" id="pDel">🗑 Apagar</button></div>
    <div class="palette"><span class="lbl">Arrasta para a grelha:</span>${S.acts.map(a => `<span class="pchip" draggable="true" data-act="${a.id}" style="--c:${color(a)}" title="Arrasta para um dia"><span class="dot"></span>${esc(a.name)}</span>`).join('')}
      <span class="hint">ou clica (e arrasta) num espaço vazio da grelha</span></div>
    ${isW ? `<div class="egrid wkhead" style="${tpl}"><span></span>${cols.map(c => `<div class="ehd" title="${c.title}"><b>${c.label}</b><small>${c.bs.length ? short(sumB(c.bs) * MIN) : '—'}</small><button class="x" data-cmenu="${c.key}" title="Opções de ${c.title.toLowerCase()}">⋯</button></div>`).join('')}</div>` : ''}
    <div class="escroll"><div class="egrid ebody" style="${tpl};height:${H}px">
      <div class="ehours">${Array.from({ length: 24 - h0 + 1 }, (_, i) => `<span style="top:${i * 60 * PXE}px">${pad((h0 + i) % 24)}:00</span>`).join('')}</div>
      ${cols.map((c, ci) => `<div class="ecol" data-ci="${ci}" style="background-size:100% ${60 * PXE}px">${c.bs.map((b, bi) => eBlockHtml(b, bi)).join('')}</div>`).join('')}
    </div></div>
    <p class="small muted" style="margin:10px 0 0">${isW ? 'Arrasta um bloco para outro dia para o mudar de dia. O ⋯ de cada dia tem opções para copiar ou usar um plano do dia.' : 'Arrasta para mover · puxa a base para mudar a duração · clica num bloco para opções.'}</p>`;
  const sc = box.querySelector('.escroll');
  if (PE._scroll == null) PE._scroll = Math.max(0, (8 - h0) * 60 * PXE);
  sc.scrollTop = PE._scroll;
  sc.onscroll = () => {
    PE._scroll = sc.scrollTop;
  };
  // cabeçalho
  $('pName').onchange = () => {
    const n = $('pName').value.replace(/\s+/g, ' ').trim();
    if (n) {
      o.nome = n;
      changed();
    } else $('pName').value = o.nome;
  };
  $('pName').onkeydown = e => {
    e.stopPropagation();
    if (e.key === 'Enter') $('pName').blur();
  };
  if (isW) $('pAct').onclick = () => setActiveWeek(act ? 0 : o.id);
  else
    $('pApply').onclick = () => {
      const ds = ui.viewDay;
      if (!canPlan(ds)) {
        toast('O dia escolhido no topo já passou. Muda para hoje ou para um dia à frente.');
        return;
      }
      if (!o.blocos.length) {
        toast('Este plano ainda não tem blocos.');
        return;
      }
      if (!plansOf(ds).length) {
        applyBlocks(ds, o.blocos, o.nome, 'substituir');
        return;
      }
      const r = $('pApply').getBoundingClientRect();
      const p = openPop(
        r.left,
        r.bottom + 28,
        `<div class="ph">${esc(dayLabel(ds))} já tem ${nB(plansOf(ds).length)}.</div>
      <div class="sec top"><button class="btn sm primary" data-r>Substituir</button><button class="btn sm" data-j>Juntar</button></div>`
      );
      p.querySelector('[data-r]').onclick = () => {
        closePop();
        applyBlocks(ds, o.blocos, o.nome, 'substituir');
      };
      p.querySelector('[data-j]').onclick = () => {
        closePop();
        applyBlocks(ds, o.blocos, o.nome, 'juntar');
      };
    };
  $('pDup').onclick = () => {
    const c = JSON.parse(JSON.stringify(o));
    c.nome = o.nome + ' (cópia)';
    if (isW) {
      c.id = nextId(S.semanas);
      S.semanas.push(c);
    } else {
      c.id = nextId(S.modelos);
      S.modelos.push(c);
    }
    save();
    openEditor(PE.kind, c.id);
  };
  $('pDel').onclick = () =>
    ask(
      `Apagar ${isW ? 'a semana' : 'o plano'} «${o.nome}»? Os planos que já aplicaste aos dias ficam como estão.`,
      () => {
        const antes = {
          modelos: (S.modelos || []).slice(),
          semanas: (S.semanas || []).slice(),
          ativa: S.semanaAtiva
        };
        if (isW) {
          S.semanas = S.semanas.filter(x => x !== o);
          if (S.semanaAtiva === o.id) S.semanaAtiva = null;
        } else S.modelos = S.modelos.filter(x => x !== o);
        PE = null;
        changed();
        toast(
          `«${o.nome}» apagado.`,
          '',
          'Desfazer',
          () => {
            S.modelos = antes.modelos;
            S.semanas = antes.semanas;
            S.semanaAtiva = antes.ativa;
            changed();
          },
          8000
        );
      }
    );
  box.querySelectorAll('[data-cmenu]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        openColMenu(
          b,
          cols.find(c => c.key === b.dataset.cmenu)
        );
      })
  );
  box.querySelectorAll('.palette [data-act]').forEach(ch => {
    ch.ondragstart = e => {
      editorEstado.dragAct = actById(+ch.dataset.act);
      e.dataTransfer.setData('text/plain', editorEstado.dragAct.name);
      e.dataTransfer.effectAllowed = 'copy';
      box.classList.add('dropping');
    };
    ch.ondragend = () => {
      editorEstado.dragAct = null;
      box.classList.remove('dropping');
      ePrevClear();
    };
  });
}

$('newWeekBtn').onclick = newWeek;
$('newDayBtn').onclick = () => newDayPlan();
