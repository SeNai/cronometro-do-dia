/*
 * Ações sobre o plano dos dias e a navegação entre dias.
 *
 * São funções normais (não hooks): podem ser chamadas de qualquer componente.
 * Leem o estado com useLoja.getState() e alteram-no com useLoja.setState(),
 * por isso a gravação automática da loja trata de as guardar no servidor.
 *
 * As que apagam ou substituem blocos mostram um aviso com «Desfazer».
 */
import { blocosDaSemanaAtiva, blocosDoDia, ordenar, podePlanear, preencherDia } from '../lib/plano';
import { MIN, curto, novoUid, rotuloDoDia } from '../lib/tempo';
import type { Bloco, Dia } from '../tipos';
import { avisar } from './avisos';
import { useLoja } from './loja';

/** Substitui todos os blocos de um dia (já ordenados por hora). */
export function definirPlano(dia: Dia, blocos: Bloco[]) {
  useLoja.setState(s => {
    s.dados.plans[dia] = ordenar(blocos);
  });
}

/** Aviso com «Desfazer» que repõe o plano como estava. */
function avisarComDesfazer(texto: string, dia: Dia, antes: Bloco[], duracao = 10_000) {
  avisar(texto, { botao: { rotulo: 'Desfazer', acao: () => definirPlano(dia, antes) }, duracao });
}

/** Junta um bloco ao plano de um dia. */
export function adicionarBloco(dia: Dia, id: number, inicio: number, fim: number): Bloco {
  const bloco = { uid: novoUid(), id, start: inicio, end: fim };
  definirPlano(dia, [...blocosDoDia(useLoja.getState().dados, dia), bloco]);
  return bloco;
}

/** Muda a hora, a duração ou a atividade de um bloco. */
export function alterarBloco(dia: Dia, uid: string, mudancas: Partial<Pick<Bloco, 'id' | 'start' | 'end'>>) {
  const blocos = blocosDoDia(useLoja.getState().dados, dia).map(b =>
    b.uid === uid ? { ...b, ...mudancas } : b
  );
  definirPlano(dia, blocos);
}

/** Apaga um bloco (com «Desfazer»). */
export function apagarBloco(dia: Dia, uid: string) {
  const antes = blocosDoDia(useLoja.getState().dados, dia);
  definirPlano(
    dia,
    antes.filter(b => b.uid !== uid)
  );
  avisarComDesfazer('Bloco apagado do plano.', dia, antes, 7000);
}

/** «Limpar plano» (com «Desfazer»). O dia fica com [] e a semana ativa já não o volta a encher. */
export function limparPlano(dia: Dia) {
  const antes = blocosDoDia(useLoja.getState().dados, dia);
  if (!antes.length) return;
  definirPlano(dia, []);
  avisarComDesfazer(`Plano de ${rotuloDoDia(dia).toLowerCase()} limpo.`, dia, antes);
}

/** «✨ Preencher o dia»: encaixa o que falta das metas nos espaços livres (com «Desfazer»). */
export async function preencherODia(dia: Dia) {
  if (!podePlanear(dia)) return avisar('Esse dia já passou.');
  // sem os compromissos desse dia, o plano podia ficar por cima deles
  if (!useLoja.getState().eventos[dia]) await useLoja.getState().carregarEventos(dia);
  const { dados, config, eventos } = useLoja.getState();
  const resultado = preencherDia(dados, config, eventos[dia]?.eventos ?? [], dia);
  if (resultado.tipo === 'aviso') return avisar(resultado.mensagem);

  const antes = blocosDoDia(dados, dia);
  definirPlano(dia, [...antes, ...resultado.novos]);
  const n = resultado.novos.length;
  avisarComDesfazer(
    `Juntei ${n} bloco${n > 1 ? 's' : ''} ao plano.` +
      (resultado.faltaMinutos >= 5
        ? ` Faltou espaço para ${curto(resultado.faltaMinutos * MIN)} das metas.`
        : ''),
    dia,
    antes
  );
}

/** Se o dia ainda não tem plano e a semana ativa tem programa para ele, enche-o. */
export function encherComASemana(dia: Dia) {
  const blocos = blocosDaSemanaAtiva(useLoja.getState().dados, dia);
  if (blocos) definirPlano(dia, blocos);
}

/** Muda o dia mostrado na linha do tempo (e lê os compromissos desse dia, se ainda não os tiver). */
export function irPara(dia: Dia) {
  useLoja.setState({ dia });
  const { eventos, carregarEventos } = useLoja.getState();
  if (!eventos[dia]) carregarEventos(dia);
  encherComASemana(dia);
}

/** Começar a arrastar uma atividade dos cartões. Devolve false se o dia mostrado já passou. */
export function comecarArrastoDeAtividade(id: number): boolean {
  if (!podePlanear(useLoja.getState().dia)) {
    avisar('Esse dia já passou. Escolhe hoje ou um dia à frente para planear.');
    return false;
  }
  useLoja.setState({ atividadeArrastada: id });
  return true;
}

export const terminarArrastoDeAtividade = () => useLoja.setState({ atividadeArrastada: null });
