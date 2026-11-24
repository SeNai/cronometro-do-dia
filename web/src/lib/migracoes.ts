/*
 * Arrumar os dados que vêm do servidor.
 *
 * O dados.json pode vir de versões antigas da app (sem uid nos blocos, com o formato
 * antigo de planos ou de semanas). Esta função devolve-os sempre no formato atual
 * (ver tipos.ts) e diz se mudou alguma coisa, para se gravar a versão corrigida.
 *
 * É a mesma lógica do arranque da interface antiga (static/js/main.js).
 */
import type { Bloco, BlocoModelo, Dados, Modelo, Semana } from '../tipos';
import { hoje, novoUid, somarDias } from './tempo';

/** Atividades com que a app começa quando ainda não há dados. */
const ATIVIDADES_INICIAIS = [
  { id: 1, name: 'Candidaturas', goal: 60 },
  { id: 2, name: 'Aprender tecnologia', goal: 90 },
  { id: 3, name: 'Pausa / Jogar', goal: 45 },
  { id: 4, name: 'Estudo', goal: 90 }
];

/** Campos de versões antigas que já não existem no tipo Dados. */
interface DadosAntigos extends Partial<Dados> {
  /** Antes havia um só plano: {dia, blocos}. */
  plan?: { dia?: string; blocos?: Bloco[] };
  /** Antes a semana era {diaDaSemana: idDoModelo}. */
  semana?: Record<string, number>;
}

export function normalizarDados(vindos: Partial<Dados> | null | undefined): {
  dados: Dados;
  corrigido: boolean;
} {
  const d: DadosAntigos = structuredClone(vindos ?? {});
  let corrigido = false;

  const dados: Dados = {
    acts: Array.isArray(d.acts) ? d.acts : ATIVIDADES_INICIAIS,
    log: Array.isArray(d.log) ? d.log : [],
    run: d.run ?? null,
    next: d.next ?? 1,
    plans: d.plans && typeof d.plans === 'object' ? d.plans : {},
    sel: d.sel ?? null,
    modelos: Array.isArray(d.modelos) ? d.modelos : [],
    semanas: Array.isArray(d.semanas) ? d.semanas : [],
    semanaAtiva: d.semanaAtiva ?? null
  };

  // o próximo id tem de ser maior do que todos os que já existem
  dados.next = Math.max(dados.next, ...dados.acts.map(a => a.id + 1));

  // blocos sem uid (versões antigas)
  for (const bloco of dados.log)
    if (!bloco.uid) {
      bloco.uid = novoUid();
      corrigido = true;
    }

  // antes havia só um plano (d.plan); agora há um por dia
  if (d.plan) {
    if (Array.isArray(d.plan.blocos) && d.plan.dia && !dados.plans[d.plan.dia])
      dados.plans[d.plan.dia] = d.plan.blocos;
    corrigido = true;
  }

  // guardam-se só os planos dos últimos 60 dias
  const limite = somarDias(hoje(), -60);
  for (const [dia, blocos] of Object.entries(dados.plans)) {
    if (dia < limite || !Array.isArray(blocos)) {
      delete dados.plans[dia];
      corrigido = true;
      continue;
    }
    for (const b of blocos)
      if (!b.uid) {
        b.uid = novoUid();
        corrigido = true;
      }
  }

  // versão antiga: d.semana = {diaDaSemana: idDoModelo} → passa a ser a semana «Semana tipo», já ativa
  if (d.semana) {
    const dias: Semana['dias'] = {};
    for (const [diaSemana, idModelo] of Object.entries(d.semana)) {
      const m: Modelo | undefined = dados.modelos.find(x => x.id === idModelo);
      if (m) dias[diaSemana as keyof Semana['dias']] = m.blocos.map((b: BlocoModelo) => ({ ...b }));
    }
    if (Object.keys(dias).length) {
      const id = Math.max(0, ...dados.semanas.map(s => s.id)) + 1;
      dados.semanas.push({ id, nome: 'Semana tipo', dias });
      dados.semanaAtiva ??= id;
    }
    corrigido = true;
  }

  // semana ativa que já não existe
  if (dados.semanaAtiva && !dados.semanas.some(s => s.id === dados.semanaAtiva)) dados.semanaAtiva = null;

  if (dados.run && dados.run.target == null) dados.run.target = 0;

  return { dados, corrigido };
}
