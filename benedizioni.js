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

const B = BENEDIZIONI; // abbreviazione: i numeri stanno in config.js
const perc = (x) => Math.round(x * 100); // 0.35 -> 35

const MALEDETTE = [
  {
    id: 'patto', nome: 'Patto di sangue', max: 1,
    descrizione: () => 'Danno +' + perc(B.patto.danno - 1) + '%\nma ogni uccisione ti costa ' + B.patto.vitaPerUccisione + ' vita',
    applica: (s) => { s.dannoMolt *= B.patto.danno; s.vitaPerUccisione += B.patto.vitaPerUccisione; },
  },
  {
    id: 'furiacieca', nome: 'Furia cieca', max: 1,
    descrizione: () => 'Spari il ' + perc(1 - B.furiacieca.cadenza) + '% più veloce\nma metà delle frecce va dove capita',
    applica: (s) => { s.cadenzaMs *= B.furiacieca.cadenza; s.colpiACaso = B.furiacieca.colpiACaso; },
  },
  {
    id: 'faretrapesante', nome: 'Faretra pesante', max: 1,
    descrizione: () => '+' + B.faretrapesante.frecce + ' frecce nella faretra\nma con più di metà faretra ti muovi il ' + perc(1 - B.faretrapesante.velocitaSePiena) + '% più lento',
    applica: (s) => { s.frecceFaretra += B.faretrapesante.frecce; s.velocitaSePiena = B.faretrapesante.velocitaSePiena; },
  },
  {
    id: 'occhidibrace', nome: 'Occhi di brace', max: 1,
    descrizione: () => '+' + perc(B.occhidibrace.exp - 1) + '% esperienza\nma i nemici hanno +' + perc(B.occhidibrace.velocitaNemici - 1) + '% velocità e +' + perc(B.occhidibrace.vitaNemici - 1) + '% vita',
    applica: (s) => {
      s.expMolt *= B.occhidibrace.exp;
      s.velocitaNemiciMolt *= B.occhidibrace.velocitaNemici;
      s.vitaNemiciMolt *= B.occhidibrace.vitaNemici;
    },
  },
  {
    id: 'miraossessiva', nome: 'Mira ossessiva', max: 1,
    descrizione: () => 'Le frecce puntano da sole il nemico più vicino (' + B.miraossessiva.raggio + ' px)\nma spari il ' + perc(B.miraossessiva.cadenza - 1) + '% più piano e -' + perc(1 - B.miraossessiva.vitaMax) + '% vita massima',
    applica: (s) => {
      s.raggioMira = Math.max(s.raggioMira, B.miraossessiva.raggio);
      s.cadenzaMs *= B.miraossessiva.cadenza;
      s.vitaMaxMolt *= B.miraossessiva.vitaMax;
    },
  },
  {
    id: 'ultimorespiro', nome: 'Ultimo respiro', max: 1,
    descrizione: () => 'Danno doppio sotto il ' + perc(B.ultimorespiro.soglia) + '% di vita\nma le cure valgono metà e lì sotto Rigenerazione si ferma',
    applica: (s) => { s.ultimoRespiro = true; s.cureMolt *= B.ultimorespiro.cure; },
  },
  {
    id: 'pattofulmine', nome: 'Patto del fulmine', max: 1,
    descrizione: () => 'Il fulmine punitivo colpisce anche i nemici vicini\nma cade dopo solo ' + (B.pattofulmine.graziaMs / 1000) + ' s da fermo',
    applica: (s) => { s.fulmineSuNemici = true; s.graziaFulmineMs = B.pattofulmine.graziaMs; },
  },
  {
    id: 'ombralenta', nome: 'Ombra lenta', max: 1,
    descrizione: () => 'Dopo la schivata i nemici ti perdono per ' + (B.ombralenta.invisibileMs / 1000) + ' s\nma la schivata costa il doppio',
    applica: (s) => { s.costoSchivata *= B.ombralenta.costoSchivata; s.invisibileMs = B.ombralenta.invisibileMs; },
  },
  {
    id: 'setebattaglia', nome: 'Sete di battaglia', max: 1,
    descrizione: () => 'Ogni uccisione +' + perc(B.setebattaglia.dannoPerUccisione) + '% danno fino a fine round (max +' + perc(B.setebattaglia.dannoMassimo) + '%)\nma i nemici arrivano più spesso',
    applica: (s) => { s.setePerUccisione = B.setebattaglia.dannoPerUccisione; s.intervalloOndateMolt *= B.setebattaglia.intervalloOndate; },
  },
  {
    id: 'corpocenere', nome: 'Corpo di cenere', max: 1,
    descrizione: () => 'La schivata non costa frecce\nma ogni schivata ti toglie il ' + perc(B.corpocenere.vitaPerSchivata) + '% della vita',
    applica: (s) => { s.schivataDiVita = B.corpocenere.vitaPerSchivata; },
  },
];

