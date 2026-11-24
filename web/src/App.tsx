/*
 * Componente principal (provisório).
 *
 * Por agora só prova que a ligação funciona: lê os dados e as definições do servidor
 * Python e mostra as atividades. As partes da app (roda, cartões, linha do tempo…)
 * vão ser acrescentadas aqui, uma a uma.
 */
import { useEffect, useState } from 'react';
import { lerConfig, lerDados } from './api';
import type { Atividade, Config } from './tipos';

export default function App() {
  // Estado do componente: quando muda, o React volta a desenhar o ecrã sozinho.
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // useEffect com [] corre uma vez, quando o componente aparece no ecrã.
  useEffect(() => {
    Promise.all([lerDados(), lerConfig()])
      .then(([dados, cfg]) => {
        setAtividades(dados.acts ?? []);
        setConfig(cfg);
      })
      .catch(() =>
        setErro('Não consegui falar com o servidor. Abre a app pelo atalho e volta a carregar esta página.')
      );
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">⏱ Cronómetro do Dia</h1>
      <p className="mb-6 text-mute">Nova interface (React + TypeScript + Tailwind) — em construção.</p>

      {erro && <p className="rounded-cartao bg-surface p-4 text-warn shadow-cartao">{erro}</p>}

      <ul className="grid gap-2">
        {atividades.map(a => (
          <li key={a.id} className="flex items-center gap-3 rounded-cartao bg-surface p-4 shadow-cartao">
            <span
              className="size-3 rounded-full bg-accent"
              style={a.color ? { background: a.color } : undefined}
            />
            <b className="flex-1 font-medium">{a.name}</b>
            <span className="font-num text-mute tabular-nums">meta {a.goal} min</span>
          </li>
        ))}
      </ul>

      {config && (
        <p className="mt-6 text-sm text-faint">
          Dia de {config.inicio_do_dia} a {config.fim_do_dia} · {config.calendarios.length} calendário(s)
        </p>
      )}
    </main>
  );
}
