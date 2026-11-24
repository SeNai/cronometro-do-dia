/*
 * O cartão da roda: junta a roda, o nome da atividade, o botão Começar/Parar, a meta e o «a seguir».
 *
 * Define a variável CSS --c com a cor da atividade mostrada; todos os componentes
 * lá dentro usam-na (arcos, botão Parar, barra da meta).
 */
import type { CSSProperties } from 'react';
import { useLoja } from '../../estado/loja';
import { atividadeNaRoda, corDe, corridaNaRoda } from '../../lib/consultas';
import { Botao } from '../ui/Botao';
import { ASeguir } from './ASeguir';
import { MetaDoDia } from './MetaDoDia';
import { NomeAtividade } from './NomeAtividade';
import { OutraACorrer } from './OutraACorrer';
import { Roda } from './Roda';

export function CartaoRoda() {
  const dados = useLoja(s => s.dados);
  const comecar = useLoja(s => s.comecar);
  const parar = useLoja(s => s.parar);

  const atividade = atividadeNaRoda(dados);
  const aCorrer = corridaNaRoda(dados) !== null;
  const cor = corDe(atividade);

  return (
    <section
      style={{ '--c': cor } as CSSProperties}
      className="relative overflow-hidden rounded-cartao border border-line bg-surface px-4.5 pt-5.5 pb-4.5 text-center shadow-cartao"
    >
      {/* brilho suave da cor da atividade, no topo do cartão */}
      <div
        className="pointer-events-none absolute inset-x-[-20%] top-[-40%] h-[80%] transition-[background] duration-500"
        style={{
          background: `radial-gradient(closest-side, color-mix(in srgb, ${cor} 18%, transparent), transparent)`
        }}
      />

      <OutraACorrer />
      <Roda />

      <div className="mt-2.5 flex items-center justify-center gap-2 text-lg font-[650]">
        <span className="size-3 rounded-full" style={{ background: cor }} />
        <NomeAtividade key={atividade?.id} atividade={atividade} />
      </div>

      <div className="mt-3.5 flex justify-center">
        <Botao
          variante={aCorrer ? 'parar' : 'principal'}
          className="relative min-w-[130px] px-4 py-2.5"
          onClick={() => (aCorrer ? parar() : atividade && comecar(atividade.id))}
        >
          {aCorrer ? '■ Parar' : '▶ Começar'}
        </Botao>
      </div>

      <MetaDoDia />
      <ASeguir />
    </section>
  );
}
