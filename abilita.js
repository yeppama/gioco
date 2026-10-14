// ============================================================
// ABILITÀ - la tabella di tutte le abilità che si possono scegliere
//
// Ogni abilità è solo un insieme di dati:
//  - id: nome breve usato nel codice
//  - nome, descrizione: cosa vede il giocatore sulla carta
//  - max: quante volte si può prendere
//  - applica: come cambia le statistiche (vedi statistiche.js)
//
// Per aggiungere un'abilità basta aggiungere una riga qui:
// la logica della partita legge solo le statistiche finali.
// ============================================================

const ABILITA = [
  // --- Attacco ---
  {
    id: 'doppia', nome: 'Freccia doppia', max: 2,
    descrizione: (liv) => '+1 freccia parallela a ogni colpo (totale ' + (liv + 1) + ')',
    applica: (s, liv) => { s.frecceParallele += liv; },
  },
  {
    id: 'ventaglio', nome: 'Ventaglio', max: 2,
    descrizione: () => '+2 frecce in diagonale a ogni colpo',
    applica: (s, liv) => { s.coppieDiagonali += liv; },
  },
  {
    id: 'rimbalzo', nome: 'Rimbalzo', max: 3,
    descrizione: (liv) => 'Le frecce rimbalzano su muri e ostacoli (' + liv + (liv === 1 ? ' volta)' : ' volte)'),
    applica: (s, liv) => { s.rimbalzi += liv; },
  },
  {
    id: 'perforazione', nome: 'Perforazione', max: 3,
    descrizione: (liv) => 'Le frecce attraversano ' + liv + (liv === 1 ? ' nemico' : ' nemici'),
    applica: (s, liv) => { s.perforazioni += liv; },
  },
  {
    id: 'corda', nome: 'Corda tesa', max: 3,
    descrizione: () => 'Spari il 15% più velocemente',
    applica: (s, liv) => { s.cadenzaMs *= Math.pow(0.85, liv); },
  },
  {
    id: 'mira', nome: 'Occhio del cacciatore', max: 3,
    descrizione: (liv) => 'Le frecce puntano da sole il nemico più vicino entro ' + (150 + 100 * liv) + ' pixel',
    applica: (s, liv) => { s.raggioMira = 150 + 100 * liv; },
  },

  // --- Difesa ---
  {
    id: 'vigore', nome: 'Vigore', max: 5,
    descrizione: () => '+20 vita massima, e ti cura di 20',
    applica: (s, liv) => { s.vitaMax += 20 * liv; },
  },
  {
    id: 'rigenerazione', nome: 'Rigenerazione', max: 3,
    descrizione: (liv) => 'Recuperi ' + liv + ' vita ogni 2 secondi',
    applica: (s, liv) => { s.rigenerazione += liv; },
  },
  {
    id: 'scudo', nome: 'Scudo spirituale', max: 3,
    descrizione: (liv) => 'Blocca un colpo; si ricarica in ' + (12 - 3 * liv) + ' secondi',
    applica: (s, liv) => { s.scudoMs = (12 - 3 * liv) * 1000; },
  },
  {
    id: 'passo', nome: 'Passo leggero', max: 2,
    descrizione: () => 'La schivata costa 2 frecce in meno',
    applica: (s, liv) => { s.costoSchivata -= 2 * liv; },
  },
];

// Pesca fino a "quante" abilità diverse, escluse quelle già al massimo.
// livelli = { idAbilita: livello attuale }
function estraiOpzioni(livelli, quante) {
  const disponibili = ABILITA.filter(a => (livelli[a.id] || 0) < a.max);
  return Phaser.Utils.Array.Shuffle(disponibili.slice()).slice(0, quante).map(a => {
    const prossimo = (livelli[a.id] || 0) + 1;
    return { id: a.id, nome: a.nome, livello: prossimo, descrizione: a.descrizione(prossimo) };
  });
}
