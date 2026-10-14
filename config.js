// ============================================================
// CONFIG - tutti i numeri del gioco in un posto solo
// Cambia questi valori per bilanciare il gioco senza toccare la logica
// ============================================================

// Lo SCHERMO (quello che vedi) è più piccolo dell'ARENA: la telecamera ti segue
const LARGHEZZA = 800;      // larghezza dello schermo, in pixel
const ALTEZZA = 600;        // altezza dello schermo, in pixel

// Arena: dopo ogni boss se ne genera una nuova, più grande
const ARENA = {
  larghezzaIniziale: 1200,
  altezzaIniziale: 900,
  crescitaPerCiclo: 300,    // pixel in più in larghezza e altezza dopo ogni boss
  areaPerOstacolo: 110000,  // un ostacolo ogni tanti pixel quadrati (più arena = più ostacoli)
  latoOstacoloMin: 50,
  latoOstacoloMax: 100,
  distanzaTraOstacoli: 110, // spazio minimo tra due ostacoli, così si passa sempre
  zonaLiberaCentro: 180,    // niente ostacoli vicino al punto di partenza
};

// Giocatore (valori di partenza: le abilità li modificano, vedi statistiche.js)
const VELOCITA = 250;       // pixel al secondo
const LATO_GIOCATORE = 32;  // grandezza del quadrato
const VITA_MAX = 100;       // punti vita iniziali
const INVULNERABILITA_MS = 800; // dopo un colpo, per quanto non si subisce altro danno

// Arco: spara sempre da solo, alle spalle del giocatore (al contrario di dove cammina).
// Dopo un certo numero di frecce la faretra è vuota e si ricarica.
const CADENZA_MS = 400;          // un colpo ogni 0,4 secondi
const FRECCE_FARETRA = 30;       // frecce prima di dover ricaricare
const RICARICA_MS = 2000;        // durata della ricarica
const VELOCITA_FRECCIA = 600;    // pixel al secondo
const DANNO_FRECCIA = 10;
const LATO_FRECCIA = 8;
// Distanza dal centro del giocatore da cui parte la freccia: piccola, così colpisce
// anche un nemico appiccicato addosso
const PARTENZA_FRECCIA = 6;
const ANGOLO_VENTAGLIO = 20;     // gradi tra una freccia del ventaglio e la successiva
const DISTANZA_PARALLELE = 12;   // pixel tra frecce parallele (Freccia doppia)

// Colpo caricato (Spazio o pulsante sul telefono): tenendo premuto l'arco smette
// di sparare e mette da parte frecce dalla faretra; al rilascio partono tutte insieme
const COLPO_CARICATO = {
  intervalloMs: 300,       // ogni quanto si aggiunge una freccia alla carica
  massimo: 10,             // frecce al massimo in un colpo caricato
  apertura: 3,             // gradi tra una freccia e l'altra del colpo
  moltDanno: 1.5,          // ogni freccia del colpo fa il 50% in più
  perforazioniExtra: 99,   // attraversano tutti i nemici
  rallentamento: 0.6,      // mentre carichi ti muovi al 60%
};

// Joystick per il telefono
const RAGGIO_JOYSTICK = 60;        // quanto si sposta il pomello dal centro, in pixel

// Schivata (tasto Shift): uno scatto veloce che si paga in frecce
const COSTO_SCHIVATA = 6;          // frecce consumate; con meno frecce non si schiva
const VELOCITA_SCHIVATA = 700;     // pixel al secondo durante lo scatto
const DURATA_SCHIVATA_MS = 180;    // durata dello scatto; in questo tempo non si subiscono danni

// Rarità: quanto spesso esce una carta (peso più alto = più frequente)
const PESI_RARITA = { comune: 10, rara: 4, leggendaria: 1 };

// Benedizioni divine: a fine round senza danni (dal round 3), con una probabilità
// che si dimezza ogni volta che ne prendi una (100%, 50%, 25%...)
const DIVINA_DAL_ROUND = 3;
const RIPOSO_CURA = 0.2;   // la quarta opzione delle maledette: cura il 20% della vita

// Abilità difensive
const INTERVALLO_RIGENERAZIONE_MS = 2000; // ogni quanto agisce Rigenerazione

// Abilità elementali ed evocazioni
const DURATA_FUOCO_MS = 3000;     // per quanto brucia un nemico colpito
const INTERVALLO_FUOCO_MS = 500;  // ogni quanto il fuoco fa danno
const DURATA_GELO_MS = 2000;      // per quanto resta rallentato
const LAME = {
  raggio: 64,              // distanza dal giocatore
  giriAlSecondo: 0.5,      // velocità di rotazione
  lato: 14,
  danno: 8,
  intervalloColpoMs: 400,  // ogni quanto una lama può colpire lo stesso nemico
};

// Limiti: qualunque combinazione di abilità non può superarli
// (servono a evitare personaggi invincibili o rotti)
const LIMITI = {
  cadenzaMinMs: 150,      // non si spara più spesso di così
  costoSchivataMin: 2,    // la schivata costa almeno 2 frecce
  vitaMaxMassima: 300,
};

// Esperienza: per salire dal livello 1 al 2 servono EXP_PRIMO_LIVELLO punti,
// poi ogni livello ne chiede il 20% in più
const EXP_PRIMO_LIVELLO = 30;
const CRESCITA_EXP = 1.2;

