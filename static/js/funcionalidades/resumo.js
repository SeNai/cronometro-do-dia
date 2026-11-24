/*
 * Separadores Resumo (tempo por atividade, últimos 7 dias) e Registo (blocos feitos, copiar resumo).
 */

import { save } from '../nucleo/api.js';
import { actById, color, totalDay } from '../nucleo/dados.js';
import { CFG, S, ui } from '../nucleo/estado.js';
import { $, addDays, dayLabel, dayStart, dayStr, esc, hhmm, short, todayStr } from '../nucleo/util.js';
import { ask, toast } from '../ui/avisos.js';
import { render } from '../ui/desenho.js';

// Resumo do dia escolhido: tempo por atividade, percentagem e metas.
export function renderSummary() {
  const ds = ui.viewDay,
    tots = S.acts.map(a => totalDay(a.id, ds)),
    all = tots.reduce((s, v) => s + v, 0);
  $('sumTitle').textContent = 'Resumo · ' + dayLabel(ds);
  $('stack').innerHTML = all
    ? S.acts
        .map((a, i) =>
          tots[i]
            ? `<i style="width:${(tots[i] / all) * 100}%;background:${color(a)}" title="${esc(a.name)}: ${short(tots[i])}"></i>`
            : ''
        )
        .join('')
    : '';
  $('sum').innerHTML =
    S.acts
      .map((a, i) => {
        const t = tots[i],
          g = a.goal ? a.goal * 60000 : 0;
        return `<div class="srow" style="--c:${color(a)}"><span class="n"><span class="dot"></span>${esc(a.name)}</span>
      <span class="v num">${short(t)}${a.goal ? ` <span class="muted">/ ${a.goal} min</span>` : ''} <span class="muted small">· ${all ? Math.round((t / all) * 100) : 0}%</span></span>
      ${g ? `<div class="bar"><i style="width:${Math.min(100, (t / g) * 100)}%"></i></div>` : ''}</div>`;
      })
      .join('') + `<div class="total"><span>Total</span><span class="num">${short(all)}</span></div>`;
}

// Tabela do registo do dia escolhido, com botão para apagar blocos.
export function renderLog() {
  const ds = ui.viewDay;
  $('logTitle').textContent = 'Registo de blocos · ' + dayLabel(ds);
  const rows = S.log
    .map((l, i) => [l, i])
    .filter(([l]) => dayStr(l.start) === ds || dayStr(l.end) === ds)
    .reverse()
    .map(([l, i]) => {
      const a = actById(l.id);
      return `<tr><td><span class="n"><span class="dot" style="background:${color(a)}"></span>${a ? esc(a.name) : '(removida)'}</span></td><td class="muted num">${hhmm(l.start)} – ${hhmm(l.end)}</td><td class="r num">${short(l.end - l.start)}</td><td class="r" style="width:40px"><button class="x" data-del="${i}" title="Apagar bloco">✕</button></td></tr>`;
    });
  $('log').innerHTML = rows.join('') || '<tr><td class="muted">Sem blocos neste dia.</td></tr>';
  $('log')
    .querySelectorAll('[data-del]')
    .forEach(
      b =>
        (b.onclick = () =>
          ask(
            'Apagar este bloco do registo?' + (CFG.google_escrever ? ' (também sai do Google Calendar)' : ''),
            () => {
              S.log.splice(+b.dataset.del, 1);
              save();
              render();
            }
          ))
    );
}

// Últimos 7 dias em barras empilhadas.
export function renderWeek() {
  const days = [...Array(7)].map((_, i) => addDays(todayStr(), i - 6));
  const tot = days.map(ds => S.acts.map(a => totalDay(a.id, ds)));
  const max = Math.max(1, ...tot.map(r => r.reduce((s, v) => s + v, 0)));
  let h = days
    .map((ds, i) => {
      const sum = tot[i].reduce((s, v) => s + v, 0);
      const wd = new Date(dayStart(ds))
        .toLocaleDateString('pt-PT', { weekday: 'short' })
        .replace('.', '')
        .slice(0, 3);
      return `<div class="wk${ds === todayStr() ? ' today' : ''}"><span class="muted">${wd}</span><div class="stack" style="width:${Math.max(2, (sum / max) * 100)}%">${S.acts.map((a, j) => (tot[i][j] ? `<i style="width:${(tot[i][j] / sum) * 100}%;background:${color(a)}" title="${esc(a.name)}: ${short(tot[i][j])}"></i>` : '')).join('')}</div><span class="r num">${short(sum)}</span></div>`;
    })
    .join('');
  h += `<div class="legend">${S.acts.map((a, j) => `<span><span class="dot" style="background:${color(a)}"></span>${esc(a.name)}: <b class="num">${short(tot.reduce((s, r) => s + r[j], 0))}</b></span>`).join('')}</div>`;
  $('week').innerHTML = h;
}

$('copyBtn').onclick = async () => {
  const ds = ui.viewDay;
  const txt =
    `Resumo · ${dayLabel(ds)}\n` +
    S.acts.map(a => `${a.name}: ${short(totalDay(a.id, ds))}`).join('\n') +
    '\n\nBlocos:\n' +
    S.log
      .filter(l => dayStr(l.start) === ds)
      .map(l => {
        const a = actById(l.id);
        return `${hhmm(l.start)}–${hhmm(l.end)} ${a ? a.name : '(removida)'} (${short(l.end - l.start)})`;
      })
      .join('\n');
  try {
    await navigator.clipboard.writeText(txt);
    toast('Resumo copiado.');
  } catch (e) {
    $('copyTxt').value = txt;
    $('copyModal').classList.add('show');
  }
};
$('closeCopy').onclick = () => $('copyModal').classList.remove('show');
