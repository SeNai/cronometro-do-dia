/*
 * Sons dos avisos, sintetizados com Web Audio (não há ficheiros de áudio).
 */

import { CFG } from '../nucleo/estado.js';

/* ---------- avisos ---------- */
/* sons: sintetizados no momento (não há ficheiros de áudio) */
export let actx, OUT;
// Sons disponíveis nas Definições (chave → nome mostrado).
export const SONS = {
  sino: 'Sino (o de sempre)',
  campainha: 'Campainha',
  marimba: 'Marimba',
  suave: 'Suave',
  arcade: 'Arcade',
  digital: 'Relógio digital',
  nenhum: 'Sem som'
};
// Uma nota: frequência f (Hz) durante dur segundos, com ataque e decaimento suaves.
export function tone(t, f, dur, { type = 'sine', gain = 1, attack = 0.005 } = {}) {
  const o = actx.createOscillator(),
    g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(OUT);
  o.start(t);
  o.stop(t + dur + 0.05);
}
// Cada som é uma sequência de notas; n = repetições (3 no fim do tempo, 1 nos outros avisos).
export const PADROES = {
  // (início, repetições)
  sino: (t, n) => {
    for (let i = 0; i < n; i++) tone(t + i * 0.35, i % 2 ? 660 : 880, 0.5);
  },
  campainha: (t, n) => {
    for (let i = 0; i < Math.min(n, 2); i++)
      [
        [1, 1],
        [2.76, 0.35],
        [5.4, 0.18],
        [8.93, 0.08]
      ].forEach(([m, g]) => tone(t + i * 0.9, 880 * m, 1.6 / Math.pow(m, 0.3), { gain: g }));
  },
  marimba: (t, n) => {
    for (let r = 0; r < Math.min(n, 2); r++)
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(t + r * 0.7 + i * 0.11, f, 0.35, { type: 'triangle', gain: 0.9 })
      );
  },
  suave: (t, n) => {
    for (let i = 0; i < Math.min(n, 2); i++) {
      tone(t + i * 1.1, 587.33, 1.2, { gain: 0.8, attack: 0.06 });
      tone(t + i * 1.1 + 0.18, 880, 1.1, { gain: 0.5, attack: 0.06 });
    }
  },
  arcade: (t, n) => {
    for (let r = 0; r < Math.min(n, 2); r++)
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone(t + r * 0.5 + i * 0.07, f, 0.09, { type: 'square', gain: 0.22 })
      );
  },
  digital: (t, n) => {
    for (let i = 0; i < n; i++)
      [0, 0.12].forEach(d => tone(t + i * 0.47 + d, 2093, 0.07, { type: 'square', gain: 0.18 }));
  }
};
// kind: 'fim' (acabou o tempo), 'aviso' (compromissos), 'plano' (hora de um bloco). o: valores para pré-ouvir nas definições
export function playSound(kind, o) {
  const c = Object.assign(
    { mudo: !!CFG.som_mudo, volume: CFG.som_volume ?? 70, som: CFG['som_' + kind] || 'sino' },
    o || {}
  );
  if (c.mudo || !+c.volume || c.som === 'nenhum') return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    OUT = actx.createGain();
    OUT.gain.value = Math.pow(c.volume / 100, 1.6) * 0.35;
    OUT.connect(actx.destination);
    (PADROES[c.som] || PADROES.sino)(actx.currentTime + 0.03, kind === 'fim' ? 3 : 1);
  } catch (e) {}
}
