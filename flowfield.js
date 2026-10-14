// ============================================================
// FLOW FIELD - come fanno i nemici ad aggirare gli ostacoli
//
// L'arena è divisa in caselle. Partendo dalla casella del giocatore
// contiamo quanti passi servono per arrivare a ogni altra casella,
// girando attorno a quelle occupate dagli ostacoli.
// Ogni nemico poi si sposta verso la casella vicina con il numero
// più basso: così trova sempre la strada, e il calcolo è uno solo
// per tutti i nemici (importante quando saranno tanti).
// ============================================================

// Le 8 direzioni possibili: 4 dritte e 4 in diagonale
const VICINI = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

class FlowField {
  constructor(larghezza, altezza, cella, ostacoli, margine) {
    this.cella = cella;
    this.colonne = Math.ceil(larghezza / cella);
    this.righe = Math.ceil(altezza / cella);
    this.bloccata = new Array(this.colonne * this.righe).fill(false);
    this.distanza = new Array(this.colonne * this.righe).fill(Infinity);
    this.cellaGiocatore = -1;

    // Una casella è bloccata se il suo centro cade dentro un ostacolo
    // (allargato del margine, così i nemici non sfregano sugli spigoli)
    for (let r = 0; r < this.righe; r++) {
      for (let c = 0; c < this.colonne; c++) {
        const cx = c * cella + cella / 2;
        const cy = r * cella + cella / 2;
        for (const o of ostacoli) {
          if (Math.abs(cx - o.x) < o.l / 2 + margine && Math.abs(cy - o.y) < o.a / 2 + margine) {
            this.bloccata[this.indice(c, r)] = true;
          }
        }
      }
    }
  }

  indice(c, r) {
    return r * this.colonne + c;
  }

  // In quale casella si trova un punto
  colonnaDi(x) { return Phaser.Math.Clamp(Math.floor(x / this.cella), 0, this.colonne - 1); }
  rigaDi(y) { return Phaser.Math.Clamp(Math.floor(y / this.cella), 0, this.righe - 1); }

  // Si può andare dalla casella (c, r) a quella vicina (c+dc, r+dr)?
  passabile(c, r, dc, dr) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= this.colonne || nr >= this.righe) return false;
    if (this.bloccata[this.indice(nc, nr)]) return false;
    // In diagonale non si tagliano gli spigoli degli ostacoli
    if (dc !== 0 && dr !== 0) {
      if (this.bloccata[this.indice(c + dc, r)] || this.bloccata[this.indice(c, r + dr)]) return false;
    }
    return true;
  }

  // Ricalcola le distanze, solo se il giocatore ha cambiato casella
  aggiorna(x, y) {
    const c0 = this.colonnaDi(x);
    const r0 = this.rigaDi(y);
    const partenza = this.indice(c0, r0);
    if (partenza === this.cellaGiocatore) return;
    this.cellaGiocatore = partenza;

    this.distanza.fill(Infinity);
    this.distanza[partenza] = 0;
    const coda = [[c0, r0]];
    // Visita "a onde": prima le caselle a 1 passo, poi a 2, e così via
    for (let i = 0; i < coda.length; i++) {
      const [c, r] = coda[i];
      const d = this.distanza[this.indice(c, r)];
      for (const [dc, dr] of VICINI) {
        if (!this.passabile(c, r, dc, dr)) continue;
        const vicino = this.indice(c + dc, r + dr);
        if (this.distanza[vicino] !== Infinity) continue;
        this.distanza[vicino] = d + 1;
        coda.push([c + dc, r + dr]);
      }
    }
  }

  // Dove deve andare un nemico che si trova in (x, y).
  // Restituisce il centro della casella successiva,
  // oppure null se è già vicinissimo e può puntare dritto al giocatore.
  prossimoPasso(x, y) {
    const c = this.colonnaDi(x);
    const r = this.rigaDi(y);
    let migliore = this.distanza[this.indice(c, r)];
    if (migliore <= 1) return null;

    let passo = null;
    for (const [dc, dr] of VICINI) {
      if (!this.passabile(c, r, dc, dr)) continue;
      const d = this.distanza[this.indice(c + dc, r + dr)];
      if (d < migliore) {
        migliore = d;
        passo = { x: (c + dc) * this.cella + this.cella / 2, y: (r + dr) * this.cella + this.cella / 2 };
      }
    }
    return passo;
  }
}
