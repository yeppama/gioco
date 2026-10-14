// ============================================================
// CONSUMABILI - sfere di vita che compaiono ogni tanto nell'arena
// Passandoci sopra si recupera un po' di vita. Se nessuno le prende,
// dopo un po' lampeggiano e spariscono.
// ============================================================

class Consumabili {
  constructor(scena) {
    this.scena = scena;
    this.sfere = [];
    this.prossima = CONSUMABILI.intervalloMs;
  }

  aggiorna(t) {
    const scena = this.scena;
    const g = scena.giocatore;

    if (t >= this.prossima) {
      this.prossima = t + CONSUMABILI.intervalloMs;
      if (this.sfere.length < CONSUMABILI.massimo) this.crea(t);
    }

    for (const s of this.sfere) {
      const vicino = Phaser.Math.Distance.Between(s.x, s.y, g.x, g.y) < CONSUMABILI.raggio + LATO_GIOCATORE / 2 + 4;
      if (vicino) {
        const cura = Math.round(scena.stats.vitaMax * CONSUMABILI.cura);
        scena.vita = Math.min(scena.stats.vitaMax, scena.vita + cura);
        this.scritta('+' + cura, s.x, s.y);
        s.finita = true;
      } else if (t >= s.scade) {
        s.finita = true;
      } else {
        // Pulsa piano; negli ultimi 3 secondi lampeggia per avvisare che sta per sparire
        const lampeggia = t > s.scade - 3000 && Math.floor(t / 150) % 2 === 0;
        s.grafica.setScale(1 + Math.sin(t / 200) * 0.15).setAlpha(lampeggia ? 0.3 : 1);
      }
    }
    for (const s of this.sfere) if (s.finita) s.grafica.destroy();
    this.sfere = this.sfere.filter(s => !s.finita);
  }

  crea(t) {
    const g = this.scena.giocatore;
    const p = this.scena.arena.puntoComparsa(g.x, g.y, CONSUMABILI.distanzaMin, CONSUMABILI.distanzaMax);
    const grafica = this.scena.add.circle(p.x, p.y, CONSUMABILI.raggio, 0x6fd36f).setStrokeStyle(2, 0xffffff, 0.8);
    this.sfere.push({ x: p.x, y: p.y, scade: t + CONSUMABILI.durataMs, grafica });
  }

  // Numero verde che sale e svanisce
  scritta(testo, x, y) {
    const scritta = this.scena.add.text(x, y - 10, testo, { fontSize: '18px', color: '#6fd36f', fontStyle: 'bold' }).setOrigin(0.5);
    this.scena.tweens.add({ targets: scritta, y: y - 40, alpha: 0, duration: 700, onComplete: () => scritta.destroy() });
  }

  svuota() {
    for (const s of this.sfere) s.grafica.destroy();
    this.sfere = [];
  }
}
