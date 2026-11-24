/*
 * Menus da grelha do editor de planos:
 *   - MenuNovoBlocoGuardado: «Que atividade?» para um bloco novo;
 *   - MenuBlocoGuardado: duração, trocar de atividade, duplicar, apagar;
 *   - MenuDiaDaSemana (o ⋯ de cada dia): usar um plano do dia, copiar para outros dias,
 *     guardar como plano do dia, limpar.
 */
import type { ReactNode } from 'react';
import { copiarDia, mudarColuna } from '../../estado/acoesPlanos';
import { avisar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe } from '../../lib/consultas';
import {
  DIAS,
  duracaoNoModelo,
  fimQueCabeNoModelo,
  horaDeMinutos,
  nBlocos,
  proximoId,
  resumoBlocos,
  somaMinutos,
  type Coluna,
  type PlanoAberto
} from '../../lib/planos';
import { MIN, curto, doisDigitos } from '../../lib/tempo';
import type { BlocoModelo } from '../../tipos';
import { ListaAtividades } from '../linha-do-tempo/ListaAtividades';
import { Botao } from '../ui/Botao';
import { MenuFlutuante } from '../ui/MenuFlutuante';
import { PontosAtividades } from './PontosAtividades';

/** Pré-visualização de um bloco na grelha (coluna, minutos, cor e texto). */
export interface PreviaGrelha {
  ci: number;
  s: number;
  e: number;
  cor?: string;
  rotulo: string;
}

const Titulo = ({ children }: { children: ReactNode }) => (
  <div className="mx-1 mt-0.5 mb-2 text-[12.5px] text-mute">{children}</div>
);
const Seccao = ({ titulo, children }: { titulo?: string; children?: ReactNode }) => (
  <div className="mt-2 flex flex-wrap gap-[5px] border-t border-line pt-2">
    {titulo && <span className="mx-0.5 mb-0.5 w-full text-[11.5px] text-faint">{titulo}</span>}
    {children}
  </div>
);

interface PropsNovo {
  x: number;
  y: number;
  plano: PlanoAberto;
  coluna: Coluna;
  ci: number;
  blocos: BlocoModelo[];
  s: number;
  e: number | null;
  aoFechar: () => void;
  aoPrever: (p: PreviaGrelha) => void;
}

export function MenuNovoBlocoGuardado({
  x,
  y,
  plano,
  coluna,
  ci,
  blocos,
  s,
  e,
  aoFechar,
  aoPrever
}: PropsNovo) {
  const dados = useLoja(st => st.dados);
  const blocoMax = useLoja(st => st.config.bloco_max_min);
  const fimPara = (id: number) =>
    e ?? fimQueCabeNoModelo(blocos, s, duracaoNoModelo(atividadePorId(dados, id)?.goal, blocoMax));

  return (
    <MenuFlutuante x={x} y={y} aoFechar={aoFechar}>
      <Titulo>
        Novo bloco{' '}
        {e ? (
          <b className="text-ink">
            {horaDeMinutos(s)}–{horaDeMinutos(e)}
          </b>
        ) : (
          <>
            às <b className="text-ink">{horaDeMinutos(s)}</b>
          </>
        )}
        <br />
        Que atividade?
      </Titulo>
      <ListaAtividades
        aoPassar={id => {
          const a = atividadePorId(dados, id);
          aoPrever({ ci, s, e: fimPara(id), cor: corDe(a), rotulo: a?.name ?? '' });
        }}
        aoEscolher={id => {
          const fim = fimPara(id);
          mudarColuna(plano, coluna, bs => [...bs, { id, s, e: fim }]);
          aoFechar();
        }}
      />
    </MenuFlutuante>
  );
}

const DURACOES = [15, 30, 45, 60, 90, 120];
const nomeDuracao = (m: number) =>
  m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? doisDigitos(m % 60) : '');

interface PropsBloco {
  x: number;
  y: number;
  plano: PlanoAberto;
  coluna: Coluna;
  blocos: BlocoModelo[];
  indice: number;
  aoFechar: () => void;
}

