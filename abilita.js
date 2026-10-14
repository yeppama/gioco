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

// Piccoli aiuti per scrivere le descrizioni (usati anche da lingua.js e benedizioni.js)
const percentuale = (x) => Math.round(x * 100);   // 0.35 -> 35
const secondi = (ms) => ms / 1000;                // 2000 -> 2
const NA = NUMERI_ABILITA;                        // abbreviazione: i numeri stanno in config.js
const ricaricaScudoS = (liv) => NA.scudo.baseS - NA.scudo.menoPerLivelloS * liv;
const rallentamentoGelo = (liv) => NA.gelo.base + NA.gelo.perLivello * liv;

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
    descrizione: () => 'Spari il ' + percentuale(1 - NA.corda.cadenza) + '% più velocemente',
    applica: (s, liv) => { s.cadenzaMs *= Math.pow(NA.corda.cadenza, liv); },
  },

  {
    id: 'casino', nome: 'Casinò', max: 3,
    descrizione: (liv) => percentuale(NA.casino.gratis[liv - 1]) + '% di probabilità che un colpo non consumi frecce',
    applica: (s, liv) => { s.frecciaGratis = Math.max(s.frecciaGratis, NA.casino.gratis[liv - 1]); },
  },
  {
    id: 'manirapide', nome: 'Mani rapide', max: 3,
    descrizione: () => 'La ricarica dura il ' + percentuale(1 - NA.manirapide.ricarica) + '% in meno',
    applica: (s, liv) => { s.ricaricaMs *= Math.pow(NA.manirapide.ricarica, liv); },
  },

  // --- Elementali ed evocazioni ---
  {
    id: 'fuoco', nome: 'Frecce infuocate', max: 3,
    descrizione: (liv) => 'I nemici colpiti bruciano: ' + NA.fuoco.dannoPerLivello * liv + ' danni ogni ' + secondi(INTERVALLO_FUOCO_MS) + ' s per ' + secondi(DURATA_FUOCO_MS) + ' s',
    applica: (s, liv) => { s.fuocoDanno = NA.fuoco.dannoPerLivello * liv; },
  },
  {
    id: 'gelo', nome: 'Frecce di brina', max: 3,
    descrizione: (liv) => 'I nemici colpiti rallentano del ' + percentuale(rallentamentoGelo(liv)) + '% per ' + secondi(DURATA_GELO_MS) + ' s (metà sui boss)',
    applica: (s, liv) => { s.geloRallenta = rallentamentoGelo(liv); },
  },
  {
    id: 'lame', nome: 'Lame orbitanti', max: 3, rarita: 'rara',
    descrizione: (liv) => (liv === 1 ? 'Una lama gira' : liv + ' lame girano') + ' attorno a te e ferisce chi tocca',
    applica: (s, liv) => { s.lame = liv; },
  },

  // --- Difesa ---
  {
    id: 'vigore', nome: 'Vigore', max: 5,
    descrizione: () => '+' + NA.vigore.vita + ' vita massima, e ti cura di ' + NA.vigore.vita,
    applica: (s, liv) => { s.vitaMax += NA.vigore.vita * liv; },
  },
  {
    id: 'rigenerazione', nome: 'Rigenerazione', max: 3,
    descrizione: (liv) => 'Recuperi ' + NA.rigenerazione.vitaPerLivello * liv + ' vita ogni ' + secondi(INTERVALLO_RIGENERAZIONE_MS) + ' s',
    applica: (s, liv) => { s.rigenerazione += NA.rigenerazione.vitaPerLivello * liv; },
  },
  {
    id: 'scudo', nome: 'Scudo spirituale', max: 3,
    descrizione: (liv) => 'Blocca un colpo; si ricarica in ' + ricaricaScudoS(liv) + ' secondi',
    applica: (s, liv) => { s.scudoMs = ricaricaScudoS(liv) * 1000; },
  },
  {
    id: 'passo', nome: 'Passo leggero', max: 2,
    descrizione: () => 'La schivata costa ' + NA.passo.frecce + ' frecce in meno',
    applica: (s, liv) => { s.costoSchivata -= NA.passo.frecce * liv; },
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
    descrizione: () => percentuale(NA.ventofortuna.gratis) + '% di colpi gratis e un tiro circolare ogni ' + TIRO_CIRCOLARE.tempi[0][1] + ' s (più spesso con più frecce nella faretra)',
    applica: (s) => { s.frecciaGratis = Math.max(s.frecciaGratis, NA.ventofortuna.gratis); s.tiroCircolare = true; },
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
