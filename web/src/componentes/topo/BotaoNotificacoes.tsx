/*
 * Botão «🔔 Ativar avisos»: pede ao browser autorização para mostrar notificações do Windows.
 * Só aparece enquanto essa autorização ainda não foi pedida.
 */
import { useState } from 'react';
import { useLoja } from '../../estado/loja';
import { tocarSom } from '../../lib/sons';
import { Botao } from '../ui/Botao';

const permissaoAtual = () => ('Notification' in window ? Notification.permission : 'denied');

export function BotaoNotificacoes() {
  const [permissao, setPermissao] = useState(permissaoAtual);
  const config = useLoja(s => s.config);
  if (permissao !== 'default') return null;

  async function pedir() {
    // o clique também «acorda» o áudio do browser, que só toca depois de uma interação
    tocarSom('aviso', config);
    try {
      await Notification.requestPermission();
    } catch {
      // browser sem notificações
    }
    setPermissao(permissaoAtual());
  }

  return <Botao onClick={pedir}>🔔 Ativar avisos</Botao>;
}
