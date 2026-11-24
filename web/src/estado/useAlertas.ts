/*
 * Avisos automáticos, verificados a cada segundo:
 *
 *   1. acabou o tempo escolhido na roda (com «Parar», ou para sozinho se «parar no fim» estiver ligado);
 *   2. uns minutos antes de cada compromisso («Daqui a 10 min: Reunião»);
 *   3. quando um compromisso começa (e pausa o cronómetro, se essa opção estiver ligada);
 *   4. quando chega a hora de um bloco do plano (com «Começar»).
 *
 * Cada aviso só aparece uma vez: guarda-se uma «chave» de cada um em `jaAvisados`.
 */
import { useEffect } from 'react';
import { atividadePorId, ocupa } from '../lib/consultas';
import { MIN, duracaoPorExtenso, hoje, horaMinuto } from '../lib/tempo';
import { useLoja } from './loja';
import { notificar } from './notificar';
import { useAgora } from './useAgora';

const jaAvisados = new Set<string>();

/** Verifica todos os avisos para o instante `agora`. */
export function verificarAlertas(agora: number) {
  const { dados, config, eventos, parar, comecarBloco } = useLoja.getState();
  const dia = hoje();

  // 1. fim do tempo escolhido na roda
  const run = dados.run;
  if (run && run.target && !run.alerted && agora - run.start >= run.target * MIN) {
    useLoja.setState(s => {
      if (s.dados.run) s.dados.run.alerted = true;
    });
    const nome = atividadePorId(dados, run.id)?.name ?? '';
    if (config.parar_no_fim) {
      parar();
      notificar(`Acabou: ${nome}`, `${duracaoPorExtenso(run.target)} feitos. Parei o cronómetro.`, {
        som: 'fim'
      });
    } else
      notificar(`Acabou o tempo: ${nome}`, duracaoPorExtenso(run.target), {
        som: 'fim',
        botao: { rotulo: 'Parar', acao: () => useLoja.getState().parar() }
      });
  }

  // 2 e 3. compromissos de hoje
  const antecedencia = (config.aviso_minutos || 0) * MIN;
  for (const e of (eventos[dia]?.eventos ?? []).filter(ocupa)) {
    const chave = e.inicio + '|' + e.titulo;
    if (
      antecedencia &&
      e.inicio > agora &&
      e.inicio - agora <= antecedencia &&
      !jaAvisados.has('antes' + chave)
    ) {
      jaAvisados.add('antes' + chave);
      notificar(
        `Daqui a ${Math.ceil((e.inicio - agora) / MIN)} min: ${e.titulo}`,
        `às ${horaMinuto(e.inicio)}` + (e.local ? ' · ' + e.local : '')
      );
    }
    if (e.inicio <= agora && agora - e.inicio < MIN && !jaAvisados.has('comeca' + chave)) {
      jaAvisados.add('comeca' + chave);
      let msg = '';
      const aCorrer = useLoja.getState().dados.run;
      if (aCorrer && config.pausar_em_eventos) {
        msg = `Pausei «${atividadePorId(dados, aCorrer.id)?.name ?? ''}».`;
        parar();
      }
      notificar(`Começou: ${e.titulo}`, msg);
    }
  }

  // 4. blocos do plano de hoje
  for (const bloco of dados.plans[dia] ?? []) {
    const chave = 'plano' + bloco.uid + '|' + bloco.start;
    if (bloco.start <= agora && agora - bloco.start < MIN && !jaAvisados.has(chave)) {
      jaAvisados.add(chave);
      const a = atividadePorId(dados, bloco.id);
      if (a && useLoja.getState().dados.run?.id !== a.id)
        notificar(`Hora de: ${a.name}`, `até às ${horaMinuto(bloco.end)}, segundo o plano`, {
          som: 'plano',
          botao: { rotulo: 'Começar', acao: () => comecarBloco(bloco) }
        });
    }
  }
}

/** Liga a verificação dos avisos (usa-se uma vez, no App). */
export function useAlertas() {
  const agora = useAgora();
  const carregado = useLoja(s => s.carregado);
  useEffect(() => {
    if (carregado) verificarAlertas(agora);
  }, [agora, carregado]);
}
