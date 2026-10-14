// ============================================================
// BENEDIZIONI - funzionano come le abilità (stessa scheda, stessa
// formula in statistiche.js), ma arrivano in momenti speciali:
//
//  - MALEDETTE: le lascia il mini boss. Forti, ma con un prezzo.
//    Al loro posto si può scegliere Riposo.
//  - DIVINE: solo dopo aver sconfitto un boss. Nessun prezzo.
//  - PREMI: dopo un round senza danni. Piccoli e sempre utili.
//
// "alPrendere" (facoltativo) è un effetto immediato, una volta sola.
// ============================================================

// I numeri stanno in BENEDIZIONI (config.js); percentuale() è in abilita.js

const MALEDETTE = [
  {
    id: 'patto', nome: 'Patto di sangue', max: 1,
    descrizione: () => 'Danno +' + percentuale(BENEDIZIONI.patto.danno - 1) + '%\nma ogni uccisione ti costa ' + BENEDIZIONI.patto.vitaPerUccisione + ' vita',
    applica: (s) => { s.dannoMolt *= BENEDIZIONI.patto.danno; s.vitaPerUccisione += BENEDIZIONI.patto.vitaPerUccisione; },
  },
  {
    id: 'furiacieca', nome: 'Furia cieca', max: 1,
    descrizione: () => 'Spari il ' + percentuale(1 - BENEDIZIONI.furiacieca.cadenza) + '% più veloce\nma metà delle frecce va dove capita',
    applica: (s) => { s.cadenzaMs *= BENEDIZIONI.furiacieca.cadenza; s.colpiACaso = BENEDIZIONI.furiacieca.colpiACaso; },
  },
  {
    id: 'faretrapesante', nome: 'Faretra pesante', max: 1,
    descrizione: () => '+' + BENEDIZIONI.faretrapesante.frecce + ' frecce nella faretra\nma con più di metà faretra ti muovi il ' + percentuale(1 - BENEDIZIONI.faretrapesante.velocitaSePiena) + '% più lento',
    applica: (s) => { s.frecceFaretra += BENEDIZIONI.faretrapesante.frecce; s.velocitaSePiena = BENEDIZIONI.faretrapesante.velocitaSePiena; },
  },
  {
    id: 'occhidibrace', nome: 'Occhi di brace', max: 1,
    descrizione: () => '+' + percentuale(BENEDIZIONI.occhidibrace.exp - 1) + '% esperienza\nma i nemici hanno +' + percentuale(BENEDIZIONI.occhidibrace.velocitaNemici - 1) + '% velocità e +' + percentuale(BENEDIZIONI.occhidibrace.vitaNemici - 1) + '% vita',
    applica: (s) => {
      s.expMolt *= BENEDIZIONI.occhidibrace.exp;
      s.velocitaNemiciMolt *= BENEDIZIONI.occhidibrace.velocitaNemici;
      s.vitaNemiciMolt *= BENEDIZIONI.occhidibrace.vitaNemici;
    },
  },
  {
    id: 'miraossessiva', nome: 'Mira ossessiva', max: 1,
    descrizione: () => 'Le frecce puntano da sole il nemico più vicino (' + BENEDIZIONI.miraossessiva.raggio + ' px)\nma spari il ' + percentuale(BENEDIZIONI.miraossessiva.cadenza - 1) + '% più piano e -' + percentuale(1 - BENEDIZIONI.miraossessiva.vitaMax) + '% vita massima',
    applica: (s) => {
      s.raggioMira = Math.max(s.raggioMira, BENEDIZIONI.miraossessiva.raggio);
      s.cadenzaMs *= BENEDIZIONI.miraossessiva.cadenza;
      s.vitaMaxMolt *= BENEDIZIONI.miraossessiva.vitaMax;
    },
  },
  {
    id: 'ultimorespiro', nome: 'Ultimo respiro', max: 1,
    descrizione: () => 'Danno doppio sotto il ' + percentuale(BENEDIZIONI.ultimorespiro.soglia) + '% di vita\nma le cure valgono metà e lì sotto Rigenerazione si ferma',
    applica: (s) => { s.ultimoRespiro = true; s.cureMolt *= BENEDIZIONI.ultimorespiro.cure; },
  },
  {
    id: 'pattofulmine', nome: 'Patto del fulmine', max: 1,
    descrizione: () => 'Il fulmine punitivo colpisce anche i nemici vicini\nma cade dopo solo ' + (BENEDIZIONI.pattofulmine.graziaMs / 1000) + ' s da fermo',
    applica: (s) => { s.fulmineSuNemici = true; s.graziaFulmineMs = BENEDIZIONI.pattofulmine.graziaMs; },
  },
  {
    id: 'ombralenta', nome: 'Ombra lenta', max: 1,
    descrizione: () => 'Dopo la schivata i nemici ti perdono per ' + (BENEDIZIONI.ombralenta.invisibileMs / 1000) + ' s\nma la schivata costa il doppio',
    applica: (s) => { s.costoSchivata *= BENEDIZIONI.ombralenta.costoSchivata; s.invisibileMs = BENEDIZIONI.ombralenta.invisibileMs; },
  },
  {
    id: 'setebattaglia', nome: 'Sete di battaglia', max: 1,
    descrizione: () => 'Ogni uccisione +' + percentuale(BENEDIZIONI.setebattaglia.dannoPerUccisione) + '% danno fino a fine round (max +' + percentuale(BENEDIZIONI.setebattaglia.dannoMassimo) + '%)\nma i nemici arrivano più spesso',
    applica: (s) => { s.setePerUccisione = BENEDIZIONI.setebattaglia.dannoPerUccisione; s.intervalloOndateMolt *= BENEDIZIONI.setebattaglia.intervalloOndate; },
  },
  {
    id: 'corpocenere', nome: 'Corpo di cenere', max: 1,
    descrizione: () => 'La schivata non costa frecce\nma ogni schivata ti toglie il ' + percentuale(BENEDIZIONI.corpocenere.vitaPerSchivata) + '% della vita',
    applica: (s) => { s.schivataDiVita = BENEDIZIONI.corpocenere.vitaPerSchivata; },
  },
];

