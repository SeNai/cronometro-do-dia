/*
 * Contas para os separadores Resumo e Registo (funções puras).
 */
import type { Atividade, Bloco, Dados, Dia } from '../tipos';
import { atividadePorId, totalNoDia } from './consultas';
import { curto, diaDe, hoje, horaMinuto, inicioDoDia, rotuloDoDia, somarDias } from './tempo';

export interface TotalAtividade {
  atividade: Atividade;
  /** Milissegundos feitos nesse dia. */
  feito: number;
}

/** Tempo feito em cada atividade num dia, e o total. */
export function totaisDoDia(dados: Dados, dia: Dia, agora = Date.now()) {
  const porAtividade: TotalAtividade[] = dados.acts.map(a => ({
    atividade: a,
    feito: totalNoDia(dados, a.id, dia, agora)
  }));
  return { porAtividade, total: porAtividade.reduce((s, x) => s + x.feito, 0) };
}

/** Os últimos 7 dias (o último é hoje), com o tempo de cada atividade e o nome curto do dia («seg»). */
export function ultimos7Dias(dados: Dados, agora = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(hoje(), i - 6);
    const { porAtividade, total } = totaisDoDia(dados, dia, agora);
    const nome = new Date(inicioDoDia(dia))
      .toLocaleDateString('pt-PT', { weekday: 'short' })
      .replace('.', '')
      .slice(0, 3);
    return { dia, nome, porAtividade, total };
  });
}

/** Blocos do registo que tocam nesse dia, do mais recente para o mais antigo. */
export const blocosDoRegisto = (dados: Dados, dia: Dia): Bloco[] =>
  dados.log.filter(b => diaDe(b.start) === dia || diaDe(b.end) === dia).reverse();

/** O texto do botão «⧉ Copiar resumo» (para colar numa mensagem ou num documento). */
export function textoDoResumo(dados: Dados, dia: Dia) {
  const linhasAtividades = dados.acts.map(a => `${a.name}: ${curto(totalNoDia(dados, a.id, dia))}`);
  const linhasBlocos = dados.log
    .filter(b => diaDe(b.start) === dia)
    .map(b => {
      const nome = atividadePorId(dados, b.id)?.name ?? '(removida)';
      return `${horaMinuto(b.start)}–${horaMinuto(b.end)} ${nome} (${curto(b.end - b.start)})`;
    });
  return `Resumo · ${rotuloDoDia(dia)}\n${linhasAtividades.join('\n')}\n\nBlocos:\n${linhasBlocos.join('\n')}`;
}
