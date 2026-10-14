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

  {
    id: 'casino', nome: 'Casinò', max: 3,
    descrizione: (liv) => [15, 40, 60][liv - 1] + '% di probabilità che un colpo non consumi frecce',
    applica: (s, liv) => { s.frecciaGratis = Math.max(s.frecciaGratis, [0.15, 0.4, 0.6][liv - 1]); },
  },
  {
    id: 'manirapide', nome: 'Mani rapide', max: 3,
    descrizione: () => 'La ricarica dura il 15% in meno',
    applica: (s, liv) => { s.ricaricaMs *= Math.pow(0.85, liv); },
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

// ------------------------------------------------------------
// COMBINAZIONI: quando hai gli ingredienti, al prossimo level up
// compare una carta dorata in più. requisiti = { id: livello minimo }
// ------------------------------------------------------------
const COMBINAZIONI = [
  {
    id: 'ventofortuna', nome: 'Vento della fortuna', max: 1, rarita: 'combinazione',
    requisiti: { casino: 3, passo: 2 },
    descrizione: () => '75% di colpi gratis e un tiro circolare ogni 7 s (più spesso con più frecce nella faretra)',
    applica: (s) => { s.frecciaGratis = Math.max(s.frecciaGratis, 0.75); s.tiroCircolare = true; },
  },
];

// Le combinazioni pronte da offrire: ingredienti presi e combinazione non ancora presa
function combinazioniPronte(livelli) {
  return COMBINAZIONI.filter(c => !livelli[c.id] && Object.entries(c.requisiti).every(([id, liv]) => (livelli[id] || 0) >= liv));
}

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
    scelte.push({ id: a.id, nome: nomeDi(a), livello: prossimo, rarita: a.rarita || 'comune', descrizione: descrizioneDi(a, prossimo) });
  }
  return scelte;
}
