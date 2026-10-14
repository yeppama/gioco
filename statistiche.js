// ============================================================
// STATISTICHE - la formula centrale
//
// Parte dai valori base di config.js, applica tutte le abilità e le
// benedizioni prese, poi i moltiplicatori e infine i limiti.
// La partita usa SOLO il risultato di questa funzione,
// così ogni abilità funziona allo stesso modo e i numeri non sono sparsi.
// ============================================================

function calcolaStatistiche(livelli) {
  const s = {
    velocita: VELOCITA,
    vitaMax: VITA_MAX,
    danno: DANNO_FRECCIA,
    cadenzaMs: CADENZA_MS,
    frecceFaretra: FRECCE_FARETRA,
    ricaricaMs: RICARICA_MS,
    costoSchivata: COSTO_SCHIVATA,
    frecceParallele: 0,   // frecce in più una accanto all'altra
    coppieDiagonali: 0,   // coppie di frecce in diagonale
    rimbalzi: 0,
    perforazioni: 0,
    rigenerazione: 0,     // vita recuperata ogni INTERVALLO_RIGENERAZIONE_MS
    scudoMs: 0,           // 0 = nessuno scudo
    raggioMira: 0,        // 0 = niente mira automatica
    fuocoDanno: 0,        // 0 = frecce normali
    geloRallenta: 0,      // 0 = frecce normali; 0.3 = rallenta del 30%
    lame: 0,              // numero di lame orbitanti
    frecciaGratis: 0,     // probabilità che un colpo non consumi frecce (Casinò)
    tiroCircolare: false, // combinazione Vento della fortuna
    // Moltiplicatori (benedizioni)
    dannoMolt: 1,
    vitaMaxMolt: 1,
    expMolt: 1,
    velocitaNemiciMolt: 1,
    deviazione: 0,        // gradi di deviazione casuale delle frecce
    ultimoRespiro: false,
    rigenerazioneBloccata: false,
  };

  for (const voce of [...ABILITA, ...COMBINAZIONI, ...MALEDETTE, ...DIVINE, ...PREMI]) {
    const liv = livelli[voce.id] || 0;
    if (liv > 0) voce.applica(s, liv);
  }

  // Moltiplicatori alla fine, così valgono anche sui bonus delle abilità
  s.danno = s.danno * s.dannoMolt;
  s.vitaMax = Math.round(s.vitaMax * s.vitaMaxMolt);

  // Limiti finali
  s.cadenzaMs = Math.max(s.cadenzaMs, LIMITI.cadenzaMinMs);
  s.costoSchivata = Math.max(s.costoSchivata, LIMITI.costoSchivataMin);
  s.vitaMax = Math.min(s.vitaMax, LIMITI.vitaMaxMassima);
  s.frecceFaretra = Math.min(Math.round(s.frecceFaretra), LIMITI.faretraMassima);
  return s;
}