const DIVINE = [
  {
    id: 'luce', nome: 'Luce ristoratrice', max: 99,
    descrizione: () => 'Ti cura completamente\ne ti dà ' + B.luce.scudi + ' scudo overheal',
    applica: () => {},
    alPrendere: (scena) => {
      scena.cura(scena.stats.vitaMax);
      scena.scudiOverheal = Math.min(OVERHEAL_SCUDI_MASSIMI, scena.scudiOverheal + B.luce.scudi);
    },
  },
  {
    id: 'vento', nome: 'Grazia del vento', max: 3,
    descrizione: () => 'Ti muovi il ' + perc(B.vento.velocita) + '% più veloce',
    applica: (s, liv) => { s.velocita *= Math.pow(1 + B.vento.velocita, liv); },
  },
  {
    id: 'faretrabenedetta', nome: 'Faretra benedetta', max: 3,
    descrizione: () => '+' + B.faretrabenedetta.frecce + ' frecce nella faretra\ne ogni uccisione ti restituisce una freccia',
    applica: (s, liv) => { s.frecceFaretra += B.faretrabenedetta.frecce * liv; s.frecceUccisione = B.faretrabenedetta.frecceIndietro; },
  },
  {
    id: 'giudizio', nome: 'Lama del giudizio', max: 3,
    descrizione: () => 'Danno +' + perc(B.giudizio.danno) + '%\ne circa +' + perc((1 + B.giudizio.danno) * (1 + B.giudizio.dannoBoss) - 1) + '% contro boss ed élite',
    applica: (s, liv) => { s.dannoMolt *= Math.pow(1 + B.giudizio.danno, liv); s.dannoBossMolt *= Math.pow(1 + B.giudizio.dannoBoss, liv); },
  },
  {
    id: 'mira', nome: 'Occhio del cacciatore', max: 1,
    descrizione: () => 'Le frecce puntano da sole il nemico più vicino entro ' + B.mira.raggio + ' pixel',
    applica: (s) => { s.raggioMira = Math.max(s.raggioMira, B.mira.raggio); },
  },
  {
    id: 'ricaricasacra', nome: 'Ricarica sacra', max: 2,
    descrizione: () => 'La ricarica dura il ' + perc(1 - B.ricaricasacra.ricarica) + '% in meno\ne quando ricarichi respingi i nemici vicini',
    applica: (s, liv) => { s.ricaricaMs *= Math.pow(B.ricaricasacra.ricarica, liv); s.spintaRicarica = true; },
  },
  {
    id: 'secondavita', nome: 'Seconda vita', max: 1,
    descrizione: () => 'Una volta per partita, quando muori\ntorni in vita con il ' + perc(B.secondavita.vita) + '% della vita',
    applica: (s) => { s.secondaVita = true; },
  },
  {
    id: 'sciavento', nome: 'Scia del vento', max: 1,
    descrizione: () => 'La schivata lascia una scia\nche ferisce i nemici che la toccano',
    applica: (s) => { s.sciaSchivata = true; },
  },
  {
    id: 'calice', nome: 'Calice', max: 1,
    descrizione: () => 'Ogni scudo overheal attivo\nti fa muovere il ' + perc(B.calice.velocitaPerScudo) + '% più veloce',
    applica: (s) => { s.velocitaPerScudo = B.calice.velocitaPerScudo; },
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
