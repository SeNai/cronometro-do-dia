/*
 * Utilitários sem estado: constantes, datas («AAAA-MM-DD»), formatação de tempos e o atalho $(id).
 */

/* ---------- utilitários ---------- */
export const COLORS = [
  '#2f8f78',
  '#3b6ea8',
  '#d06a3a',
  '#8a5aa8',
  '#c99a22',
  '#4f8a3a',
  '#b8456a',
  '#2f8f9a'
];
export const PX = 1.4; // píxeis por minuto na linha do tempo
export const SCALE = 120,
  STEP = 5; // a roda vai de 0 a 120 min, de 5 em 5
export const $ = id => document.getElementById(id);
export const pad = n => String(n).padStart(2, '0');
// Data local «AAAA-MM-DD» de um instante (ms).
export const dayStr = t => {
  const d = new Date(t);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
export const todayStr = () => dayStr(Date.now());
// Meia-noite (ms) de um dia «AAAA-MM-DD».
export const dayStart = ds => {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
// Soma n dias a uma data «AAAA-MM-DD».
export const addDays = (ds, n) => {
  const [y, m, d] = ds.split('-').map(Number);
  return dayStr(new Date(y, m - 1, d + n).getTime());
};
export const fmt = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(pad).join(':');
};
// Tempo como no relógio: «05:09» ou «1:05:09».
export const clock = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)),
    h = Math.floor(s / 3600);
  return (h ? h + ':' : '') + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
};
// Tempo curto: «45 min» ou «1h 30».
export const short = ms => {
  const m = Math.round(ms / 60000);
  return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + pad(m % 60) : '');
};
// Hora «14:30» de um instante (ms).
export const hhmm = t => {
  const d = new Date(t);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
};
// Escapa texto para o pôr dentro de HTML.
export const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
// Identificador único curto (blocos do registo e do plano).
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// «Hoje, segunda-feira, 23 nov», «Amanhã, …» ou só a data.
export const dayLabel = ds => {
  const t = dayStart(ds);
  const s = new Date(t).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });
  return ds === todayStr()
    ? 'Hoje, ' + s
    : ds === addDays(todayStr(), -1)
      ? 'Ontem, ' + s
      : ds === addDays(todayStr(), 1)
        ? 'Amanhã, ' + s
        : s;
};

/* ---------- escrever o tempo à mão (clicar nos números grandes) ---------- */
export const fmtMS = m => {
  const s = Math.round(m * 60);
  return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
};
// «6 min 34 s», «45 min» ou «20 s».
export const fmtDur = m => {
  const s = Math.round(m * 60),
    mm = Math.floor(s / 60),
    ss = s % 60;
  return mm && ss ? `${mm} min ${ss} s` : mm ? `${mm} min` : `${ss} s`;
};
// aceita 6:34 · 1:06:34 · 6m34s · 6m34 · 6 min 34 s · 34s · 1h20 · 1h 20m · 6 34 · 45 · 6,5 → minutos (0 = sem limite)
export function parseDur(t) {
  const s = String(t).trim().toLowerCase().replace(',', '.').replace(/^\+/, '');
  let m;
  if (!s) return null;
  if (s === '∞') return 0;
  if ((m = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/))) return m[1] * 60 + +m[2] + m[3] / 60;
  if ((m = s.match(/^(\d+):(\d{1,2})$/))) return +m[1] + m[2] / 60;
  if ((m = s.match(/^\d+(\.\d+)?$/))) return +s;
  if ((m = s.match(/^(\d+)\s+(\d{1,2})$/))) return +m[1] + m[2] / 60;
  if ((m = s.match(/^(\d+)\s*h\s*(\d{1,2})$/))) return m[1] * 60 + +m[2];
  if ((m = s.match(/^(\d+)\s*m(?:in)?\s*(\d{1,2})$/))) return +m[1] + m[2] / 60;
  m = s.match(
    /^(?:(\d+(?:\.\d+)?)\s*h(?:oras?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in(?:utos?)?)?)?\s*(?:(\d+)\s*s(?:eg(?:undos?)?)?)?$/
  );
  if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 60 + (+m[2] || 0) + (+m[3] || 0) / 60;
  return null;
}

// Os blocos do plano encaixam de 5 em 5 minutos.
export const SNAP = 5 * 60000,
  snap = t => Math.round(t / SNAP) * SNAP,
  MIN = 60000;
