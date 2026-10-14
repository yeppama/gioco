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

const MALEDETTE = [
  {
    id: 'patto', nome: 'Patto di sangue', max: 1,
    descrizione: () => 'Danno +35%\nma vita massima -30%',
    applica: (s) => { s.dannoMolt *= 1.35; s.vitaMaxMolt *= 0.7; },
  },
  {
    id: 'furiacieca', nome: 'Furia cieca', max: 1,
    descrizione: () => 'Spari il 25% più veloce\nma le frecce deviano molto',
    applica: (s) => { s.cadenzaMs *= 0.75; s.deviazione += 20; },
  },
  {
    id: 'faretrapesante', nome: 'Faretra pesante', max: 1,
    descrizione: () => '+10 frecce nella faretra\nma ti muovi il 20% più lento',
    applica: (s) => { s.frecceFaretra += 10; s.velocita *= 0.8; },
  },
  {
    id: 'occhidibrace', nome: 'Occhi di brace', max: 1,
    descrizione: () => '+35% esperienza\nma i nemici sono il 20% più veloci',
    applica: (s) => { s.expMolt *= 1.35; s.velocitaNemiciMolt *= 1.2; },
  },
  {
    id: 'miraossessiva', nome: 'Mira ossessiva', max: 1,
    descrizione: () => 'Le frecce puntano da sole il nemico più vicino\nma -15% velocità e -20% danno',
    applica: (s) => { s.raggioMira = Math.max(s.raggioMira, 350); s.velocita *= 0.85; s.dannoMolt *= 0.8; },
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
    alPrendere: (scena) => { scena.cura(scena.stats.vitaMax); },
  },
  {
    id: 'vento', nome: 'Grazia del vento', max: 3,
    descrizione: () => 'Ti muovi il 15% più veloce',
    applica: (s, liv) => { s.velocita *= Math.pow(1.15, liv); },
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
    id: 'mira', nome: 'Occhio del cacciatore', max: 2,
    descrizione: (liv) => 'Le frecce puntano da sole il nemico più vicino entro ' + (250 + 100 * liv) + ' pixel',
    applica: (s, liv) => { s.raggioMira = Math.max(s.raggioMira, 250 + 100 * liv); },
  },
  {
    id: 'ricaricasacra', nome: 'Ricarica sacra', max: 2,
    descrizione: () => 'La ricarica dura il 30% in meno',
    applica: (s, liv) => { s.ricaricaMs *= Math.pow(0.7, liv); },
  },
];

const PREMI = [
  {
    id: 'premiovita', nome: 'Respiro', max: 999,
    descrizione: () => '+' + Math.round(PREMIO.vitaMax * 100) + '% vita massima e recuperi il ' + Math.round(PREMIO.cura * 100) + '% della vita',
    applica: (s, liv) => { s.vitaMaxMolt *= Math.pow(1 + PREMIO.vitaMax, liv); },
    alPrendere: (scena) => { scena.cura(scena.stats.vitaMax * PREMIO.cura); },
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
  return [...ABILITA, ...MALEDETTE, ...DIVINE, ...PREMI].find(v => v.id === id);
}
