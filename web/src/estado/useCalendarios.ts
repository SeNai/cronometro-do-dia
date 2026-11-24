/*
 * Mantém os compromissos de hoje atualizados: lê-os no arranque e depois a cada 5 minutos.
 * (Quando houver a navegação entre dias, lê também o dia que estiveres a ver.)
 */
import { useEffect } from 'react';
import { hoje } from '../lib/tempo';
import { useLoja } from './loja';

const CINCO_MINUTOS = 5 * 60_000;

export function useCalendarios() {
  const carregado = useLoja(s => s.carregado);
  const carregarEventos = useLoja(s => s.carregarEventos);

  useEffect(() => {
    if (!carregado) return;
    carregarEventos(hoje());
    const id = setInterval(() => carregarEventos(hoje()), CINCO_MINUTOS);
    return () => clearInterval(id); // ao sair, desliga o temporizador
  }, [carregado, carregarEventos]);
}
