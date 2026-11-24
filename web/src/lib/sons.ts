/*
 * Sons dos avisos, sintetizados com a Web Audio API (não há ficheiros de áudio).
 *
 * Cada som é uma pequena sequência de notas. Uma nota é um oscilador (gera a onda)
 * ligado a um controlo de volume que sobe depressa e desce devagar, como um sino.
 */
import type { Config, NomeSom } from '../tipos';

/** Sons disponíveis nas Definições (chave → nome mostrado). */
export const SONS: Record<NomeSom, string> = {
  sino: 'Sino (o de sempre)',
  campainha: 'Campainha',
  marimba: 'Marimba',
  suave: 'Suave',
  arcade: 'Arcade',
  digital: 'Relógio digital',
  nenhum: 'Sem som'
};

/** Quando se toca: 'fim' (acabou o tempo), 'aviso' (compromissos), 'plano' (hora de um bloco). */
export type TipoSom = 'fim' | 'aviso' | 'plano';

let contexto: AudioContext | undefined;

/** Toca uma nota: frequência `f` (Hz) a partir do instante `t`, durante `dur` segundos. */
function nota(
  saida: AudioNode,
  t: number,
  f: number,
  dur: number,
  { tipo = 'sine' as OscillatorType, volume = 1, ataque = 0.005 } = {}
) {
  const ctx = saida.context;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(f, t);
  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(volume, t + ataque); // sobe depressa
  vol.gain.exponentialRampToValueAtTime(0.0001, t + dur); // desce devagar
  osc.connect(vol).connect(saida);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

type Padrao = (saida: AudioNode, t: number, repeticoes: number) => void;

/** As notas de cada som. `repeticoes`: 3 no fim do tempo, 1 nos outros avisos. */
const PADROES: Record<Exclude<NomeSom, 'nenhum'>, Padrao> = {
  sino: (s, t, n) => {
    for (let i = 0; i < n; i++) nota(s, t + i * 0.35, i % 2 ? 660 : 880, 0.5);
  },
  campainha: (s, t, n) => {
    // uma nota com «harmónicos» (frequências múltiplas, mais fracas) soa a metal
    const harmonicos = [
      [1, 1],
      [2.76, 0.35],
      [5.4, 0.18],
      [8.93, 0.08]
    ];
    for (let i = 0; i < Math.min(n, 2); i++)
      for (const [m, v] of harmonicos) nota(s, t + i * 0.9, 880 * m, 1.6 / Math.pow(m, 0.3), { volume: v });
  },
  marimba: (s, t, n) => {
    for (let r = 0; r < Math.min(n, 2); r++)
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        nota(s, t + r * 0.7 + i * 0.11, f, 0.35, { tipo: 'triangle', volume: 0.9 })
      );
  },
  suave: (s, t, n) => {
    for (let i = 0; i < Math.min(n, 2); i++) {
      nota(s, t + i * 1.1, 587.33, 1.2, { volume: 0.8, ataque: 0.06 });
      nota(s, t + i * 1.1 + 0.18, 880, 1.1, { volume: 0.5, ataque: 0.06 });
    }
  },
  arcade: (s, t, n) => {
    for (let r = 0; r < Math.min(n, 2); r++)
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        nota(s, t + r * 0.5 + i * 0.07, f, 0.09, { tipo: 'square', volume: 0.22 })
      );
  },
  digital: (s, t, n) => {
    for (let i = 0; i < n; i++)
      for (const d of [0, 0.12]) nota(s, t + i * 0.47 + d, 2093, 0.07, { tipo: 'square', volume: 0.18 });
  }
};

/**
 * Toca o som de um tipo de aviso, conforme as definições.
 * `forcar` serve para pré-ouvir nas Definições (outro som ou volume sem os gravar).
 */
export function tocarSom(
  tipo: TipoSom,
  config: Pick<Config, 'som_mudo' | 'som_volume' | 'som_fim' | 'som_aviso' | 'som_plano'>,
  forcar: { som?: NomeSom; volume?: number; mudo?: boolean } = {}
) {
  const mudo = forcar.mudo ?? config.som_mudo;
  const volume = forcar.volume ?? config.som_volume ?? 70;
  const som = forcar.som ?? config[`som_${tipo}`] ?? 'sino';
  if (mudo || !volume || som === 'nenhum') return;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') void contexto.resume();
    const saida = contexto.createGain();
    // o ouvido não é linear: elevar a 1.6 faz o controlo de volume parecer mais natural
    saida.gain.value = Math.pow(volume / 100, 1.6) * 0.35;
    saida.connect(contexto.destination);
    (PADROES[som] ?? PADROES.sino)(saida, contexto.currentTime + 0.03, tipo === 'fim' ? 3 : 1);
  } catch {
    // sem som (ex.: o browser bloqueou o áudio): o aviso escrito aparece na mesma
  }
}