// Round: per DURATA_ROUND_S secondi arrivano nemici sempre più spesso.
// Poi smettono di arrivare, ma il round finisce solo quando li hai uccisi tutti:
// nel frattempo quelli rimasti si infuriano e diventano sempre più veloci.
const DURATA_ROUND_S = 30;
const PAUSA_TRA_ROUND_MS = 2500;
const FURIA_PER_SECONDO = 0.08;  // dopo il tempo: +8% di velocità ogni secondo
const FURIA_MASSIMA = 2.5;       // al massimo 2,5 volte più veloci
// I nemici arrivano a GRUPPI, ognuno da una direzione diversa
const ONDATE = {
  intervalloInizialeMs: 3500, // nel primo round di ogni ciclo un gruppo ogni 3,5 secondi
  riduzionePerRoundMs: 200,   // ogni round i gruppi arrivano un po' più spesso
  intervalloMinimoMs: 1800,
  gruppoMinimo: 2,            // nemici per gruppo all'inizio del ciclo
  gruppoMassimo: 5,
  maxNemiciInsieme: 20,       // mai più di così in campo
  distanzaComparsaMin: 420,   // i gruppi compaiono fuori dallo schermo...
  distanzaComparsaMax: 650,   // ...ma non troppo lontano
};
// Da quale round compare ogni tipo, e quanto è frequente (peso più alto = più frequente)
const COMPARSA_TIPI = [
  { tipo: 'inseguitore', daRound: 1, peso: 5 },
  { tipo: 'caricatore', daRound: 2, peso: 2 },
  { tipo: 'mortaio', daRound: 2, peso: 2 },
  { tipo: 'tiratore', daRound: 3, peso: 2 },
];

// Round speciali e difficoltà.
// Un "ciclo" = i round fino al boss. Dentro un ciclo ogni round i nemici
// hanno il 2% in più di vita, danno e velocità; dopo ogni boss si sale del 20%.
const OGNI_QUANTI_ROUND_BOSS = 10;
const OGNI_QUANTI_ROUND_MINIBOSS = 7;  // se coincide con il boss, vince il boss
const CRESCITA_PER_ROUND = 0.02;
const CRESCITA_PER_CICLO = 0.20;

// Boss (round 10, 20, 30...): 3 attacchi annunciati, a turno
const BOSS = {
  nome: 'Il Custode Cinereo',
  vita: 2500, velocita: 70, danno: 25, lato: 72, colore: 0x7a6a58, exp: 150,
  pausaTraAttacchiMs: 1400,
  carica: { preparazioneMs: 800, velocita: 480, durataMs: 700 },
  anello: { preparazioneMs: 700, proiettili: 14, velocita: 200, danno: 15 },
  evocazione: { preparazioneMs: 900, quanti: 3 },
  // Pioggia: cerchi rossi attorno a te che esplodono poco dopo (chi resta fermo li prende)
  pioggia: { preparazioneMs: 500, zone: 5, raggio: 60, spargimento: 140, ritardoMs: 1000, danno: 20 },
  // Dal secondo ciclo, sotto metà vita: attacca più spesso e gli anelli sono doppi
  faseExtra: { sogliaVita: 0.5, pausaTraAttacchiMs: 900, colore: 0x9a4a3a },
};

// Mini boss (round 7, 14, 21...): in futuro lascerà anche amuleti e strumenti
// Quando muore lascia una benedizione maledetta
const MINIBOSS = {
  nome: 'La Sentinella Spezzata',
  vita: 700, velocita: 95, danno: 20, lato: 48, colore: 0x5f8f7a, exp: 60,
  pausaTraAttacchiMs: 1600,
  ventaglio: { preparazioneMs: 600, proiettili: 5, apertura: 50, velocita: 240, danno: 12 },
  carica: { preparazioneMs: 600, velocita: 450, durataMs: 500 },
};

// Nemici: ogni tipo ha i suoi valori (exp = esperienza data quando muore)
const TIPI_NEMICO = {
  // Ti insegue e basta
  inseguitore: { vita: 30, velocita: 120, danno: 10, lato: 28, colore: 0xe0453a, exp: 6 },
  // Ti insegue piano; quando è vicino si ferma, lampeggia e scatta in linea retta
  caricatore: {
    vita: 40, velocita: 80, danno: 20, lato: 30, colore: 0xe08a3a, exp: 10,
    distanzaCarica: 220,   // da quanto vicino decide di caricare
    preparazioneMs: 500,   // quanto lampeggia prima dello scatto (il tuo tempo per spostarti)
    velocitaCarica: 520,   // velocità dello scatto
    durataCaricaMs: 450,   // quanto dura lo scatto
    recuperoMs: 900,       // dopo lo scatto resta fermo: è il momento per colpirlo
  },
  // Resta a distanza e lancia proiettili lenti; gli ostacoli ti fanno da riparo
  tiratore: {
    vita: 25, velocita: 90, danno: 10, lato: 26, colore: 0x9b59d0, exp: 10,
    distanzaIdeale: 260,      // la distanza a cui cerca di stare
    cadenzaMs: 2200,          // ogni quanto spara
    preparazioneTiroMs: 350,  // lampeggia prima di sparare
    velocitaProiettile: 220,
    dannoProiettile: 10,
  },
  // Lento e lontano: bombarda il punto dove sei. Chi resta fermo viene colpito
  mortaio: {
    vita: 30, velocita: 60, danno: 10, lato: 30, colore: 0x8a6d3b, exp: 10,
    distanzaIdeale: 340,
    cadenzaMs: 3000,      // ogni quanto bombarda
    raggio: 55,           // grandezza del cerchio
    ritardoMs: 1100,      // tempo tra il cerchio rosso e l'esplosione: il tuo tempo per spostarti
    dannoEsplosione: 15,
  },
};

// Percorsi dei nemici (flow field): l'arena è divisa in caselle
const CELLA_FLOW = 40;       // grandezza di una casella, in pixel
const MARGINE_FLOW = 17;     // spazio lasciato attorno agli ostacoli (metà del nemico più grande)
