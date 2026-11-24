/*
 * Janela de Definições (calendários, comportamento, sons) e o botão rápido de silenciar.
 */

import { refreshCalendars } from './calendario.js';
import { loadGoogle } from './google.js';
import { api } from '../nucleo/api.js';
import { CFG } from '../nucleo/estado.js';
import { $ } from '../nucleo/util.js';
import { toast } from '../ui/avisos.js';
import { setView } from '../ui/navegacao.js';
import { SONS, playSound } from '../ui/sons.js';

/* ---------- definições ---------- */
export function calRow(c) {
  const d = document.createElement('div');
  d.className = 'calrow';
  d.innerHTML = `<input type="color" title="Cor"><input class="inp" placeholder="Nome (ex.: Pessoal)" style="flex:0 0 130px"><input class="inp" placeholder="Link .ics / webcal://…"><button class="x" title="Remover">✕</button>`;
  const [col, nm, url] = d.querySelectorAll('input');
  col.value = c.cor || '#3b6ea8';
  nm.value = c.nome || '';
  url.value = c.url || '';
  d.querySelector('.x').onclick = () => d.remove();
  $('calList').appendChild(d);
}
// Abre as Definições com os valores atuais.
export function openCfg() {
  $('calList').innerHTML = '';
  (CFG.calendarios.length ? CFG.calendarios : [{}]).forEach(calRow);
  $('cPause').checked = !!CFG.pausar_em_eventos;
  $('cStopEnd').checked = !!CFG.parar_no_fim;
  $('cAviso').value = CFG.aviso_minutos;
  cfgMute = !!CFG.som_mudo;
  $('cVol').value = CFG.som_volume ?? 70;
  [
    ['cSomFim', 'fim'],
    ['cSomAviso', 'aviso'],
    ['cSomPlano', 'plano']
  ].forEach(([id, k]) => {
    $(id).value = CFG['som_' + k] || 'sino';
  });
  updVolUI();
  $('cIni').value = CFG.inicio_do_dia || '08:00';
  $('cFim').value = CFG.fim_do_dia;
  $('cBloco').value = CFG.bloco_max_min;
  $('cGoogle').checked = !!CFG.google_escrever;
  $('cfgModal').classList.add('show');
  loadGoogle();
}
$('addCal').onclick = () => calRow({});
$('goPlanos').onclick = () => {
  $('cfgModal').classList.remove('show');
  setView('planos');
};
// sons nas definições: só ficam guardados quando carregas em Guardar
export let cfgMute = false;
document.querySelectorAll('#cfgModal select[data-kind]').forEach(s => {
  s.innerHTML = Object.entries(SONS)
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join('');
  s.onchange = () => ouvir(s.dataset.kind);
});
// Toca o som escolhido num menu das Definições (pré-ouvir).
export function ouvir(kind) {
  playSound(kind, {
    mudo: false,
    volume: +$('cVol').value,
    som: $('cSom' + kind[0].toUpperCase() + kind.slice(1)).value
  });
}
// Ícone e texto do volume nas Definições.
export function updVolUI() {
  const v = +$('cVol').value,
    off = cfgMute || !v;
  $('cMute').textContent = off ? '🔇' : v < 40 ? '🔈' : '🔊';
  $('cMute').title = cfgMute ? 'Voltar a ligar os sons' : 'Silenciar';
  $('cVolTxt').textContent = cfgMute ? 'mudo' : v + '%';
  $('cVol').closest('.fld').classList.toggle('muted-snd', cfgMute);
}
$('cMute').onclick = () => {
  cfgMute = !cfgMute;
  if (!cfgMute && !+$('cVol').value) $('cVol').value = 50;
  updVolUI();
  if (!cfgMute) ouvir('fim');
};
$('cVol').oninput = () => {
  if (cfgMute) cfgMute = false;
  updVolUI();
};
$('cVol').onchange = () => ouvir('fim');
document.querySelectorAll('[data-ouvir]').forEach(b => (b.onclick = () => ouvir(b.dataset.ouvir)));
// botão rápido no topo
export function renderMute() {
  const off = !!CFG.som_mudo || !+(CFG.som_volume ?? 70);
  $('muteBtn').textContent = off ? '🔇' : '🔊';
  $('muteBtn').title = off ? 'Sons desligados · clica para ligar' : 'Silenciar sons';
  $('muteBtn').classList.toggle('ghost', off);
}
$('muteBtn').onclick = async () => {
  const was = !!CFG.som_mudo || !+(CFG.som_volume ?? 70),
    ch = { som_mudo: !was };
  if (was && !+(CFG.som_volume ?? 70)) ch.som_volume = 50;
  Object.assign(CFG, ch);
  renderMute();
  if (was) playSound('aviso');
  toast(was ? 'Sons ligados.' : 'Sons desligados.');
  try {
    const c = await api('/api/config', ch);
    Object.assign(CFG, c, ch);
  } catch (e) {}
};
$('cfgCancel').onclick = () => $('cfgModal').classList.remove('show');
$('cfgSave').onclick = async () => {
  const cals = [...$('calList').children]
    .map(r => {
      const [col, nm, url] = r.querySelectorAll('input');
      return { nome: nm.value.trim(), url: url.value.trim(), cor: col.value };
    })
    .filter(c => c.url);
  const next = {
    calendarios: cals,
    pausar_em_eventos: $('cPause').checked,
    parar_no_fim: $('cStopEnd').checked,
    aviso_minutos: Math.max(0, +$('cAviso').value || 0),
    inicio_do_dia: $('cIni').value || '08:00',
    fim_do_dia: $('cFim').value || '23:00',
    bloco_max_min: Math.max(10, +$('cBloco').value || 45),
    google_escrever: $('cGoogle').checked,
    som_mudo: cfgMute,
    som_volume: +$('cVol').value,
    som_fim: $('cSomFim').value,
    som_aviso: $('cSomAviso').value,
    som_plano: $('cSomPlano').value
  };
  try {
    Object.assign(CFG, next, await api('/api/config', next));
    renderMute();
    $('cfgModal').classList.remove('show');
    toast('Definições guardadas.');
    refreshCalendars(true);
    loadGoogle();
  } catch (e) {
    toast('Não consegui guardar as definições.', 'warn');
  }
};

$('cfgBtn').onclick = openCfg;
