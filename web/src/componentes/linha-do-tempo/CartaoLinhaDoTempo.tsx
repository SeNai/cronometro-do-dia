/*
 * O cartão «Linha do tempo»: título com o dia, botões «✨ Preencher» e «Limpar plano»,
 * o resumo das metas, os eventos de dia inteiro, os nomes das colunas e a linha do tempo.
 */
import { limparPlano, preencherODia } from '../../estado/acoesPlano';
import { useLoja } from '../../estado/loja';
import { blocosDoDia, podePlanear } from '../../lib/plano';
import { hoje, rotuloDoDia } from '../../lib/tempo';
import { Botao } from '../ui/Botao';
import { Cartao } from '../ui/Cartao';
import { LinhaDoTempo } from './LinhaDoTempo';
import { ResumoPlano } from './ResumoPlano';

export function CartaoLinhaDoTempo() {
  const dia = useLoja(s => s.dia);
  const temBlocos = useLoja(s => blocosDoDia(s.dados, s.dia).length > 0);
  const resposta = useLoja(s => s.eventos[s.dia]);
  const diaTodo = (resposta?.eventos ?? []).filter(e => e.diaTodo);
  const editavel = podePlanear(dia);
  const eHoje = dia === hoje();

  return (
    <Cartao
      titulo={
        <span>
          Linha do tempo
          {!eHoje && (
            <span className="ml-1.5 font-medium tracking-normal text-ink normal-case">
              · {rotuloDoDia(dia)}
            </span>
          )}
        </span>
      }
      acoes={
        editavel && (
          <>
            <Botao
              pequeno
              title="Encaixa as metas que faltam nos espaços livres, sem mexer nos blocos que já tens"
              onClick={() => preencherODia(dia)}
            >
              {eHoje ? '✨ Preencher o resto do dia' : '✨ Preencher o dia'}
            </Botao>
            {temBlocos && (
              <Botao variante="fantasma" pequeno onClick={() => limparPlano(dia)}>
                Limpar plano
              </Botao>
            )}
          </>
        )
      }
    >
      <ResumoPlano />
      {diaTodo.length > 0 && (
        <div className="mb-1.5 text-[13px]">
          {diaTodo.map(e => (
            <span
              key={e.titulo}
              className="mr-1 mb-1 inline-block rounded-md border-l-[3px] border-evb bg-ev px-2 py-0.5"
            >
              {e.titulo}
            </span>
          ))}
        </div>
      )}
      <div className="mb-1.5 grid grid-cols-[50px_1fr_1fr_1fr] text-[11.5px] tracking-[0.05em] text-faint uppercase">
        <span />
        <span className="pl-1.5">Agenda</span>
        <span className="pl-1.5">Feito</span>
        <span className="pl-1.5">Plano</span>
      </div>
      <LinhaDoTempo />
    </Cartao>
  );
}
