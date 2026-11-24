/*
 * Os dois menus da coluna Plano:
 *   - MenuNovoBloco: «Que atividade?» depois de clicar (ou arrastar) num espaço vazio;
 *   - MenuBloco: opções de um bloco (começar, duração, trocar de atividade, duplicar, apagar).
 */
import { adicionarBloco, alterarBloco, apagarBloco } from '../../estado/acoesPlano';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe } from '../../lib/consultas';
import { duracaoDeBlocoNovo, fimQueCabe } from '../../lib/plano';
import { MIN, curto, doisDigitos, hoje, horaMinuto, rotuloDoDia } from '../../lib/tempo';
import type { Bloco, Dia } from '../../tipos';
import { Botao } from '../ui/Botao';
import { MenuFlutuante } from '../ui/MenuFlutuante';
import { ListaAtividades } from './ListaAtividades';

/** Pré-visualização de um bloco na linha do tempo enquanto o menu está aberto. */
export interface Previa {
  inicio: number;
  fim: number;
  cor?: string;
  rotulo: string;
}

/** Hook com o que os dois menus precisam: dados, definições e eventos do dia. */
function useContexto(dia: Dia) {
  const dados = useLoja(s => s.dados);
  const config = useLoja(s => s.config);
  const resposta = useLoja(s => s.eventos[dia]);
  return { dados, config, eventos: resposta?.eventos ?? [] };
}

interface PropsNovo {
  x: number;
  y: number;
  dia: Dia;
  inicio: number;
  /** null = só se clicou (a duração vem da meta da atividade escolhida). */
  fim: number | null;
  aoFechar: () => void;
  aoPrever: (previa: Previa) => void;
}

export function MenuNovoBloco({ x, y, dia, inicio, fim, aoFechar, aoPrever }: PropsNovo) {
  const { dados, config, eventos } = useContexto(dia);

  /** Onde acaba o bloco para esta atividade. */
  function fimPara(id: number) {
    if (fim) return fim;
    const a = atividadePorId(dados, id)!;
    return fimQueCabe(dados, eventos, dia, inicio, duracaoDeBlocoNovo(dados, config, a, dia));
  }

  return (
    <MenuFlutuante x={x} y={y} aoFechar={aoFechar}>
      <div className="mx-1 mt-0.5 mb-2 text-[12.5px] text-mute">
        Planear{' '}
        {fim ? (
          <b className="text-ink">
            {horaMinuto(inicio)}–{horaMinuto(fim)}
          </b>
        ) : (
          <>
            às <b className="text-ink">{horaMinuto(inicio)}</b>
          </>
        )}
        {dia !== hoje() && ' · ' + rotuloDoDia(dia)}
        <br />
        Que atividade?
      </div>
      <ListaAtividades
        dia={dia}
        aoPassar={id => {
          const a = atividadePorId(dados, id);
          aoPrever({ inicio, fim: fimPara(id), cor: corDe(a), rotulo: a?.name ?? '' });
        }}
        aoEscolher={id => {
          adicionarBloco(dia, id, inicio, fimPara(id));
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
  dia: Dia;
  bloco: Bloco;
  aoFechar: () => void;
}

export function MenuBloco({ x, y, dia, bloco, aoFechar }: PropsBloco) {
  const { dados, eventos } = useContexto(dia);
  const comecarBloco = useLoja(s => s.comecarBloco);
  const a = atividadePorId(dados, bloco.id);
  const minutos = Math.round((bloco.end - bloco.start) / MIN);
  const agora = useAgora();
  const podeComecar = dia === hoje() && bloco.end > agora;

  /** Executa uma ação e fecha o menu. */
  const e = (acao: () => void) => () => {
    acao();
    aoFechar();
  };

  return (
    <MenuFlutuante x={x} y={y} aoFechar={aoFechar}>
      <div className="mx-1 mt-0.5 mb-2 text-[12.5px] text-mute">
        <b className="text-ink">{a?.name ?? '?'}</b> · {horaMinuto(bloco.start)}–{horaMinuto(bloco.end)} (
        {curto(bloco.end - bloco.start)})
      </div>

      {podeComecar && (
        <Botao
          variante="principal"
          pequeno
          autoFocus
          className="mb-2 w-full"
          onClick={e(() => comecarBloco(bloco))}
        >
          ▶ Começar agora
        </Botao>
      )}

      <div className="flex flex-wrap gap-[5px]">
        <span className="mx-0.5 mb-0.5 w-full text-[11.5px] text-faint">Duração</span>
        {DURACOES.map(m => (
          <Botao
            key={m}
            pequeno
            className={`rounded-lg px-[9px] py-[3px] text-[12.5px] ${m === minutos ? 'border-accent text-accent' : ''}`}
            onClick={e(() =>
              alterarBloco(dia, bloco.uid, {
                end: fimQueCabe(dados, eventos, dia, bloco.start, m, bloco.uid)
              })
            )}
          >
            {nomeDuracao(m)}
          </Botao>
        ))}
      </div>

      <div className="mt-2 border-t border-line pt-2">
        <span className="mx-0.5 mb-0.5 block text-[11.5px] text-faint">Trocar de atividade</span>
      </div>
      <ListaAtividades
        dia={dia}
        atualId={bloco.id}
        focar={podeComecar ? 'nenhuma' : 'atual'}
        excetoUid={bloco.uid}
        aoEscolher={id => e(() => alterarBloco(dia, bloco.uid, { id }))()}
      />

      <div className="mt-2 flex border-t border-line pt-2">
        <Botao
          variante="fantasma"
          pequeno
          onClick={e(() => {
            const inicio = bloco.end + 5 * MIN;
            adicionarBloco(dia, bloco.id, inicio, fimQueCabe(dados, eventos, dia, inicio, minutos));
          })}
        >
          ⧉ Duplicar a seguir
        </Botao>
        <span className="flex-1" />
        <Botao
          variante="fantasma"
          pequeno
          className="text-warn"
          onClick={e(() => apagarBloco(dia, bloco.uid))}
        >
          🗑 Apagar
        </Botao>
      </div>
    </MenuFlutuante>
  );
}
