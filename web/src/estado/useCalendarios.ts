/*
 * Mantém os compromissos atualizados: no arranque e depois a cada 5 minutos,
 * lê os de hoje e os do dia mostrado na linha do tempo (se for outro).
 */
import { useEffect } from 'react';
import { hoje } from '../lib/tempo';
import { useLoja } from './loja';

const CINCO_MINUTOS = 5 * 60_000;

export function useCalendarios() {
  const carregado = useLoja(s => s.carregado);

  useEffect(() => {
    if (!carregado) return;
    const ler = () => {
      const { dia, carregarEventos } = useLoja.getState();
      carregarEventos(hoje());
      if (dia !== hoje()) carregarEventos(dia);
    };
    ler();
    const id = setInterval(ler, CINCO_MINUTOS);
    return () => clearInterval(id); // ao sair, desliga o temporizador
  }, [carregado]);
}
