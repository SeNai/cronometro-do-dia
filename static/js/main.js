/*
 * Arranque da app: lê definições e dados do servidor, corrige dados antigos e liga os relógios (tick a cada segundo, calendários a cada 5 min, Google a cada minuto).
 * Também importa todos os módulos, para registarem os seus botões e eventos.
 */

import { refreshCalendars } from './funcionalidades/calendario.js';
import { renderMute } from './funcionalidades/definicoes.js';
import { loadGoogle } from './funcionalidades/google.js';
import { ensureWeekly, modById, nextId, semById } from './funcionalidades/planos.js';
import { api, save } from './nucleo/api.js';
import { CFG, S, ui } from './nucleo/estado.js';
import { $, addDays, dayLabel, todayStr, uid } from './nucleo/util.js';
import { toast, updNotifBtn } from './ui/avisos.js';
import { render, tick } from './ui/desenho.js';
import { setView } from './ui/navegacao.js';
import './funcionalidades/alertas.js';
import './funcionalidades/atividades.js';
import './funcionalidades/cronometro.js';
import './funcionalidades/editor-planos-grelha.js';
import './funcionalidades/editor-planos-menus.js';
import './funcionalidades/editor-planos.js';
import './funcionalidades/linha-do-tempo-arrastar.js';
import './funcionalidades/linha-do-tempo-menus.js';
import './funcionalidades/linha-do-tempo.js';
import './funcionalidades/plano.js';
import './funcionalidades/resumo.js';
import './funcionalidades/roda-edicao.js';
import './funcionalidades/roda.js';
import './nucleo/dados.js';
import './ui/atalhos.js';
import './ui/popover.js';
import './ui/sons.js';

/* ---------- arranque ---------- */
(async () => {
  try {
    const c = await api('/api/config');
    Object.assign(CFG, c);
  } catch (e) {}
  try {
    const d = await api('/api/dados');
    if (d && Array.isArray(d.acts)) {
      for (const k of Object.keys(S)) delete S[k];
      Object.assign(S, { log: [], run: null, plans: {}, next: 1, sel: null }, d);
    }
  } catch (e) {
    toast('Não consegui ler os dados. Abre a app pelo atalho (ver README).', 'warn');
  }
  S.next = Math.max(S.next || 1, ...S.acts.map(a => a.id + 1));
  let corrigido = false;
  S.log.forEach(l => {
    if (!l.uid) {
      l.uid = uid();
      corrigido = true;
    }
  });
  // planos: antes havia só um (S.plan); agora há um por dia (S.plans), e guardam-se os últimos 60 dias
  if (!S.plans || typeof S.plans !== 'object') S.plans = {};
  if (S.plan) {
    if (Array.isArray(S.plan.blocos) && S.plan.dia && !S.plans[S.plan.dia])
      S.plans[S.plan.dia] = S.plan.blocos;
    delete S.plan;
    corrigido = true;
  }
  const cut = addDays(todayStr(), -60);
  Object.keys(S.plans).forEach(k => {
    if (k < cut || !Array.isArray(S.plans[k])) {
      delete S.plans[k];
      corrigido = true;
      return;
    }
    S.plans[k].forEach(p => {
      if (!p.uid) {
        p.uid = uid();
        corrigido = true;
      }
    });
  });
  if (!Array.isArray(S.modelos)) S.modelos = [];
  if (!Array.isArray(S.semanas)) S.semanas = [];
  // versão anterior: S.semana = {diaDaSemana: idDoModelo} → passa a ser uma semana «Semana tipo», já ativa
  if (S.semana) {
    const dias = {};
    Object.entries(S.semana).forEach(([d, id]) => {
      const m = modById(id);
      if (m) dias[d] = m.blocos.map(b => ({ id: b.id, s: b.s, e: b.e }));
    });
    if (Object.keys(dias).length) {
      const w = { id: nextId(S.semanas), nome: 'Semana tipo', dias };
      S.semanas.push(w);
      if (!S.semanaAtiva) S.semanaAtiva = w.id;
    }
    delete S.semana;
    corrigido = true;
  }
  if (S.semanaAtiva && !semById(S.semanaAtiva)) S.semanaAtiva = null;
  if (corrigido) save();
  ensureWeekly(todayStr());
  if (S.run && S.run.target == null) S.run.target = 0;
  $('dayLbl').textContent = dayLabel(ui.viewDay);
  updNotifBtn();
  renderMute();
  let v0 = 'hoje';
  try {
    v0 = localStorage.getItem('vista') || 'hoje';
  } catch (e) {}
  render();
  setView(v0);
  refreshCalendars();
  loadGoogle();
  setInterval(tick, 1000);
  setInterval(() => refreshCalendars(false), 5 * 60000);
  setInterval(loadGoogle, 60000);
})();
