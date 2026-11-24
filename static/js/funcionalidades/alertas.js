/*
 * Avisos automáticos (corre a cada segundo): fim do tempo da roda, compromissos e blocos do plano.
 */

import { stop } from './cronometro.js';
import { plansOf, startPlan } from './plano.js';
import { save } from '../nucleo/api.js';
import { actById, busy, eventsOf } from '../nucleo/dados.js';
import { CFG, S, alerted } from '../nucleo/estado.js';
import { $, fmtDur, hhmm, todayStr } from '../nucleo/util.js';
import { notify } from '../ui/avisos.js';

// Corre a cada segundo: fim do tempo da roda, avisos antes e no início de compromissos, hora dos blocos do plano.
export function checkAlerts() {
  const now = Date.now(),
    ds = todayStr(),
    av = (+CFG.aviso_minutos || 0) * 60000;
  // fim do tempo escolhido na roda
  const r = S.run;
  if (r && r.target && !r.alerted && now - r.start >= r.target * 60000) {
    r.alerted = true;
    save();
    const a = actById(r.id),
      nm = a ? a.name : '';
    if (CFG.parar_no_fim) {
      stop();
      notify(`Acabou: ${nm}`, `${fmtDur(r.target)} feitos. Parei o cronómetro.`, null, null, 'fim');
    } else notify(`Acabou o tempo: ${nm}`, fmtDur(r.target), 'Parar', stop, 'fim');
  }
  eventsOf(ds)
    .filter(busy)
    .forEach(e => {
      const k = e.inicio + '|' + e.titulo;
      if (av && e.inicio > now && e.inicio - now <= av && !alerted.has('pre' + k)) {
        alerted.add('pre' + k);
        notify(
          `Daqui a ${Math.ceil((e.inicio - now) / 60000)} min: ${e.titulo}`,
          `às ${hhmm(e.inicio)}` + (e.local ? ' · ' + e.local : '')
        );
      }
      if (e.inicio <= now && now - e.inicio < 60000 && !alerted.has('go' + k)) {
        alerted.add('go' + k);
        let msg = '';
        if (S.run && CFG.pausar_em_eventos) {
          const a = actById(S.run.id);
          stop();
          msg = `Pausei "${a ? a.name : ''}".`;
        }
        notify(`Começou: ${e.titulo}`, msg);
      }
    });
  plansOf(ds).forEach(p => {
    const k = 'plan' + p.uid + '|' + p.start;
    if (p.start <= now && now - p.start < 60000 && !alerted.has(k)) {
      alerted.add(k);
      const a = actById(p.id);
      if (a && !(S.run && S.run.id === a.id))
        notify(
          `Hora de: ${a.name}`,
          `até às ${hhmm(p.end)}, segundo o plano`,
          'Começar',
          () => startPlan(p),
          'plano'
        );
    }
  });
}
