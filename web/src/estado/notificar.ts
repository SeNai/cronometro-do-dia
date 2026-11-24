/*
 * notificar(): o aviso importante (acabou o tempo, vem aí um compromisso, hora de um bloco).
 *
 * Faz três coisas: toca o som escolhido nas Definições, mostra um aviso laranja no canto
 * e, se a janela estiver escondida ou minimizada, mostra também uma notificação do Windows.
 */
import { tocarSom, type TipoSom } from '../lib/sons';
import { avisar } from './avisos';
import { useLoja } from './loja';

interface Opcoes {
  som?: TipoSom;
  /** Botão no aviso (ex.: «Parar», «Começar»). Clicar na notificação do Windows também o executa. */
  botao?: { rotulo: string; acao: () => void };
}

export function notificar(titulo: string, corpo = '', { som = 'aviso', botao }: Opcoes = {}) {
  tocarSom(som, useLoja.getState().config);
  avisar(titulo + (corpo ? ' — ' + corpo : ''), {
    tipo: 'alerta',
    botao,
    duracao: botao ? 60_000 : 15_000
  });
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(titulo, { body: corpo, tag: titulo, icon: '/icone.ico' });
      n.onclick = () => {
        window.focus();
        botao?.acao();
        n.close();
      };
    }
  } catch {
    // alguns browsers não deixam criar notificações aqui: fica só o aviso no canto
  }
}