const DIVINE = [
  {
    id: 'luce', nome: 'Luce ristoratrice', max: 99,
    descrizione: () => 'Ti cura completamente\ne ti dà ' + BENEDIZIONI.luce.scudi + ' scudo overheal',
    applica: () => {},
    alPrendere: (scena) => {
      scena.cura(scena.stats.vitaMax);
      scena.scudiOverheal = Math.min(OVERHEAL_SCUDI_MASSIMI, scena.scudiOverheal + BENEDIZIONI.luce.scudi);
    },
  },
  {
    id: 'vento', nome: 'Grazia del vento', max: 3,
    descrizione: () => 'Ti muovi il ' + percentuale(BENEDIZIONI.vento.velocita) + '% più veloce',
    applica: (s, liv) => { s.velocita *= Math.pow(1 + BENEDIZIONI.vento.velocita, liv); },
  },
  {
    id: 'faretrabenedetta', nome: 'Faretra benedetta', max: 3,
    descrizione: () => '+' + BENEDIZIONI.faretrabenedetta.frecce + ' frecce nella faretra\ne ogni uccisione ti restituisce una freccia',
    applica: (s, liv) => { s.frecceFaretra += BENEDIZIONI.faretrabenedetta.frecce * liv; s.frecceUccisione = BENEDIZIONI.faretrabenedetta.frecceIndietro; },
  },
  {
    id: 'giudizio', nome: 'Lama del giudizio', max: 3,
    descrizione: () => 'Danno +' + percentuale(BENEDIZIONI.giudizio.danno) + '%\ne circa +' + percentuale((1 + BENEDIZIONI.giudizio.danno) * (1 + BENEDIZIONI.giudizio.dannoBoss) - 1) + '% contro boss ed élite',
    applica: (s, liv) => { s.dannoMolt *= Math.pow(1 + BENEDIZIONI.giudizio.danno, liv); s.dannoBossMolt *= Math.pow(1 + BENEDIZIONI.giudizio.dannoBoss, liv); },
  },
  {
    id: 'mira', nome: 'Occhio del cacciatore', max: 1,
    descrizione: () => 'Le frecce puntano da sole il nemico più vicino entro ' + BENEDIZIONI.mira.raggio + ' pixel',
    applica: (s) => { s.raggioMira = Math.max(s.raggioMira, BENEDIZIONI.mira.raggio); },
  },
  {
    id: 'ricaricasacra', nome: 'Ricarica sacra', max: 2,
    descrizione: () => 'La ricarica dura il ' + percentuale(1 - BENEDIZIONI.ricaricasacra.ricarica) + '% in meno\ne quando ricarichi respingi i nemici vicini',
    applica: (s, liv) => { s.ricaricaMs *= Math.pow(BENEDIZIONI.ricaricasacra.ricarica, liv); s.spintaRicarica = true; },
  },
  {
    id: 'secondavita', nome: 'Seconda vita', max: 1,
    descrizione: () => 'Una volta per partita, quando muori\ntorni in vita con il ' + percentuale(BENEDIZIONI.secondavita.vita) + '% della vita',
    applica: (s) => { s.secondaVita = true; },
  },
  {
    id: 'sciavento', nome: 'Scia del vento', max: 1,
    descrizione: () => 'La schivata lascia una scia\nche ferisce i nemici che la toccano',
    applica: (s) => { s.sciaSchivata = true; },
  },
  {
    id: 'calice', nome: 'Calice', max: 1,
    descrizione: () => 'Ogni scudo overheal attivo\nti fa muovere il ' + percentuale(BENEDIZIONI.calice.velocitaPerScudo) + '% più veloce',
    applica: (s) => { s.velocitaPerScudo = BENEDIZIONI.calice.velocitaPerScudo; },
  },
];

const PREMI = [
  {
    id: 'premiocura', nome: 'Respiro', max: 999,
    descrizione: () => 'Recuperi il ' + Math.round(PREMIO.cura * 100) + '% della vita',
    applica: () => {},
    alPrendere: (scena) => { scena.cura(scena.stats.vitaMax * PREMIO.cura); },
  },
  {
    id: 'premiovita', nome: 'Tempra', max: 999,
    descrizione: () => '+' + Math.round(PREMIO.vitaMax * 100) + '% vita massima',
    applica: (s, liv) => { s.vitaMaxMolt *= Math.pow(1 + PREMIO.vitaMax, liv); },
  },
  {
    id: 'premiofrecce', nome: 'Faretra ampia', max: 999,
    descrizione: () => '+' + PREMIO.frecce + ' frecce nella faretra',
    applica: (s, liv) => { s.frecceFaretra += PREMIO.frecce * liv; },
  },
  {
    id: 'premiovelocita', nome: 'Passo svelto', max: 999,
    descrizione: () => 'Ti muovi il ' + Math.round(PREMIO.velocita * 100) + '% più veloce',
    applica: (s, liv) => { s.velocita *= Math.pow(1 + PREMIO.velocita, liv); },
  },
];

// Trova una voce in qualsiasi tabella (serve per "alPrendere")
function trovaVoce(id) {
  return [...ABILITA, ...COMBINAZIONI, ...MALEDETTE, ...DIVINE, ...PREMI].find(v => v.id === id);
}
