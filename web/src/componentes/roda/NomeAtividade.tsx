/*
 * O nome da atividade por baixo da roda. Ao clicar, vira uma caixa de texto para o mudar:
 * Enter (ou sair da caixa) grava, Esc cancela. O nome muda em todo o lado.
 */
import { useRef, useState } from 'react';
import { avisar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import type { Atividade } from '../../tipos';

export function NomeAtividade({ atividade }: { atividade: Atividade | undefined }) {
  const alterar = useLoja(s => s.alterarAtividade);
  const [texto, setTexto] = useState<string | null>(null); // null = não está a editar
  // evita fechar duas vezes (Enter fecha, e logo a seguir o campo perde o foco e dispararia o onBlur)
  const fechado = useRef(true);

  function abrir(nome: string) {
    fechado.current = false;
    setTexto(nome);
  }

  if (!atividade) return <span>Cria uma atividade</span>;

  function fechar(gravar: boolean) {
    if (fechado.current || texto === null || !atividade) return;
    fechado.current = true;
    const limpo = texto.replace(/\s+/g, ' ').trim();
    setTexto(null);
    if (gravar && limpo && limpo !== atividade.name) {
      alterar(atividade.id, { name: limpo });
      avisar(`Nome mudado para «${limpo}».`);
    }
  }

  if (texto !== null)
    return (
      <input
        autoFocus
        onFocus={e => e.target.select()}
        value={texto}
        maxLength={40}
        spellCheck={false}
        aria-label="Nome da atividade"
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') fechar(true);
          else if (e.key === 'Escape') fechar(false);
        }}
        onBlur={() => fechar(true)}
        className="w-[min(260px,75%)] rounded-[9px] border-[1.5px] border-[var(--c)] bg-surface2 px-2 py-px text-center text-ink shadow-[0_0_0_4px_color-mix(in_srgb,var(--c)_18%,transparent)] outline-none"
      />
    );

  return (
    <span
      role="button"
      tabIndex={0}
      title="Clica para mudar o nome"
      onClick={() => abrir(atividade.name)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          abrir(atividade.name);
        }
      }}
      className="cursor-text rounded-[9px] px-[7px] py-px outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--c)_12%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--c)_12%,transparent)]"
    >
      {atividade.name}
    </span>
  );
}
