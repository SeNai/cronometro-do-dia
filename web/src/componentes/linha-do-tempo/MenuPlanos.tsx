/*
 * Menu «📋 Planos» da linha do tempo:
 *   - aplicar um plano do dia (ou o programa da semana ativa) ao dia mostrado,
 *     com a escolha «Substituir» / «Juntar» se o dia já tiver blocos;
 *   - escolher a semana ativa;
 *   - ir para o separador Planos para criar e editar.
 */
import { useState, type ReactNode } from 'react';
import { abrirPlano, aplicarAoDia, ativarSemana, mudarVista } from '../../estado/acoesPlanos';
import { useLoja } from '../../estado/loja';
import { blocosDoDia, diaDaSemana, podePlanear } from '../../lib/plano';
import { DIAS, nBlocos, programaDoDia, resumoBlocos, resumoSemana, semanaPorId } from '../../lib/planos';
import { rotuloDoDia } from '../../lib/tempo';
import type { BlocoModelo } from '../../tipos';
import { PontosAtividades } from '../planos/PontosAtividades';
import { Botao } from '../ui/Botao';
import { MenuFlutuante } from '../ui/MenuFlutuante';

interface Opcao {
  chave: string;
  nome: string;
  blocos: BlocoModelo[];
  icone?: string;
}

const estiloLinha =
  'flex w-full cursor-pointer items-center gap-[9px] rounded-[9px] border border-transparent px-[9px] py-[7px] text-left text-sm hover:border-line hover:bg-surface2';
const Rotulo = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 mb-0.5 block text-[11.5px] text-faint">{children}</span>
);

export function MenuPlanos({ x, y, aoFechar }: { x: number; y: number; aoFechar: () => void }) {
  const dados = useLoja(s => s.dados);
  const dia = useLoja(s => s.dia);
  const [aPerguntar, setAPerguntar] = useState<string | null>(null); // opção à espera de «Substituir/Juntar»

  const editavel = podePlanear(dia);
  const ativa = semanaPorId(dados, dados.semanaAtiva);
  const programa = programaDoDia(ativa, dia);
  const jaTem = blocosDoDia(dados, dia).length;
  const opcoes: Opcao[] = [
    ...(ativa && programa.length
      ? [
          {
            chave: 'semana',
            nome: `${ativa.nome} · ${DIAS[diaDaSemana(dia)]}`,
            blocos: programa,
            icone: '📅'
          }
        ]
      : []),
    ...dados.modelos.map(m => ({ chave: 'm' + m.id, nome: m.nome, blocos: m.blocos }))
  ];

  function aplicar(o: Opcao, modo: 'substituir' | 'juntar') {
    aplicarAoDia(dia, o.blocos, o.nome, modo);
    aoFechar();
  }

  return (
    <MenuFlutuante x={x} y={y} aoFechar={aoFechar} largo>
      <div className="mx-1 mt-0.5 mb-2 text-[12.5px] font-bold text-ink">Planos</div>

      {editavel ? (
        <>
          <Rotulo>Aplicar a {rotuloDoDia(dia).toLowerCase()}</Rotulo>
          {opcoes.length === 0 && (
            <div className="px-1.5 pt-0.5 pb-1.5 text-[13px] text-mute">Ainda não tens planos do dia.</div>
          )}
          {opcoes.map(o => (
            <div key={o.chave}>
              <button
                type="button"
                className={estiloLinha}
                onClick={() => (jaTem ? setAPerguntar(o.chave) : aplicar(o, 'substituir'))}
              >
                {o.icone ?? <PontosAtividades blocos={o.blocos} />}
                <span className="min-w-0 flex-1 truncate">{o.nome}</span>
                <small className="text-[11.5px] text-faint">{resumoBlocos(o.blocos)}</small>
              </button>
              {aPerguntar === o.chave && (
                <div className="flex flex-wrap items-center gap-1.5 px-2 pt-1 pb-2 text-[12.5px] text-mute">
                  Este dia já tem {nBlocos(jaTem)}.
                  <Botao variante="principal" pequeno onClick={() => aplicar(o, 'substituir')}>
                    Substituir
                  </Botao>
                  <Botao pequeno onClick={() => aplicar(o, 'juntar')}>
                    Juntar
                  </Botao>
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="px-1.5 pt-0.5 pb-1.5 text-[13px] text-mute">
          Este dia já passou. Escolhe hoje ou um dia à frente para aplicar um plano.
        </div>
      )}

      <div className="mt-2 border-t border-line pt-2">
        <Rotulo>Semana ativa · enche sozinha os dias sem plano</Rotulo>
      </div>
      {[{ id: 0, nome: 'Nenhuma' }, ...dados.semanas].map(w => {
        const escolhida = (dados.semanaAtiva ?? 0) === w.id;
        return (
          <button
            key={w.id}
            type="button"
            className={`${estiloLinha} ${escolhida ? 'border-accent! bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]' : ''}`}
            onClick={() => {
              aoFechar();
              ativarSemana(w.id || null);
            }}
          >
            <span
              className={`size-3 flex-none rounded-full border-[1.5px] ${
                escolhida
                  ? 'border-accent bg-[radial-gradient(var(--accent)_45%,transparent_50%)]'
                  : 'border-faint'
              }`}
            />
            <span className="min-w-0 flex-1 truncate">{w.nome}</span>
            {'dias' in w && <small className="text-[11.5px] text-faint">{resumoSemana(w)}</small>}
          </button>
        );
      })}

      <div className="mt-2 border-t border-line pt-2">
        <Botao
          pequeno
          className="w-full"
          onClick={() => {
            aoFechar();
            if (!useLoja.getState().planoAberto && ativa) abrirPlano({ tipo: 'semana', id: ativa.id });
            mudarVista('planos');
          }}
        >
          ✎ Criar e editar planos
        </Botao>
      </div>
    </MenuFlutuante>
  );
}
