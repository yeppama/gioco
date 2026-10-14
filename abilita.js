// ============================================================
// ABILITÀ - la tabella di tutte le abilità che si possono scegliere
//
// Ogni abilità è solo un insieme di dati:
//  - id: nome breve usato nel codice
//  - nome, descrizione: cosa vede il giocatore sulla carta
//  - max: quante volte si può prendere
//  - rarita: 'comune' (se manca), 'rara' o 'leggendaria': le rare escono meno spesso
//  - applica: come cambia le statistiche (vedi statistiche.js)
//
// Per aggiungere un'abilità basta aggiungere una riga qui:
// la logica della partita legge solo le statistiche finali.
// ============================================================

const ABILITA = [
  // --- Attacco ---
  {
    id: 'doppia', nome: 'Freccia doppia', max: 2, rarita: 'rara',
    descrizione: (liv) => '+1 freccia parallela a ogni colpo (totale ' + (liv + 1) + ')',
    applica: (s, liv) => { s.frecceParallele += liv; },
  },
  {
    id: 'ventaglio', nome: 'Ventaglio', max: 2, rarita: 'rara',
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

  // --- Elementali ed evocazioni ---
  {
    id: 'fuoco', nome: 'Frecce infuocate', max: 3,
    descrizione: (liv) => 'I nemici colpiti bruciano: ' + (3 * liv) + ' danni ogni mezzo secondo per 3 secondi',
    applica: (s, liv) => { s.fuocoDanno = 3 * liv; },
  },
  {
    id: 'gelo', nome: 'Frecce di brina', max: 3,
    descrizione: (liv) => 'I nemici colpiti rallentano del ' + (20 + 10 * liv) + '% per 2 secondi (metà sui boss)',
    applica: (s, liv) => { s.geloRallenta = 0.2 + 0.1 * liv; },
  },
  {
    id: 'lame', nome: 'Lame orbitanti', max: 3, rarita: 'rara',
    descrizione: (liv) => (liv === 1 ? 'Una lama gira' : liv + ' lame girano') + ' attorno a te e ferisce chi tocca',
    applica: (s, liv) => { s.lame = liv; },
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

// Pesca fino a "quante" voci diverse da una tabella (abilità o benedizioni),
// escluse quelle già al massimo. Le voci rare hanno meno probabilità di uscire.
// livelli = { id: livello attuale }
function estraiOpzioni(livelli, quante, tabella) {
  const disponibili = (tabella || ABILITA).filter(a => (livelli[a.id] || 0) < a.max);
  const scelte = [];
  for (let i = 0; i < quante && disponibili.length > 0; i++) {
    // Estrazione "a peso": come pescare da un sacchetto con più biglietti per le comuni
    const pesi = disponibili.map(a => PESI_RARITA[a.rarita || 'comune']);
    let estratto = Math.random() * pesi.reduce((somma, p) => somma + p, 0);
    let indice = 0;
    while (indice < pesi.length - 1 && estratto >= pesi[indice]) {
      estratto -= pesi[indice];
      indice++;
    }
    const a = disponibili.splice(indice, 1)[0]; // tolta dal sacchetto: niente doppioni
    const prossimo = (livelli[a.id] || 0) + 1;
    scelte.push({ id: a.id, nome: a.nome, livello: prossimo, rarita: a.rarita || 'comune', descrizione: a.descrizione(prossimo) });
  }
  return scelte;
}
