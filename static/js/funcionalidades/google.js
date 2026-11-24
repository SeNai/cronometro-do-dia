/*
 * Ligação ao Google Calendar: estado, carregar credenciais, ligar e desligar a conta.
 */

import { openCfg } from './definicoes.js';
import { api } from '../nucleo/api.js';
import { CFG } from '../nucleo/estado.js';
import { $, esc, hhmm } from '../nucleo/util.js';
import { ask, toast } from '../ui/avisos.js';

// último estado da ligação ao Google (vem de /api/google/estado)
export let GST = null;
/* ---------- Google ---------- */
export async function loadGoogle() {
  try {
    GST = await api('/api/google/estado');
  } catch (e) {
    GST = null;
  }
  renderGoogle();
}
// Chip «✓ Google» no topo e a secção do Google nas Definições.
export function renderGoogle() {
  const g = GST,
    chip = $('gChip');
  if (g && g.escrever && g.ligado) {
    chip.hidden = false;
    chip.className = 'chip ' + (g.erro ? 'bad' : 'ok');
    chip.textContent = g.erro ? '⚠ Google' : '✓ Google';
    chip.title =
      g.erro ||
      'A enviar blocos para o Google Calendar' + (g.ultimo ? ` · último envio às ${hhmm(g.ultimo)}` : '');
  } else chip.hidden = true;
  if (!g) {
    $('gEstado').textContent = 'Não consegui falar com a app.';
    return;
  }
  let t;
  if (!g.disponivel)
    t =
      '⚠ Faltam bibliotecas. Fecha a app e volta a abri-la pelo atalho (instala sozinha), ou corre <code>pip install -r requirements.txt</code>.';
  else if (g.a_ligar) t = '⏳ À espera que autorizes no browser…';
  else if (!g.credenciais)
    t = '<b>Passo 1:</b> carrega o ficheiro de credenciais (vê as instruções em baixo).';
  else if (!g.ligado) t = '<b>Passo 2:</b> carrega em «Ligar conta Google».';
  else
    t =
      `✓ Conta ligada.${g.escrever ? ' Os blocos vão para o calendário «Cronómetro do Dia».' : ' Ativa a opção abaixo para enviar os blocos.'}` +
      (g.ultimo ? ` <span class="muted">Último envio às ${hhmm(g.ultimo)}.</span>` : '');
  if (g.erro) t += `<div class="err">⚠ ${esc(g.erro)}</div>`;
  $('gEstado').innerHTML = t;
  $('gLigar').hidden = !g.disponivel || !g.credenciais || g.a_ligar;
  $('gLigar').textContent = g.ligado ? 'Ligar outra vez' : 'Ligar conta Google';
  $('gDesligar').hidden = !g.ligado;
  $('cGoogle').disabled = !g.ligado;
}
export let gPoll;
// Enquanto a autorização decorre no browser, pergunta o estado a cada 2 s.
export function pollGoogle() {
  clearInterval(gPoll);
  gPoll = setInterval(async () => {
    await loadGoogle();
    if (!GST || !GST.a_ligar) {
      clearInterval(gPoll);
      if (GST && GST.ligado) {
        $('cGoogle').checked = true;
        CFG.google_escrever = true;
        toast('Conta Google ligada ✓');
      }
    }
  }, 2000);
}
$('gCredFile').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    GST = await api('/api/google/credenciais', JSON.parse(await f.text()));
    renderGoogle();
    toast('Credenciais guardadas. Agora carrega em «Ligar conta Google».');
  } catch (err) {
    toast(
      err.message.includes('JSON') ? 'Esse ficheiro não é um JSON válido.' : err.message,
      'warn',
      null,
      null,
      10000
    );
  }
};
$('gLigar').onclick = async () => {
  try {
    GST = await api('/api/google/ligar', {});
    renderGoogle();
    pollGoogle();
  } catch (e) {
    toast(e.message, 'warn');
  }
};
$('gDesligar').onclick = () =>
  ask('Desligar a conta Google? Os blocos já enviados ficam lá.', async () => {
    try {
      GST = await api('/api/google/desligar', {});
      CFG.google_escrever = false;
      $('cGoogle').checked = false;
      renderGoogle();
    } catch (e) {
      toast(e.message, 'warn');
    }
  });

$('gChip').onclick = openCfg;
