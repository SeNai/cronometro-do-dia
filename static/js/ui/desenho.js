/*
 * Redesenhar a interface: render() redesenha tudo; tick() corre a cada segundo.
 */

import { checkAlerts } from '../funcionalidades/alertas.js';
import { renderActs, tickTiles } from '../funcionalidades/atividades.js';
import { renderAgenda } from '../funcionalidades/calendario.js';
import { renderPlanos } from '../funcionalidades/editor-planos.js';
import { renderTimeline } from '../funcionalidades/linha-do-tempo.js';
import { ensureWeekly } from '../funcionalidades/planos.js';
import { renderLog, renderSummary, renderWeek } from '../funcionalidades/resumo.js';
import { dragging, renderDial, renderNexts } from '../funcionalidades/roda.js';
import { todayStr } from '../nucleo/util.js';

export let lastSlow = 0;
// Corre a cada segundo: roda, cartões e avisos; a cada 30 s redesenha o resto.
export function tick() {
  const now = Date.now();
  if (!dragging) renderDial();
  tickTiles();
  checkAlerts();
  if (now - lastSlow > 30000) {
    lastSlow = now;
    ensureWeekly(todayStr());
    renderTimeline();
    renderAgenda();
    renderSummary();
    renderWeek();
    renderNexts();
  }
}
// Redesenha toda a interface.
export function render() {
  renderActs();
  renderAgenda();
  renderTimeline();
  renderSummary();
  renderLog();
  renderWeek();
  renderNexts();
  renderPlanos();
  lastSlow = Date.now();
  tick();
}
