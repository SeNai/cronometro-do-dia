/*
 * Ações sobre os planos guardados (planos do dia e semanas) e o editor do separador Planos.
 *
 * Tal como em acoesPlano.ts, são funções normais que alteram a loja; a gravação é automática.
 */
import { blocosDoDia, podePlanear } from '../lib/plano';
import {
  DIAS,
  DIAS_CURTOS,
  modeloPorId,
  ordenarModelo,
  paraOPlanoDoDia,
  programaDoDia,
  proximoId,
  semanaPorId,
  type Coluna,
  type PlanoAberto
} from '../lib/planos';
import { MIN, hoje, inicioDoDia, rotuloDoDia } from '../lib/tempo';
import type { BlocoModelo, Dados, Dia, Semana } from '../tipos';
import { definirPlano, encherComASemana } from './acoesPlano';
import { avisar } from './avisos';
import { useLoja, type Vista } from './loja';

/* ---------- separadores e editor ---------- */

export const mudarVista = (vista: Vista) => useLoja.setState({ vista });

/**
 * Pedidos ao editor. `focarNome`: o editor põe o cursor no nome assim que abrir
 * (usado ao criar um plano novo, para se poder escrever logo o nome).
 */
export const pedidosAoEditor = { focarNome: false };

/** Abre um plano do dia ou uma semana no editor. */
export const abrirPlano = (p: PlanoAberto | null) => useLoja.setState({ planoAberto: p });

/* ---------- aplicar planos aos dias ---------- */

/** Aplica blocos guardados a um dia: «substituir» o plano que lá está, ou «juntar» (com «Desfazer»). */
export function aplicarAoDia(dia: Dia, blocos: BlocoModelo[], nome: string, modo: 'substituir' | 'juntar') {
  const dados = useLoja.getState().dados;
  const antes = blocosDoDia(dados, dia);
  const novos = paraOPlanoDoDia(dados, blocos, dia);
  definirPlano(dia, modo === 'juntar' ? [...antes, ...novos] : novos);
  avisar(`«${nome}» aplicado a ${rotuloDoDia(dia).toLowerCase()}.`, {
    botao: { rotulo: 'Desfazer', acao: () => definirPlano(dia, antes) },
    duracao: 10_000
  });
}

/** Escolhe a semana ativa (null = nenhuma) e enche já hoje e o dia mostrado, se estiverem vazios. */
export function ativarSemana(id: number | null) {
  useLoja.setState(s => {
    s.dados.semanaAtiva = id;
  });
  const t = hoje();
  encherComASemana(t);
  encherComASemana(useLoja.getState().dia);
  const dados = useLoja.getState().dados;
  const semana = semanaPorId(dados, id);
  if (!semana) return avisar('Nenhuma semana ativa. Os dias novos começam sem plano.');

  // hoje já tinha um plano diferente do programa da semana? oferece-se para o trocar
  const programa = ordenarModelo(programaDoDia(semana, t));
  const deHoje = blocosDoDia(dados, t);
  const igual =
    deHoje.length === programa.length &&
    deHoje.every((p, i) => p.id === programa[i].id && p.start === inicioDoDia(t) + programa[i].s * MIN);
  if (programa.length && deHoje.length && !igual)
    avisar(`Semana «${semana.nome}» ativa. Hoje já tinhas um plano, por isso não lhe mexi.`, {
      botao: {
        rotulo: 'Usar a semana hoje',
        acao: () =>
          aplicarAoDia(
            t,
            programa,
            `${semana.nome} · ${DIAS_CURTOS[new Date(inicioDoDia(t)).getDay()]}`,
            'substituir'
          )
      },
      duracao: 12_000
    });
  else avisar(`Semana «${semana.nome}» ativa. Os dias sem plano recebem o programa desse dia.`);
}

/* ---------- criar, mudar, duplicar e apagar planos guardados ---------- */

/** Cria um plano do dia (opcionalmente já com blocos) e abre-o no editor. */
export function novoPlanoDoDia(blocos: BlocoModelo[] = [], nome?: string) {
  const id = proximoId(useLoja.getState().dados.modelos);
  useLoja.setState(s => {
    s.dados.modelos.push({ id, nome: nome ?? `Plano ${s.dados.modelos.length + 1}`, blocos });
  });
  pedidosAoEditor.focarNome = true;
  abrirPlano({ tipo: 'dia', id });
}

/** Cria uma semana vazia e abre-a no editor. */
export function novaSemana() {
  const { semanas } = useLoja.getState().dados;
  const id = proximoId(semanas);
  useLoja.setState(s => {
    s.dados.semanas.push({
      id,
      nome: semanas.length ? `Semana ${semanas.length + 1}` : 'Semana tipo',
      dias: {}
    });
  });
  pedidosAoEditor.focarNome = true;
  abrirPlano({ tipo: 'semana', id });
}

