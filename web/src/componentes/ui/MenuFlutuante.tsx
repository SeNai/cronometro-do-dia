/*
 * Menu flutuante genérico, que aparece perto de um ponto do ecrã (x, y).
 *
 * - Fecha ao clicar fora ou com Esc.
 * - As teclas 1–9 carregam no 1.º–9.º botão marcado com data-atividade (escolher uma atividade).
 * - Abre à direita do ponto (ou à esquerda, se não couber) e nunca sai do ecrã.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  x: number;
  y: number;
  aoFechar: () => void;
  largo?: boolean;
  children: ReactNode;
}

export function MenuFlutuante({ x, y, aoFechar, largo = false, children }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState({ left: x + 10, top: y - 24 });
  // a função mais recente para fechar (os ouvintes abaixo só são registados uma vez)
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  // depois de desenhado (e antes de aparecer), mede o menu e encosta-o para dentro do ecrã
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    // à direita do rato; se não couber, à esquerda (nunca por baixo do cursor, senão o segundo
    // clique de um duplo clique caía dentro do menu)
    const cabeADireita = x + 10 + w <= innerWidth - 8;
    setPosicao({
      left: cabeADireita ? x + 10 : Math.max(8, x - w - 10),
      top: Math.max(8, Math.min(innerHeight - h - 8, y - 24))
    });
  }, [x, y]);

  useEffect(() => {
    const clicarFora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) fechar.current();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar.current();
      } else if (/^[1-9]$/.test(e.key) && !(e.target as HTMLElement).matches('input')) {
        const botoes = caixa.current?.querySelectorAll<HTMLButtonElement>('[data-atividade]');
        const b = botoes?.[+e.key - 1];
        if (b) {
          e.preventDefault();
          e.stopImmediatePropagation(); // os atalhos gerais (1–9 = começar) não reagem
          b.click();
        }
      }
    };
    // «true» = fase de captura: apanha o clique antes de qualquer outro elemento
    document.addEventListener('pointerdown', clicarFora, true);
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('pointerdown', clicarFora, true);
      document.removeEventListener('keydown', tecla, true);
    };
  }, []);

  return (
    <div
      ref={caixa}
      data-menu-flutuante
      style={posicao}
      className={`fixed z-[9] max-h-[80vh] animate-entrar overflow-auto rounded-[14px] border border-line bg-surface p-2.5 shadow-[0_14px_44px_#0004] ${
        largo ? 'w-[310px]' : 'w-[250px]'
      }`}
    >
      {children}
    </div>
  );
}
