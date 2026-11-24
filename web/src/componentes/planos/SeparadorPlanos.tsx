/*
 * Separador «Planos»: à esquerda as listas de semanas e de planos do dia; à direita o editor.
 * Aqui prepara-se o tempo com antecedência, sem mexer no dia de hoje.
 */
import { abrirPlano, novaSemana, novoPlanoDoDia } from '../../estado/acoesPlanos';
import { useLoja } from '../../estado/loja';
import { planoGuardado, resumoBlocos, resumoSemana, type PlanoAberto } from '../../lib/planos';
import { Botao } from '../ui/Botao';
import { Cartao } from '../ui/Cartao';
import { EditorPlano } from './EditorPlano';
import { PontosAtividades } from './PontosAtividades';

const estiloItem = (aberto: boolean) =>
  `mb-[3px] grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-[11px] border px-2.5 py-[9px] text-left ${
    aberto
      ? 'border-line bg-surface2 shadow-[inset_3px_0_0_var(--accent)]'
      : 'border-transparent hover:bg-surface2'
  }`;

/** Texto quando ainda não há nada criado. */
function Vazio() {
  return (
    <div className="max-w-[560px] leading-[1.55]">
      <h2 className="mb-2 text-xl font-semibold">Planos</h2>
      <p className="mb-2">Aqui preparas o teu tempo com antecedência, sem mexer no dia de hoje:</p>
      <ul className="mb-3 list-disc pl-5">
        <li className="mb-1">
          <b>Semana</b>: um programa para cada dia, de segunda a domingo. Quando a ativas, cada dia sem plano
          recebe o programa desse dia.
        </li>
        <li>
          <b>Plano do dia</b>: um dia-modelo, por exemplo «Dia de estudo», que aplicas a qualquer dia.
        </li>
      </ul>
      <p className="mb-3">
        Depois, na linha do tempo do <b>Hoje</b>, usa o botão <b>📋 Planos</b> para aplicar um plano ou
        escolher a semana ativa.
      </p>
      <div className="flex flex-wrap gap-2">
        <Botao variante="principal" onClick={novaSemana}>
          + Nova semana
        </Botao>
        <Botao onClick={() => novoPlanoDoDia()}>+ Novo plano do dia</Botao>
      </div>
    </div>
  );
}

export function SeparadorPlanos() {
  const dados = useLoja(s => s.dados);
  const escolhido = useLoja(s => s.planoAberto);

  // o plano aberto; se não houver (ou foi apagado), abre a primeira semana ou o primeiro plano do dia
  let aberto: PlanoAberto | null = planoGuardado(dados, escolhido) ? escolhido : null;
  if (!aberto && dados.semanas.length) aberto = { tipo: 'semana', id: dados.semanas[0].id };
  else if (!aberto && dados.modelos.length) aberto = { tipo: 'dia', id: dados.modelos[0].id };
  const objeto = planoGuardado(dados, aberto);
  const eAberto = (tipo: PlanoAberto['tipo'], id: number) => aberto?.tipo === tipo && aberto.id === id;

  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[260px_minmax(0,1fr)]">
      <Cartao
        titulo="Semanas"
        acoes={
          <Botao pequeno onClick={novaSemana}>
            + Nova
          </Botao>
        }
      >
        {dados.semanas.map(w => (
          <button
            key={w.id}
            type="button"
            className={estiloItem(eAberto('semana', w.id))}
            onClick={() => abrirPlano({ tipo: 'semana', id: w.id })}
          >
            <span className="col-span-2 truncate font-semibold">{w.nome}</span>
            {dados.semanaAtiva === w.id ? (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] px-[7px] py-px text-[11px] font-[650] text-accent">
                ativa
              </span>
            ) : (
              <span />
            )}
            <small className="col-span-full text-xs text-faint">{resumoSemana(w)}</small>
          </button>
        ))}
        {!dados.semanas.length && (
          <p className="mx-1 mt-0.5 mb-1.5 text-[13px] text-mute">Um programa para cada dia da semana.</p>
        )}

        <h2 className="mt-5 mb-3.5 flex items-center gap-2 text-[13px] font-[650] tracking-[0.04em] text-mute uppercase">
          Planos do dia
          <span className="flex-1" />
          <Botao
            pequeno
            className="font-medium tracking-normal text-ink normal-case"
            onClick={() => novoPlanoDoDia()}
          >
            + Novo
          </Botao>
        </h2>
        {dados.modelos.map(m => (
          <button
            key={m.id}
            type="button"
            className={estiloItem(eAberto('dia', m.id))}
            onClick={() => abrirPlano({ tipo: 'dia', id: m.id })}
          >
            <PontosAtividades blocos={m.blocos} />
            <span className="truncate font-semibold">{m.nome}</span>
            <span />
            <small className="col-span-full text-xs text-faint">{resumoBlocos(m.blocos)}</small>
          </button>
        ))}
        {!dados.modelos.length && (
          <p className="mx-1 mt-0.5 mb-1.5 text-[13px] text-mute">
            Um plano para um dia, para aplicares quando quiseres.
          </p>
        )}
      </Cartao>

      <section className="min-w-0 rounded-cartao border border-line bg-surface p-4.5 shadow-cartao">
        {aberto && objeto ? <EditorPlano plano={aberto} objeto={objeto} /> : <Vazio />}
      </section>
    </div>
  );
}
