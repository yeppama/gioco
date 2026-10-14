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

// Nemico
const VELOCITA_NEMICO = 120; // pixel al secondo
const LATO_NEMICO = 28;
const DANNO_NEMICO = 10;     // vita tolta a ogni contatto

// Ostacoli: x e y sono il centro, l e a larghezza e altezza
const OSTACOLI = [
  { x: 200, y: 160, l: 60, a: 60 },
  { x: 600, y: 160, l: 60, a: 60 },
  { x: 200, y: 440, l: 60, a: 60 },
  { x: 600, y: 440, l: 60, a: 60 },
];
