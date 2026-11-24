/*
 * Comunicação com o servidor Python.
 *
 * Cada função corresponde a um endereço da API (ver servidor/rotas.py) e devolve
 * os dados já com o tipo certo, por isso o resto do código não precisa de saber URLs.
 */
import type { Config, Dados, Dia, EstadoGoogle, RespostaEventos } from './tipos';

/** Erro de um pedido à API, com a mensagem que o servidor mandou (se mandou). */
export class ErroApi extends Error {
  readonly estado: number;
  constructor(estado: number, mensagem: string) {
    super(mensagem);
    this.estado = estado;
  }
}

/**
 * Faz um pedido à API. Sem `corpo` é um GET; com `corpo` é um POST em JSON.
 * Os POST levam o cabeçalho «X-App: cronometro», que o servidor exige
 * para que outros sites abertos no browser não consigam escrever nos teus dados.
 */
async function pedir<T>(caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(
    caminho,
    corpo === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-App': 'cronometro' },
          body: JSON.stringify(corpo)
        }
  );
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroApi(resposta.status, json.erro ?? `Erro ${resposta.status}`);
  return json as T;
}

/** Os dados todos (atividades, registo, planos…). */
export const lerDados = () => pedir<Partial<Dados>>('/api/dados');

/** Grava os dados todos. */
export const gravarDados = (dados: Dados) => pedir<{ ok: true }>('/api/dados', dados);

/** As definições. */
export const lerConfig = () => pedir<Config>('/api/config');

/** Altera algumas definições; devolve-as todas já atualizadas. */
export const alterarConfig = (mudancas: Partial<Config>) => pedir<Config>('/api/config', mudancas);

/** Compromissos de um dia. `refrescar` ignora a cache do servidor e volta a descarregar os calendários. */
export const lerEventos = (dia: Dia, refrescar = false) =>
  pedir<RespostaEventos>(`/api/eventos?dia=${dia}${refrescar ? '&refrescar=1' : ''}`);

/** Estado da ligação ao Google. */
export const lerEstadoGoogle = () => pedir<EstadoGoogle>('/api/google/estado');
