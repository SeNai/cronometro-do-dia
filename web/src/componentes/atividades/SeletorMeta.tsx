/*
 * Seletor da meta diária: [ − ] 90 min [ + ]
 *
 * - Os botões somam/tiram 5 min. Carregar e manter repete, cada vez mais depressa.
 * - A roda do rato por cima também muda de 5 em 5.
 * - Também se pode escrever o número diretamente.
 */
import { useEffect, useRef, useState } from 'react';
import { limitar } from '../../lib/tempo';

interface Props {
  valor: number;
  aoMudar: (minutos: number) => void;
}

/** Arredonda aos 5 minutos e mantém entre 0 e 600 (10 horas). */
const ajustar = (m: number) => limitar(Math.round(m / 5) * 5, 0, 600);

export function SeletorMeta({ valor, aoMudar }: Props) {
  // o que está escrito no campo enquanto se escreve (null = mostra o valor verdadeiro)
  const [rascunho, setRascunho] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const repetir = useRef<ReturnType<typeof setTimeout>>(undefined);
  // guarda sempre o valor e a função mais recentes, para a repetição e a roda do rato os usarem
  const atual = useRef({ valor, aoMudar });
  useEffect(() => {
    atual.current = { valor, aoMudar };
  });

  const somar = (n: number) => atual.current.aoMudar(ajustar(atual.current.valor + n));

  // roda do rato: tem de ser um ouvinte «não passivo» para poder impedir o scroll da página
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const rodar = (e: WheelEvent) => {
      e.preventDefault();
      somar(e.deltaY < 0 ? 5 : -5);
    };
    el.addEventListener('wheel', rodar, { passive: false });
    return () => el.removeEventListener('wheel', rodar);
  }, []);

  /** Carregar e manter: soma já, e depois repete cada vez mais depressa. */
  function comecarRepeticao(n: number) {
    somar(n);
    let espera = 400;
    const passo = () => {
      somar(n);
      espera = Math.max(60, espera * 0.8);
      repetir.current = setTimeout(passo, espera);
    };
    repetir.current = setTimeout(passo, espera);
  }
  const pararRepeticao = () => clearTimeout(repetir.current);

  const botao = (n: number, simbolo: string, titulo: string) => (
    <button
      type="button"
      title={titulo}
      className="cursor-pointer touch-manipulation text-xl leading-none transition-colors hover:bg-surface2 active:bg-[color-mix(in_srgb,var(--c)_25%,transparent)]"
      onPointerDown={e => {
        e.preventDefault();
        comecarRepeticao(n);
      }}
      onPointerUp={pararRepeticao}
      onPointerLeave={pararRepeticao}
      onPointerCancel={pararRepeticao}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          somar(n);
        }
      }}
    >
      {simbolo}
    </button>
  );

  /** Aplica o que foi escrito (ao sair do campo ou com Enter). */
  function aplicarTexto() {
    if (rascunho !== null) aoMudar(Math.max(0, Math.round(+rascunho || 0)));
    setRascunho(null);
  }

  return (
    <div
      ref={caixa}
      title="Meta diária (carrega e mantém, ou usa a roda do rato)"
      className="grid h-9 grid-cols-[34px_1fr_34px] overflow-hidden rounded-[10px] border border-line bg-surface focus-within:border-[var(--c)]"
    >
      {botao(-5, '−', 'Menos 5 min')}
      <label className="flex cursor-ns-resize items-center justify-center gap-1 border-x border-line text-[12.5px] text-mute">
        <input
          inputMode="numeric"
          aria-label="Meta diária em minutos"
          value={rascunho ?? String(valor)}
          onChange={e => setRascunho(e.target.value.replace(/\D/g, ''))}
          onFocus={e => e.target.select()}
          onBlur={aplicarTexto}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-[2.2em] bg-transparent text-right text-[15px] font-[650] text-ink tabular-nums outline-none"
        />
        min
      </label>
      {botao(5, '+', 'Mais 5 min')}
    </div>
  );
}
