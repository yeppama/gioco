// ============================================================
// CONFIG - tutti i numeri del gioco in un posto solo
// Cambia questi valori per bilanciare il gioco senza toccare la logica
// ============================================================

const LARGHEZZA = 800;      // larghezza dell'arena, in pixel
const ALTEZZA = 600;        // altezza dell'arena, in pixel

// Giocatore
const VELOCITA = 250;       // pixel al secondo
const LATO_GIOCATORE = 32;  // grandezza del quadrato
const VITA_MAX = 100;       // punti vita iniziali
const INVULNERABILITA_MS = 800; // dopo un colpo, per quanto non si subisce altro danno

// Arco: spara sempre da solo, alle spalle del giocatore (al contrario di dove cammina).
// Dopo un certo numero di frecce la faretra è vuota e si ricarica.
const CADENZA_MS = 400;          // un colpo ogni 0,4 secondi
const FRECCE_FARETRA = 20;       // frecce prima di dover ricaricare
const RICARICA_MS = 2000;        // durata della ricarica
const VELOCITA_FRECCIA = 600;    // pixel al secondo
const DANNO_FRECCIA = 10;
const LATO_FRECCIA = 8;

// Nemici: ogni tipo ha i suoi valori
const TIPI_NEMICO = {
  // Ti insegue e basta
  inseguitore: { vita: 30, velocita: 120, danno: 10, lato: 28, colore: 0xe0453a },
  // Ti insegue piano; quando è vicino si ferma, lampeggia e scatta in linea retta
  caricatore: {
    vita: 40, velocita: 80, danno: 20, lato: 30, colore: 0xe08a3a,
    distanzaCarica: 220,   // da quanto vicino decide di caricare
    preparazioneMs: 500,   // quanto lampeggia prima dello scatto (il tuo tempo per spostarti)
    velocitaCarica: 520,   // velocità dello scatto
    durataCaricaMs: 450,   // quanto dura lo scatto
    recuperoMs: 900,       // dopo lo scatto resta fermo: è il momento per colpirlo
  },
};
const RICOMPARSA_MS = 1500;           // dopo quanto riappare un nemico ucciso
const DISTANZA_MIN_COMPARSA = 250;    // non compare mai più vicino di così al giocatore
const PUNTI_COMPARSA = [
  { x: 40, y: 40 }, { x: 400, y: 40 }, { x: 760, y: 40 },
  { x: 40, y: 300 }, { x: 760, y: 300 },
  { x: 40, y: 560 }, { x: 400, y: 560 }, { x: 760, y: 560 },
];

// Percorsi dei nemici (flow field): l'arena è divisa in caselle
const CELLA_FLOW = 40;       // grandezza di una casella, in pixel
const MARGINE_FLOW = 17;     // spazio lasciato attorno agli ostacoli (metà del nemico più grande)

// Ostacoli: x e y sono il centro, l e a larghezza e altezza
const OSTACOLI = [
  { x: 200, y: 160, l: 60, a: 60 },
  { x: 600, y: 160, l: 60, a: 60 },
  { x: 200, y: 440, l: 60, a: 60 },
  { x: 600, y: 440, l: 60, a: 60 },
];
