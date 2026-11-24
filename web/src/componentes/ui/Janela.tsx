/*
 * Janela por cima da app (fundo escurecido), usada nas Definições e no «copiar resumo».
 * Fecha com Esc ou ao clicar fora.
 */
import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  aoFechar: () => void;
  /** Largura máxima em píxeis (por omissão 620). */
  largura?: number;
  children: ReactNode;
  rotulo?: string;
}

export function Janela({ aoFechar, largura = 620, children, rotulo }: Props) {
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar.current();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]"
      onPointerDown={e => e.target === e.currentTarget && aoFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        style={{ maxWidth: largura }}
        className="max-h-[90vh] w-full overflow-auto rounded-[20px] border border-line bg-surface p-5.5 shadow-[0_20px_60px_#0006]"
      >
        {children}
      </div>
    </div>
  );
}
