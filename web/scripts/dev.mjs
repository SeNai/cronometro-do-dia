/*
 * `npm run dev`: liga tudo o que é preciso para desenvolver a interface.
 *
 * 1. Verifica se o servidor Python (porta 8765) está a correr; se não estiver, arranca-o.
 * 2. Arranca o Vite (http://localhost:5173).
 * 3. Enquanto o Vite corre, de 30 em 30 s:
 *    - dá sinal de vida ao servidor (senão, se foi aberto pelo atalho, desliga-se sozinho
 *      5 minutos depois de fechares a janela da app);
 *    - se o servidor tiver ido abaixo, volta a arrancá-lo.
 * Ao parar (Ctrl+C), desliga o servidor que este script arrancou.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = join(WEB, '..');
const PING = 'http://127.0.0.1:8765/api/ping';

/** O Python do ambiente do projeto (.venv); se não existir, o do sistema. */
function caminhoPython() {
  const opcoes = [join(RAIZ, '.venv', 'Scripts', 'python.exe'), join(RAIZ, '.venv', 'bin', 'python')];
  return opcoes.find(existsSync) ?? (process.platform === 'win32' ? 'python' : 'python3');
}

/** O servidor Python responde? */
async function servidorLigado() {
  try {
    const r = await fetch(PING, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

let servidor = null; // o processo do servidor, se fomos nós a arrancá-lo

async function garantirServidor() {
  if (await servidorLigado()) return;
  if (servidor && servidor.exitCode === null) return; // ainda a arrancar
  console.log('[dev] A ligar o servidor Python…');
  servidor = spawn(caminhoPython(), ['-m', 'servidor', '--sem-browser'], { cwd: RAIZ, stdio: 'inherit' });
  servidor.on('error', e => console.error('[dev] Não consegui arrancar o Python:', e.message));
  for (let i = 0; i < 20 && !(await servidorLigado()); i++) await new Promise(r => setTimeout(r, 250));
  console.log(
    (await servidorLigado())
      ? '[dev] Servidor Python ligado em :8765'
      : '[dev] O servidor Python não respondeu.'
  );
}

await garantirServidor();
const vigia = setInterval(garantirServidor, 30_000);

const vite = spawn(process.execPath, [join(WEB, 'node_modules', 'vite', 'bin', 'vite.js')], {
  cwd: WEB,
  stdio: 'inherit'
});

function sair(codigo = 0) {
  clearInterval(vigia);
  if (servidor && servidor.exitCode === null) servidor.kill();
  if (vite.exitCode === null) vite.kill();
  process.exit(codigo);
}
vite.on('exit', codigo => sair(codigo ?? 0));
process.on('SIGINT', () => sair(0));
process.on('SIGTERM', () => sair(0));
