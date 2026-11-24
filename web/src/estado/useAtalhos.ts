/*
 * Atalhos de teclado gerais:
 *   1–9    começa (ou para) a 1.ª–9.ª atividade
 *   Espaço para a atividade que está a correr
 *
 * Não reagem enquanto se escreve num campo, nem com um menu ou uma janela abertos
 * (nos menus do plano, 1–9 escolhem a atividade — ver MenuFlutuante).
 */
import { useEffect } from 'react';
import { useLoja } from './loja';

export function useAtalhos() {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (
        alvo.matches('input, textarea, select') ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        document.querySelector('[data-menu-flutuante], [role="alertdialog"]')
      )
        return;
      const { dados, comecar, parar } = useLoja.getState();
      if (/^[1-9]$/.test(e.key)) {
        const a = dados.acts[+e.key - 1];
        if (a) {
          e.preventDefault();
          comecar(a.id);
        }
      } else if (e.key === ' ' && !alvo.matches('button, [role="button"]')) {
        e.preventDefault();
        parar();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);
}
