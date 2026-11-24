/*
 * Comunicação com o servidor local (app.py): pedidos à API e gravação dos dados.
 */

import { S } from './estado.js';
import { toast } from '../ui/avisos.js';

// Pedido à API local: sem body é GET; com body é POST (com o cabeçalho X-App que o servidor exige).
export async function api(path, body) {
  const o =
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-App': 'cronometro' },
          body: JSON.stringify(body)
        };
  const r = await fetch(path, o);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || 'HTTP ' + r.status);
  return j;
}
export let saveT;
// Grava os dados no servidor, juntando várias alterações seguidas num só pedido (250 ms).
export function save() {
  clearTimeout(saveT);
  saveT = setTimeout(
    () => api('/api/dados', S).catch(() => toast('Não consegui guardar. A app ainda está aberta?', 'warn')),
    250
  );
}
