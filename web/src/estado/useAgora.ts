/*
 * useAgora(): devolve a hora atual (ms) e atualiza-a a cada segundo.
 *
 * Um componente que use este «hook» é redesenhado de segundo a segundo,
 * que é o que faz o cronómetro andar. Todos os componentes partilham o mesmo relógio.
 */
import { useSyncExternalStore } from 'react';

let agora = Date.now();
const ouvintes = new Set<() => void>();
let intervalo: ReturnType<typeof setInterval> | undefined;

/** O React chama isto quando um componente começa a usar o relógio; devolve a função para deixar de usar. */
function subscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  agora = Date.now();
  // o relógio só corre enquanto houver alguém a usá-lo
  intervalo ??= setInterval(() => {
    agora = Date.now();
    ouvintes.forEach(o => o());
  }, 1000);
  return () => {
    ouvintes.delete(ouvinte);
    if (!ouvintes.size) {
      clearInterval(intervalo);
      intervalo = undefined;
    }
  };
}

export function useAgora(): number {
  return useSyncExternalStore(subscrever, () => agora);
}