/** Muda o nome do plano aberto. */
export function mudarNome(p: PlanoAberto, nome: string) {
  useLoja.setState(s => {
    const o = p.tipo === 'semana' ? semanaPorId(s.dados, p.id) : modeloPorId(s.dados, p.id);
    if (o) o.nome = nome;
  });
}

/** Altera os blocos de uma coluna do editor (`mudar` recebe a lista e devolve a nova). */
export function mudarColuna(p: PlanoAberto, coluna: Coluna, mudar: (blocos: BlocoModelo[]) => BlocoModelo[]) {
  useLoja.setState(s => escreverColuna(s.dados, p, coluna, mudar));
}

/** (usado dentro de setState) Escreve a nova lista de blocos de uma coluna, ordenada. */
function escreverColuna(
  dados: Dados,
  p: PlanoAberto,
  coluna: Coluna,
  mudar: (b: BlocoModelo[]) => BlocoModelo[]
) {
  if (p.tipo === 'dia') {
    const m = modeloPorId(dados, p.id);
    if (m) m.blocos = ordenarModelo(mudar(m.blocos.map(b => ({ ...b }))));
  } else {
    const w = semanaPorId(dados, p.id);
    const k = coluna as keyof Semana['dias'];
    if (w) w.dias[k] = ordenarModelo(mudar((w.dias[k] ?? []).map(b => ({ ...b }))));
  }
}

/** Move um bloco (o n.º `indice` da coluna `de`) para outra hora e, numa semana, talvez para outro dia. */
export function moverBloco(p: PlanoAberto, de: Coluna, indice: number, para: Coluna, s: number, e: number) {
  useLoja.setState(st => {
    let movido: BlocoModelo | undefined;
    escreverColuna(st.dados, p, de, bs => {
      movido = bs[indice];
      return de === para ? bs : bs.filter((_, i) => i !== indice);
    });
    if (!movido) return;
    if (de === para)
      escreverColuna(st.dados, p, de, bs => bs.map((b, i) => (i === indice ? { ...b, s, e } : b)));
    else escreverColuna(st.dados, p, para, bs => [...bs, { ...movido!, s, e }]);
  });
}

/** Copia o programa de um dia da semana para outros dias. */
export function copiarDia(p: PlanoAberto, de: Coluna, para: string[]) {
  const blocos =
    useLoja.getState().dados.semanas.find(w => w.id === p.id)?.dias[de as keyof Semana['dias']] ?? [];
  useLoja.setState(s => {
    for (const k of para)
      if (k !== de) escreverColuna(s.dados, p, k as Coluna, () => blocos.map(b => ({ ...b })));
  });
  avisar(`${DIAS[+de]} copiado.`);
}

/** Duplica o plano aberto e abre a cópia. */
export function duplicarPlano(p: PlanoAberto) {
  const dados = useLoja.getState().dados;
  const lista = p.tipo === 'semana' ? dados.semanas : dados.modelos;
  const o = lista.find(x => x.id === p.id);
  if (!o) return;
  const copia = { ...structuredClone(o), id: proximoId(lista), nome: o.nome + ' (cópia)' };
  useLoja.setState(s => {
    if (p.tipo === 'semana') s.dados.semanas.push(copia as Semana);
    else s.dados.modelos.push(copia as (typeof s.dados.modelos)[number]);
  });
  abrirPlano({ tipo: p.tipo, id: copia.id });
}

/** Apaga o plano aberto (com «Desfazer»). Os planos já aplicados aos dias ficam como estão. */
export function apagarPlano(p: PlanoAberto) {
  const { modelos, semanas, semanaAtiva } = useLoja.getState().dados;
  const nome = (p.tipo === 'semana' ? semanaPorId : modeloPorId)(useLoja.getState().dados, p.id)?.nome ?? '';
  useLoja.setState(s => {
    if (p.tipo === 'semana') {
      s.dados.semanas = s.dados.semanas.filter(w => w.id !== p.id);
      if (s.dados.semanaAtiva === p.id) s.dados.semanaAtiva = null;
    } else s.dados.modelos = s.dados.modelos.filter(m => m.id !== p.id);
    s.planoAberto = null;
  });
  avisar(`«${nome}» apagado.`, {
    botao: {
      rotulo: 'Desfazer',
      acao: () =>
        useLoja.setState(s => {
          s.dados.modelos = modelos;
          s.dados.semanas = semanas;
          s.dados.semanaAtiva = semanaAtiva;
          s.planoAberto = p;
        })
    },
    duracao: 8000
  });
}

/** Aplica o plano do dia aberto ao dia escolhido no topo (decide «substituir» se o dia estiver vazio). */
export function podeAplicarAoDiaMostrado(): string | null {
  const dia = useLoja.getState().dia;
  if (!podePlanear(dia)) return 'O dia escolhido no topo já passou. Muda para hoje ou para um dia à frente.';
  return null;
}
