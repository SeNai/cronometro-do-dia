/*
 * O cartão «Atividades»: a grelha de cartões e o botão ✎ Editar.
 *
 * No modo de edição, cada atividade passa a ser uma linha onde se muda a cor, o nome
 * e a meta, e aparece no fim o campo para criar uma atividade nova.
 */
import { useState } from 'react';
import { useLoja } from '../../estado/loja';
import { atividadeNaRoda } from '../../lib/consultas';
import { Botao } from '../ui/Botao';
import { CartaoAtividade } from './CartaoAtividade';
import { COLUNAS_EDICAO, LinhaEdicao } from './LinhaEdicao';

/** Campo + botão para criar uma atividade. */
function NovaAtividade() {
  const adicionar = useLoja(s => s.adicionarAtividade);
  const [nome, setNome] = useState('');

  function criar() {
    const limpo = nome.trim();
    if (!limpo) return;
    adicionar(limpo);
    setNome('');
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={nome}
        onChange={e => setNome(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && criar()}
        placeholder="Nova atividade (ex.: Ginásio)"
        className="min-w-0 flex-1 rounded-[10px] border border-line bg-surface2 px-3 py-2"
      />
      <Botao onClick={criar}>Adicionar</Botao>
    </div>
  );
}

export function CartaoAtividades() {
  const dados = useLoja(s => s.dados);
  const [aEditar, setAEditar] = useState(false);
  const naRoda = atividadeNaRoda(dados);

  return (
    <section className="min-w-0 rounded-cartao border border-line bg-surface p-4.5 shadow-cartao">
      <h2 className="mb-3.5 flex items-center gap-2 text-[13px] font-[650] tracking-[0.04em] text-mute uppercase">
        Atividades
        <span className="flex-1" />
        <Botao
          variante="fantasma"
          pequeno
          className="font-medium tracking-normal text-ink normal-case"
          onClick={() => setAEditar(!aEditar)}
        >
          {aEditar ? '✓ Concluído' : '✎ Editar'}
        </Botao>
      </h2>

      {aEditar ? (
        <>
          <div className="grid gap-2">
            <div
              className={`grid ${COLUNAS_EDICAO} gap-2 pr-2 pl-3 text-[11.5px] tracking-[0.04em] text-faint uppercase`}
            >
              <span />
              <span>Atividade</span>
              <span>Meta diária</span>
              <span />
            </div>
            {dados.acts.map(a => (
              <LinhaEdicao key={a.id} atividade={a} />
            ))}
          </div>
          <NovaAtividade />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {dados.acts.map((a, i) => (
            <CartaoAtividade key={a.id} atividade={a} indice={i} escolhida={naRoda?.id === a.id} />
          ))}
        </div>
      )}
    </section>
  );
}
