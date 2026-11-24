/*
 * Mensagens ao utilizador: toasts, notificações do Windows e a janela de confirmação.
 */

import { $ } from '../nucleo/util.js';
import { playSound } from './sons.js';

// Mensagem no canto do ecrã; opcionalmente com um botão (ex.: «Desfazer»).
export function toast(msg, kind, label, action, ms) {
  const d = document.createElement('div');
  d.className = 'toast' + (kind ? ' ' + kind : '');
  const sp = document.createElement('span');
  sp.textContent = msg;
  d.appendChild(sp);
  if (label) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      action();
      d.remove();
    };
    d.appendChild(b);
  }
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), ms || (label ? 60000 : 6000));
}
// Aviso importante: som + mensagem + notificação do Windows (se a janela estiver escondida).
export function notify(title, body, label, action, kind) {
  playSound(kind || 'aviso');
  toast(title + (body ? ' — ' + body : ''), 'warn', label, action, label ? 60000 : 15000);
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(title, {
        body: body || '',
        tag: title,
        icon: document.querySelector('link[rel=icon]').href
      });
      n.onclick = () => {
        window.focus();
        if (action) action();
        n.close();
      };
    }
  } catch (e) {}
}

export let askCb;
// Janela de confirmação: cb corre se carregares em «Sim».
export function ask(msg, cb) {
  $('askTxt').textContent = msg;
  askCb = cb;
  $('askModal').classList.add('show');
}
$('askNo').onclick = () => $('askModal').classList.remove('show');
$('askYes').onclick = () => {
  $('askModal').classList.remove('show');
  if (askCb) askCb();
};

// O botão «Ativar avisos» só aparece enquanto o browser ainda não pediu autorização.
export function updNotifBtn() {
  const p = 'Notification' in window ? Notification.permission : 'denied';
  $('notifBtn').hidden = p !== 'default';
}
$('notifBtn').onclick = async () => {
  playSound('aviso');
  try {
    await Notification.requestPermission();
  } catch (e) {}
  updNotifBtn();
};
