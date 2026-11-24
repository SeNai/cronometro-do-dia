/*
 * Estado partilhado da app: dados (S), definições (CFG), cache de eventos e estado da interface (ui).
 */

import { todayStr } from './util.js';

// Dados da app (gravados em dados.json através de save()).
//   acts  → atividades [{id, name, goal (min/dia), color?, dur? (última duração na roda)}]
//   log   → blocos feitos [{uid, id, start, end}] (ms)
//   run   → atividade a correr {id, start, target (min), alerted?} ou null
//   plans → plano de cada dia {"AAAA-MM-DD": [{uid, id, start, end}]}
//   modelos / semanas / semanaAtiva → ver funcionalidades/planos.js
//   sel   → atividade escolhida na roda;  next → próximo id livre
// É sempre o mesmo objeto (nunca se substitui), para todos os módulos verem as mudanças.
export const S = {
  acts: [
    { id: 1, name: 'Candidaturas', goal: 60 },
    { id: 2, name: 'Aprender tecnologia', goal: 90 },
    { id: 3, name: 'Pausa / Jogar', goal: 45 },
    { id: 4, name: 'Estudo', goal: 90 }
  ],
  log: [],
  run: null,
  next: 5,
  plans: {},
  sel: 1
};

// Definições (config.json no servidor). Valores por omissão até chegarem as do servidor.
export const CFG = {
  calendarios: [],
  pausar_em_eventos: true,
  aviso_minutos: 10,
  inicio_do_dia: '08:00',
  fim_do_dia: '23:00',
  som_mudo: false,
  som_volume: 70,
  som_fim: 'sino',
  som_aviso: 'sino',
  som_plano: 'sino',
  bloco_max_min: 45,
  parar_no_fim: false,
  google_escrever: false
};

// Eventos dos calendários já lidos, por dia: {"AAAA-MM-DD": {eventos:[…], erros:[…]}}
export const evCache = {};

// Avisos já mostrados (para não repetir o mesmo aviso a cada segundo).
export const alerted = new Set();

// Estado da interface partilhado entre módulos (os módulos ES não podem reatribuir
// variáveis importadas, por isso ficam todas dentro deste objeto).
//   viewDay     → dia escolhido no topo (‹ Hoje ›)
//   scrolledFor → dia para o qual a linha do tempo já fez scroll automático
//   tlLock      → true enquanto se arrasta na linha do tempo ou há um menu aberto (não redesenhar)
//   dragAct     → atividade a ser arrastada dos cartões para a linha do tempo
export const ui = { viewDay: todayStr(), scrolledFor: null, tlLock: false, dragAct: null };