export function MenuBlocoGuardado({ x, y, plano, coluna, blocos, indice, aoFechar }: PropsBloco) {
  const dados = useLoja(st => st.dados);
  const b = blocos[indice];
  if (!b) return null;
  const a = atividadePorId(dados, b.id);
  const duracao = b.e - b.s;
  const mudar = (f: (bs: BlocoModelo[]) => BlocoModelo[]) => () => {
    mudarColuna(plano, coluna, f);
    aoFechar();
  };
  const trocar = (campos: Partial<BlocoModelo>) => (bs: BlocoModelo[]) =>
    bs.map((x, i) => (i === indice ? { ...x, ...campos } : x));

  return (
    <MenuFlutuante x={x} y={y} aoFechar={aoFechar}>
      <Titulo>
        <b className="text-ink">{a?.name ?? '?'}</b> · {horaDeMinutos(b.s)}–{horaDeMinutos(b.e)}
      </Titulo>
      <div className="flex flex-wrap gap-[5px]">
        <span className="mx-0.5 mb-0.5 w-full text-[11.5px] text-faint">Duração</span>
        {DURACOES.map(m => (
          <Botao
            key={m}
            pequeno
            className={`rounded-lg px-[9px] py-[3px] text-[12.5px] ${m === duracao ? 'border-accent text-accent' : ''}`}
            onClick={mudar(trocar({ e: fimQueCabeNoModelo(blocos, b.s, m, indice) }))}
          >
            {nomeDuracao(m)}
          </Botao>
        ))}
      </div>
      <Seccao titulo="Trocar de atividade" />
      <ListaAtividades atualId={b.id} focar="atual" aoEscolher={id => mudar(trocar({ id }))()} />
      <Seccao>
        <Botao
          variante="fantasma"
          pequeno
          onClick={mudar(bs => {
            const s = Math.min(1435, b.e + 5);
            return [...bs, { id: b.id, s, e: fimQueCabeNoModelo(bs, s, duracao) }];
          })}
        >
          ⧉ Duplicar a seguir
        </Botao>
        <span className="flex-1" />
        <Botao
          variante="fantasma"
          pequeno
          className="text-warn"
          onClick={mudar(bs => bs.filter((_, i) => i !== indice))}
        >
          🗑 Apagar
        </Botao>
      </Seccao>
    </MenuFlutuante>
  );
}

interface PropsDia {
  x: number;
  y: number;
  plano: PlanoAberto;
  coluna: Coluna;
  nomeSemana: string;
  blocos: BlocoModelo[];
  aoFechar: () => void;
}

export function MenuDiaDaSemana({ x, y, plano, coluna, nomeSemana, blocos, aoFechar }: PropsDia) {
  const modelos = useLoja(st => st.dados.modelos);
  const d = +coluna;
  const vazio = !blocos.length;
  const copiarPara = (dias: string[]) => () => {
    copiarDia(plano, coluna, dias);
    aoFechar();
  };

  return (
    <MenuFlutuante x={x} y={y} aoFechar={aoFechar}>
      <Titulo>
        <b className="text-ink">{DIAS[d]}</b> ·{' '}
        {vazio ? 'vazio' : `${nBlocos(blocos.length)} · ${curto(somaMinutos(blocos) * MIN)}`}
      </Titulo>

      {modelos.length > 0 && (
        <>
          <span className="mx-0.5 mb-0.5 block text-[11.5px] text-faint">Usar um plano do dia</span>
          {modelos.map(m => (
            <button
              key={m.id}
              type="button"
              className="flex w-full cursor-pointer items-center gap-[9px] rounded-[9px] border border-transparent px-[9px] py-[7px] text-left text-sm hover:border-line hover:bg-surface2"
              onClick={() => {
                mudarColuna(plano, coluna, () => m.blocos.map(b => ({ ...b })));
                aoFechar();
              }}
            >
              <PontosAtividades blocos={m.blocos} />
              <span className="min-w-0 flex-1 truncate">{m.nome}</span>
              <small className="text-[11.5px] text-faint">{resumoBlocos(m.blocos)}</small>
            </button>
          ))}
        </>
      )}

      <Seccao titulo={`Copiar ${DIAS[d].split('-')[0].toLowerCase()} para…`}>
        <Botao pequeno disabled={vazio} onClick={copiarPara(['1', '2', '3', '4', '5'])}>
          Dias úteis
        </Botao>
        <Botao pequeno disabled={vazio} onClick={copiarPara(['0', '1', '2', '3', '4', '5', '6'])}>
          Todos
        </Botao>
        <Botao pequeno disabled={vazio} onClick={copiarPara(['0', '6'])}>
          Fim de semana
        </Botao>
      </Seccao>

      <Seccao>
        {!vazio && (
          <Botao
            variante="fantasma"
            pequeno
            onClick={() => {
              const nome = `${nomeSemana} · ${DIAS[d]}`;
              useLoja.setState(s => {
                s.dados.modelos.push({
                  id: proximoId(s.dados.modelos),
                  nome,
                  blocos: blocos.map(b => ({ ...b }))
                });
              });
              aoFechar();
              avisar(`Guardado como plano do dia «${nome}».`);
            }}
          >
            💾 Guardar como plano do dia
          </Botao>
        )}
        <span className="flex-1" />
        <Botao
          variante="fantasma"
          pequeno
          className="text-warn"
          disabled={vazio}
          onClick={() => {
            const antes = blocos.map(b => ({ ...b }));
            mudarColuna(plano, coluna, () => []);
            aoFechar();
            avisar(`${DIAS[d]} limpo.`, {
              botao: { rotulo: 'Desfazer', acao: () => mudarColuna(plano, coluna, () => antes) },
              duracao: 8000
            });
          }}
        >
          Limpar
        </Botao>
      </Seccao>
    </MenuFlutuante>
  );
}
