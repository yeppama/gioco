// ============================================================
// BENEDIZIONI - funzionano come le abilità (stessa scheda, stessa
// formula in statistiche.js), ma arrivano in momenti speciali:
//
//  - MALEDETTE: ogni 5 livelli. Molto forti, ma con un prezzo.
//    Si possono rifiutare.
//  - DIVINE: a fine round, se non hai preso danni (dal round 3).
//    Nessun prezzo.
//
// "alPrendere" (facoltativo) è un effetto immediato, una volta sola.
// ============================================================

const MALEDETTE = [
  {
    id: 'patto', nome: 'Patto di sangue', max: 1,
    descrizione: () => 'Danno +50%\nma vita massima -25%',
    applica: (s) => { s.dannoMolt *= 1.5; s.vitaMaxMolt *= 0.75; },
  },
  {
    id: 'furiacieca', nome: 'Furia cieca', max: 1,
    descrizione: () => 'Spari il 35% più veloce\nma le frecce deviano a caso',
    applica: (s) => { s.cadenzaMs *= 0.65; s.deviazione += 12; },
  },
  {
    id: 'faretrapesante', nome: 'Faretra pesante', max: 1,
    descrizione: () => '+15 frecce nella faretra\nma ti muovi il 15% più lento',
    applica: (s) => { s.frecceFaretra += 15; s.velocita *= 0.85; },
  },
  {
    id: 'occhidibrace', nome: 'Occhi di brace', max: 1,
    descrizione: () => '+50% esperienza\nma i nemici sono il 15% più veloci',
    applica: (s) => { s.expMolt *= 1.5; s.velocitaNemiciMolt *= 1.15; },
  },
  {
    id: 'ultimorespiro', nome: 'Ultimo respiro', max: 1,
    descrizione: () => 'Danno doppio sotto il 30% di vita\nma nessuna rigenerazione',
    applica: (s) => { s.ultimoRespiro = true; s.rigenerazioneBloccata = true; },
  },
];

const DIVINE = [
  {
    id: 'luce', nome: 'Luce ristoratrice', max: 99,
    descrizione: () => 'Ti cura completamente',
    applica: () => {},
    alPrendere: (scena) => { scena.vita = scena.stats.vitaMax; },
  },
  {
    id: 'vento', nome: 'Grazia del vento', max: 3,
    descrizione: () => 'Ti muovi il 10% più veloce',
    applica: (s, liv) => { s.velocita *= Math.pow(1.1, liv); },
  },
  {
    id: 'faretrabenedetta', nome: 'Faretra benedetta', max: 3,
    descrizione: () => '+8 frecce nella faretra',
    applica: (s, liv) => { s.frecceFaretra += 8 * liv; },
  },
  {
    id: 'giudizio', nome: 'Lama del giudizio', max: 3,
    descrizione: () => 'Danno +20%',
    applica: (s, liv) => { s.dannoMolt *= Math.pow(1.2, liv); },
  },
  {
    id: 'ricaricasacra', nome: 'Ricarica sacra', max: 2,
    descrizione: () => 'La ricarica dura il 30% in meno',
    applica: (s, liv) => { s.ricaricaMs *= Math.pow(0.7, liv); },
  },
];

// Trova una voce in qualsiasi tabella (serve per "alPrendere")
function trovaVoce(id) {
  return [...ABILITA, ...MALEDETTE, ...DIVINE].find(v => v.id === id);
}
