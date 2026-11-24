/*
 * Mensagens ao utilizador: avisos no canto do ecrã («toasts») e a janela «Tens a certeza?».
 *
 * Podem ser chamadas de qualquer sítio (componentes ou ações da loja):
 *
 *     avisar('Nome mudado.');
 *     avisar('Bloco apagado.', { botao: { rotulo: 'Desfazer', acao: () => … } });
 *     if (await confirmar('Remover «Estudo»?')) { … }
 *
 * Os componentes <Avisos/> e <Confirmacao/> (em componentes/ui) é que os desenham.
 */
import { create } from 'zustand';

export interface Aviso {
  id: number;
  texto: string;
  /** 'alerta' = cor de aviso (laranja). */
  tipo?: 'alerta';
  botao?: { rotulo: string; acao: () => void };
}

interface PedidoConfirmacao {
  texto: string;
  responder: (sim: boolean) => void;
}

interface EstadoAvisos {
  avisos: Aviso[];
  confirmacao: PedidoConfirmacao | null;
  fechar: (id: number) => void;
}

export const useAvisos = create<EstadoAvisos>()(set => ({
  avisos: [],
  confirmacao: null,
  fechar: id => set(s => ({ avisos: s.avisos.filter(a => a.id !== id) }))
}));

let proximoId = 1;

/** Mostra um aviso no canto. Fecha-se sozinho (6 s; 60 s se tiver botão; ou `duracao` em ms). */
export function avisar(texto: string, opcoes: Omit<Aviso, 'id' | 'texto'> & { duracao?: number } = {}) {
  const { duracao, ...resto } = opcoes;
  const id = proximoId++;
  useAvisos.setState(s => ({ avisos: [...s.avisos, { id, texto, ...resto }] }));
  setTimeout(() => useAvisos.getState().fechar(id), duracao ?? (resto.botao ? 60_000 : 6000));
}

/** Abre a janela de confirmação e espera pela resposta: true = «Sim». */
export function confirmar(texto: string): Promise<boolean> {
  return new Promise(resolve =>
    useAvisos.setState({
      confirmacao: {
        texto,
        responder: sim => {
          useAvisos.setState({ confirmacao: null });
          resolve(sim);
        }
      }
    })
  );
}
