// ============================================================
// STATISTICHE - la formula centrale
//
// Parte dai valori base di config.js, applica tutte le abilità prese
// e infine i limiti. La partita usa SOLO il risultato di questa funzione,
// così ogni abilità funziona allo stesso modo e i numeri non sono sparsi.
// ============================================================

function calcolaStatistiche(livelli) {
  const s = {
    velocita: VELOCITA,
    vitaMax: VITA_MAX,
    danno: DANNO_FRECCIA,
    cadenzaMs: CADENZA_MS,
    frecceFaretra: FRECCE_FARETRA,
    costoSchivata: COSTO_SCHIVATA,
    frecceParallele: 0,   // frecce in più una accanto all'altra
    coppieDiagonali: 0,   // coppie di frecce in diagonale
    rimbalzi: 0,
    perforazioni: 0,
    rigenerazione: 0,     // vita recuperata ogni INTERVALLO_RIGENERAZIONE_MS
    scudoMs: 0,           // 0 = nessuno scudo
    raggioMira: 0,        // 0 = niente mira automatica
  };

  for (const a of ABILITA) {
    const liv = livelli[a.id] || 0;
    if (liv > 0) a.applica(s, liv);
  }

  // Limiti finali
  s.cadenzaMs = Math.max(s.cadenzaMs, LIMITI.cadenzaMinMs);
  s.costoSchivata = Math.max(s.costoSchivata, LIMITI.costoSchivataMin);
  s.vitaMax = Math.min(s.vitaMax, LIMITI.vitaMaxMassima);
  return s;
}
