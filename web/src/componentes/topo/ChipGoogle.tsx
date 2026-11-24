/*
 * Chip «✓ Google» no topo: aparece quando os blocos estão a ser enviados para o Google Calendar
 * («⚠ Google» se houver um erro). Ao clicar, abre as Definições.
 */
import { useLoja } from '../../estado/loja';
import { horaMinuto } from '../../lib/tempo';

export function ChipGoogle() {
  const g = useLoja(s => s.google);
  if (!g || !g.escrever || !g.ligado) return null;
  const titulo =
    g.erro ||
    'A enviar blocos para o Google Calendar' + (g.ultimo ? ` · último envio às ${horaMinuto(g.ultimo)}` : '');
  return (
    <button
      type="button"
      title={titulo}
      onClick={() => useLoja.setState({ definicoesAbertas: true })}
      className={`cursor-pointer rounded-full border px-[9px] py-[3px] text-xs ${
        g.erro
          ? 'border-[color-mix(in_srgb,var(--warn)_50%,transparent)] text-warn'
          : 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] text-accent'
      }`}
    >
      {g.erro ? '⚠ Google' : '✓ Google'}
    </button>
  );
}
