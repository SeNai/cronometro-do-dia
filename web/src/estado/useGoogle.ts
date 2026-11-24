/*
 * Mantém atualizado o estado da ligação ao Google: no arranque, a cada minuto
 * e sempre que a janela volta a ficar visível.
 */
import { useEffect } from 'react';
import { useLoja } from './loja';

export function useGoogle() {
  const carregado = useLoja(s => s.carregado);
  useEffect(() => {
    if (!carregado) return;
    const ler = () => useLoja.getState().carregarGoogle();
    const aoVoltar = () => !document.hidden && ler();
    ler();
    const id = setInterval(ler, 60_000);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [carregado]);
}
