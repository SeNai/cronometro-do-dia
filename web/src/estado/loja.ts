/*
 * A «loja»: o estado partilhado de toda a interface (equivalente ao estado.js da versão antiga).
 *
 * Usa o Zustand. Cada componente lê só a parte de que precisa, e é redesenhado
 * automaticamente quando essa parte muda:
 *
 *     const dados = useLoja(s => s.dados);
 *     const comecar = useLoja(s => s.comecar);
 *
 * As alterações são feitas pelas «ações» definidas aqui (comecar, parar, escolher…),
 * nunca diretamente nos componentes. Assim, as regras da app ficam todas num só sítio.
 *
 * O middleware immer deixa escrever as alterações de forma simples (s.dados.sel = id),
 * e por baixo cria uma cópia nova dos dados, que é o que o React precisa para saber o que mudou.
 *
 * Gravar: sempre que `dados` muda, grava-se no servidor 250 ms depois
 * (várias alterações seguidas, como arrastar a roda, dão um só pedido).
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gravarDados, lerConfig, lerDados } from '../api';
import { atividadeNaRoda, atividadePorId, corridaNaRoda, duracaoSugerida } from '../lib/consultas';
import { normalizarDados } from '../lib/migracoes';
import { ESCALA_RODA, MIN, limitar, novoUid } from '../lib/tempo';
import type { Atividade, Config, Dados } from '../tipos';

/** Definições por omissão, até chegarem as do servidor (iguais às de servidor/config.py). */
const CONFIG_INICIAL: Config = {
  calendarios: [],
  pausar_em_eventos: true,
  aviso_minutos: 10,
  inicio_do_dia: '08:00',
  fim_do_dia: '23:00',
  bloco_max_min: 45,
  parar_no_fim: false,
  som_mudo: false,
  som_volume: 70,
  som_fim: 'sino',
  som_aviso: 'sino',
  som_plano: 'sino',
  google_escrever: false
};

interface Loja {
  dados: Dados;
  config: Config;
  /** Já chegaram os dados do servidor? (antes disso não se grava nada) */
  carregado: boolean;
  /** Mensagem a mostrar se não foi possível falar com o servidor. */
  erro: string | null;

  /** Lê definições e dados do servidor e arruma os dados antigos. Corre uma vez, no arranque. */
  carregar: () => Promise<void>;
  /** Escolhe a atividade mostrada na roda, sem a começar. */
  escolher: (id: number) => void;
  /**
   * Começa uma atividade (ou para-a, se já estiver a correr).
   * `doPlano`: veio de um bloco do plano · `duracao`: minutos na roda (senão usa a sugerida).
   */
  comecar: (id: number, opcoes?: { doPlano?: boolean; duracao?: number }) => void;
  /** Para a atividade a correr e regista o bloco (se durou mais de 1 s). */
  parar: () => void;
  /** Muda a duração na roda (minutos). Com a atividade a correr, muda o tempo total do bloco. */
  definirDuracao: (minutos: number, maximo?: number) => void;

  /** Muda o nome, a cor ou a meta de uma atividade. */
  alterarAtividade: (id: number, mudancas: Partial<Pick<Atividade, 'name' | 'color' | 'goal'>>) => void;
  /** Cria uma atividade nova (sem meta). */
  adicionarAtividade: (nome: string) => void;
  /** Remove uma atividade. Os blocos já registados ficam, e aparecem como «(removida)». */
  removerAtividade: (id: number) => void;
}

export const useLoja = create<Loja>()(
  immer((set, get) => ({
    dados: normalizarDados(null).dados,
    config: CONFIG_INICIAL,
    carregado: false,
    erro: null,

    carregar: async () => {
      try {
        const [vindos, config] = await Promise.all([lerDados(), lerConfig()]);
        const { dados, corrigido } = normalizarDados(vindos);
        set({ dados, config, carregado: true, erro: null });
        if (corrigido) agendarGravacao();
      } catch {
        set({
          erro: 'Não consegui falar com o servidor. Abre a app pelo atalho e volta a carregar esta página.'
        });
      }
    },

    escolher: id =>
      set(s => {
        s.dados.sel = id;
      }),

    comecar: (id, opcoes = {}) => {
      const { run } = get().dados;
      if (run?.id === id) {
        if (!opcoes.doPlano) get().parar();
        return;
      }
      get().parar();
      const { dados, config } = get();
      const a = atividadePorId(dados, id);
      if (!a) return;
      const alvo =
        opcoes.duracao != null ? limitar(opcoes.duracao, 0, ESCALA_RODA) : duracaoSugerida(dados, config, a);
      set(s => {
        s.dados.run = { id, start: Date.now(), target: alvo };
        s.dados.sel = id;
      });
    },

    parar: () => {
      const { run } = get().dados;
      if (!run) return;
      const fim = Date.now();
      set(s => {
        if (fim - run.start > 1000)
          s.dados.log.push({ uid: novoUid(), id: run.id, start: run.start, end: fim });
        s.dados.run = null;
      });
    },

    definirDuracao: (minutos, maximo = ESCALA_RODA) => {
      const m = limitar(minutos, 0, maximo);
      set(s => {
        const a = atividadeNaRoda(s.dados);
        if (!a) return;
        a.dur = m;
        const r = corridaNaRoda(s.dados);
        if (r) {
          r.target = m;
          // se ainda não passou o novo tempo, volta a poder avisar quando acabar
          if (!m || Date.now() - r.start < m * MIN) r.alerted = false;
        }
      });
    },

    alterarAtividade: (id, mudancas) =>
      set(s => {
        const a = atividadePorId(s.dados, id);
        if (a) Object.assign(a, mudancas);
      }),

    adicionarAtividade: nome =>
      set(s => {
        s.dados.acts.push({ id: s.dados.next++, name: nome, goal: 0 });
      }),

    removerAtividade: id => {
      if (get().dados.run?.id === id) get().parar();
      set(s => {
        s.dados.acts = s.dados.acts.filter(a => a.id !== id);
      });
    }
  }))
);

/* ---------- gravação automática ---------- */

let temporizador: ReturnType<typeof setTimeout> | undefined;

/** Grava os dados daqui a 250 ms (se entretanto houver mais alterações, junta tudo num só pedido). */
function agendarGravacao() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    gravarDados(useLoja.getState().dados).catch(() =>
      useLoja.setState({ erro: 'Não consegui guardar. A app ainda está aberta?' })
    );
  }, 250);
}

// Sempre que os dados mudam (depois de carregados), agenda a gravação.
useLoja.subscribe((agora, antes) => {
  if (agora.carregado && antes.carregado && agora.dados !== antes.dados) agendarGravacao();
});
