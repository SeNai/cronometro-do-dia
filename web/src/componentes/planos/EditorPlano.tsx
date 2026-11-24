/*
 * O editor de um plano guardado: cabeçalho (nome, ativar/aplicar, duplicar, apagar),
 * a paleta de atividades para arrastar, os dias da semana (com o menu ⋯) e a grelha.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import {
  apagarPlano,
  aplicarAoDia,
  ativarSemana,
  duplicarPlano,
  mudarNome,
  pedidosAoEditor,
  podeAplicarAoDiaMostrado
} from '../../estado/acoesPlanos';
import { avisar, confirmar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { corDe } from '../../lib/consultas';
import { blocosDoDia } from '../../lib/plano';
import {
  DIAS,
  DIAS_CURTOS,
  ORDEM_SEMANA,
  nBlocos,
  somaMinutos,
  type Coluna,
  type PlanoAberto
} from '../../lib/planos';
import { MIN, curto, rotuloDoDia } from '../../lib/tempo';
import type { Modelo, Semana } from '../../tipos';
import { Botao } from '../ui/Botao';
import { MenuFlutuante } from '../ui/MenuFlutuante';
import { GrelhaPlano, type ColunaDaGrelha } from './GrelhaPlano';
import { MenuDiaDaSemana } from './MenusGrelha';

interface Props {
  plano: PlanoAberto;
  objeto: Modelo | Semana;
}

export function EditorPlano({ plano, objeto }: Props) {
  const dados = useLoja(s => s.dados);
  const dia = useLoja(s => s.dia);
  const eSemana = plano.tipo === 'semana';
  const ativa = eSemana && dados.semanaAtiva === plano.id;
  const [arrastada, setArrastada] = useState<number | null>(null); // atividade a sair da paleta
  const [menuDia, setMenuDia] = useState<{ x: number; y: number; coluna: Coluna } | null>(null);
  const [perguntaAplicar, setPerguntaAplicar] = useState<{ x: number; y: number } | null>(null);

  const colunas: ColunaDaGrelha[] = eSemana
    ? ORDEM_SEMANA.map(d => ({
        chave: String(d) as Coluna,
        blocos: (objeto as Semana).dias[String(d) as keyof Semana['dias']] ?? []
      }))
    : [{ chave: 'd', blocos: (objeto as Modelo).blocos }];
  // plano acabado de criar: cursor no nome, já selecionado, para se escrever logo
  const campoNome = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!pedidosAoEditor.focarNome) return;
    pedidosAoEditor.focarNome = false;
    campoNome.current?.focus();
    campoNome.current?.select();
  }, [plano.tipo, plano.id]);

  const estiloGrelha = { gridTemplateColumns: `46px repeat(${colunas.length}, minmax(0, 1fr))` };

  /** «Aplicar a hoje»: num dia vazio aplica logo; se já tiver blocos, pergunta «Substituir» ou «Juntar». */
  function aplicar(e: MouseEvent<HTMLButtonElement>) {
    const m = objeto as Modelo;
    const problema = podeAplicarAoDiaMostrado();
    if (problema) return avisar(problema);
    if (!m.blocos.length) return avisar('Este plano ainda não tem blocos.');
    if (!blocosDoDia(dados, dia).length) return aplicarAoDia(dia, m.blocos, m.nome, 'substituir');
    const r = e.currentTarget.getBoundingClientRect();
    setPerguntaAplicar({ x: r.left, y: r.bottom + 28 });
  }

  async function apagar() {
    const oQue = eSemana ? 'a semana' : 'o plano';
    if (
      await confirmar(
        `Apagar ${oQue} «${objeto.nome}»? Os planos que já aplicaste aos dias ficam como estão.`
      )
    )
      apagarPlano(plano);
  }

  return (
    <>
      {/* cabeçalho */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="w-full text-[11.5px] tracking-[0.05em] text-faint uppercase">
          {eSemana ? 'Semana' : 'Plano do dia'}
        </span>
        <input
          key={plano.tipo + plano.id + objeto.nome}
          ref={campoNome}
          defaultValue={objeto.nome}
          maxLength={40}
          aria-label="Nome"
          onBlur={e => {
            const nome = e.currentTarget.value.replace(/\s+/g, ' ').trim();
            if (nome && nome !== objeto.nome) mudarNome(plano, nome);
            else e.currentTarget.value = objeto.nome;
          }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="min-w-0 flex-[1_1_200px] rounded-[10px] border border-line bg-surface2 px-[11px] py-[7px] text-[17px] font-[650]"
        />
        {eSemana ? (
          <Botao
            variante={ativa ? 'normal' : 'principal'}
            pequeno
            onClick={() => ativarSemana(ativa ? null : plano.id)}
          >
            {ativa ? '✓ Ativa · desativar' : 'Ativar esta semana'}
          </Botao>
        ) : (
          <Botao
            variante="principal"
            pequeno
            title="Aplica este plano ao dia que está escolhido no topo"
            onClick={aplicar}
          >
            Aplicar a {rotuloDoDia(dia).split(',')[0].toLowerCase()}
          </Botao>
        )}
        <Botao variante="fantasma" pequeno onClick={() => duplicarPlano(plano)}>
          ⧉ Duplicar
        </Botao>
        <Botao variante="fantasma" pequeno className="text-warn" onClick={apagar}>
          🗑 Apagar
        </Botao>
      </div>

      {/* paleta: arrastar atividades para a grelha */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px]">
        <span className="text-[12.5px] text-mute">Arrasta para a grelha:</span>
        {dados.acts.map(a => (
          <span
            key={a.id}
            draggable
            title="Arrasta para um dia"
            onDragStart={e => {
              setArrastada(a.id);
              e.dataTransfer.setData('text/plain', a.name);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDragEnd={() => setArrastada(null)}
            style={{ '--c': corDe(a) } as CSSProperties}
            className="inline-flex cursor-grab items-center gap-1.5 rounded-full border border-line bg-surface2 px-[11px] py-[5px] hover:border-[var(--c)]"
          >
            <span className="size-2 rounded-full bg-[var(--c)]" />
            {a.name}
          </span>
        ))}
        <span className="text-xs text-faint">ou clica (e arrasta) num espaço vazio da grelha</span>
      </div>

      {/* cabeçalho dos dias da semana */}
      {eSemana && (
        <div className="mb-1 grid gap-x-1" style={estiloGrelha}>
          <span />
          {colunas.map(c => (
            <div
              key={c.chave}
              title={DIAS[+c.chave]}
              className="flex min-w-0 items-center gap-1.5 rounded-[9px] bg-surface2 py-1.5 pr-1 pl-2"
            >
              <b className="text-[13px]">{DIAS_CURTOS[+c.chave]}</b>
              <small className="flex-1 truncate text-[11.5px] text-faint">
                {c.blocos.length ? curto(somaMinutos(c.blocos) * MIN) : '—'}
              </small>
              <button
                type="button"
                title={`Opções de ${DIAS[+c.chave].toLowerCase()}`}
                className="cursor-pointer rounded-md px-1.5 text-[15px] leading-tight text-faint hover:bg-surface hover:text-ink"
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setMenuDia({ x: r.left - 120, y: r.bottom + 28, coluna: c.chave });
                }}
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
      )}

      <GrelhaPlano
        plano={plano}
        colunas={colunas}
        arrastada={arrastada}
        aoLargar={() => setArrastada(null)}
      />

      <p className="mt-2.5 text-[13px] text-mute">
        {eSemana
          ? 'Arrasta um bloco para outro dia para o mudar de dia. O ⋯ de cada dia tem opções para copiar ou usar um plano do dia.'
          : 'Arrasta para mover · puxa a base para mudar a duração · clica num bloco para opções.'}
      </p>

      {menuDia && (
        <MenuDiaDaSemana
          x={menuDia.x}
          y={menuDia.y}
          plano={plano}
          coluna={menuDia.coluna}
          nomeSemana={objeto.nome}
          blocos={colunas.find(c => c.chave === menuDia.coluna)?.blocos ?? []}
          aoFechar={() => setMenuDia(null)}
        />
      )}
      {perguntaAplicar && (
        <MenuFlutuante x={perguntaAplicar.x} y={perguntaAplicar.y} aoFechar={() => setPerguntaAplicar(null)}>
          <div className="mx-1 mt-0.5 mb-2 text-[12.5px] text-mute">
            {rotuloDoDia(dia)} já tem {nBlocos(blocosDoDia(dados, dia).length)}.
          </div>
          <div className="flex gap-[5px]">
            {(['substituir', 'juntar'] as const).map(modo => (
              <Botao
                key={modo}
                pequeno
                variante={modo === 'substituir' ? 'principal' : 'normal'}
                onClick={() => {
                  setPerguntaAplicar(null);
                  aplicarAoDia(dia, (objeto as Modelo).blocos, objeto.nome, modo);
                }}
              >
                {modo === 'substituir' ? 'Substituir' : 'Juntar'}
              </Botao>
            ))}
          </div>
        </MenuFlutuante>
      )}
    </>
  );
}
