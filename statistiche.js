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
    vitaNemiciMolt: 1,
    intervalloOndateMolt: 1, // < 1 = i gruppi di nemici arrivano più spesso
    dannoBossMolt: 1,     // danno in più contro boss ed élite
    cureMolt: 1,          // quanto valgono le cure
    // Regole speciali delle benedizioni (0 / false = non attive)
    colpiACaso: 0,        // probabilità che una freccia parta in una direzione a caso
    velocitaSePiena: 1,   // velocità con più di metà faretra
    vitaPerUccisione: 0,
    ultimoRespiro: false,
    intervalloFermoMs: ANTI_FERMO.intervalloMs, // ogni quanto i nemici raggiungono chi sta fermo
    dannoDaFermo: 1,      // Radici di pietra: danno in più restando fermi
    invisibileMs: 0,
    setePerUccisione: 0,
    schivataDiVita: 0,    // > 0 = la schivata costa questa parte di vita invece delle frecce
    recuperoFrecce: 0,    // probabilità di riavere una freccia a ogni uccisione
    ricaricaSuForti: false, // Faretra benedetta: ricarica istantanea uccidendo élite e boss
    frecceInFila: 1,      // Freccia tripla: frecce una dietro l'altra
    costoRaffica: 1,      // frecce consumate da ogni raffica
    spintaRicarica: false,
    secondaVita: false,
    sciaSchivata: false,
    velocitaPerScudo: 0,
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
  // Corpo di cenere: la schivata non costa frecce (unica eccezione al minimo)
  s.costoSchivata = s.schivataDiVita > 0 ? 0 : Math.max(s.costoSchivata, LIMITI.costoSchivataMin);
  s.vitaMax = Math.min(s.vitaMax, LIMITI.vitaMaxMassima);
  s.frecceFaretra = Math.min(Math.round(s.frecceFaretra), LIMITI.faretraMassima);
  return s;
}
