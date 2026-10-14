// ============================================================
// FULMINE - la punizione per chi resta fermo
//
// Dopo un attimo da fermo, un fulmine colpisce il giocatore ogni secondo.
// Ogni colpo fa più danno del precedente (x1,75). Il "contatore" dei colpi
// non si azzera subito: scende mentre ti muovi, e più vai veloce
// più scende in fretta.
// ============================================================

class Fulmine {
  constructor(scena) {
    this.scena = scena;
    this.fermoDa = 0;        // millisecondi passati da fermo
    this.livello = 0;        // quanti colpi "accumulati": decide il danno del prossimo
    this.prossimoColpo = 0;
    // Avviso: un cerchio giallo che si stringe sul giocatore prima del primo colpo
    this.avviso = scena.add.circle(0, 0, 40).setStrokeStyle(2, 0xffe066, 0.8).setVisible(false).setDepth(5);
  }

  aggiorna(t, delta) {
    const g = this.scena.giocatore;
    const velocita = g.body.velocity.length();
    const fermo = velocita < 5 && t >= this.scena.fineSchivata;

    if (fermo) {
      this.fermoDa += delta;
      // Patto del fulmine accorcia l'attesa (stats.graziaFulmineMs)
      if (this.fermoDa >= this.scena.stats.graziaFulmineMs && t >= this.prossimoColpo) {
        this.colpisci();
        this.prossimoColpo = t + FULMINE.intervalloMs;
      }
    } else {
      this.fermoDa = 0;
      this.prossimoColpo = 0;
      // Il contatore scende muovendosi: a velocità base perde FULMINE.caloAlSecondo livelli al secondo
      this.livello = Math.max(0, this.livello - (delta / 1000) * FULMINE.caloAlSecondo * (velocita / VELOCITA));
    }

    // Avviso: compare a metà dell'attesa e si stringe fino al primo colpo
    const avanzamento = this.fermoDa / this.scena.stats.graziaFulmineMs;
    const mostra = fermo && avanzamento > 0.4 && avanzamento < 1;
    this.avviso.setVisible(mostra).setPosition(g.x, g.y);
    if (mostra) this.avviso.setScale(1.6 - avanzamento);
  }

  dannoProssimo() {
    return FULMINE.dannoBase * Math.pow(FULMINE.moltiplicatore, Math.floor(this.livello));
  }

  colpisci() {
    const scena = this.scena;
    const g = scena.giocatore;
    const danno = this.dannoProssimo();
    scena.subisciDanno(danno);
    this.livello++;

    // Patto del fulmine: la scarica colpisce anche i nemici vicini (molto più forte)
    if (scena.stats.fulmineSuNemici) {
      const P = BENEDIZIONI.pattofulmine;
      const cerchio = scena.add.circle(g.x, g.y, P.raggio, 0xffe066, 0.18).setDepth(5);
      scena.time.delayedCall(150, () => cerchio.destroy());
      for (const n of scena.nemici.getChildren().slice()) {
        if (Phaser.Math.Distance.Between(g.x, g.y, n.x, n.y) <= P.raggio) colpisciNemico(scena, n, danno * P.moltDannoNemici, 'Fulmine');
      }
    }

    // Disegno: una saetta gialla che cade dall'alto e un lampo sul giocatore
    const saetta = scena.add.rectangle(g.x, g.y - 150, 6, 300, 0xffe066).setDepth(6);
    const lampo = scena.add.circle(g.x, g.y, 30, 0xffe066, 0.5).setDepth(6);
    scena.time.delayedCall(120, () => { saetta.destroy(); lampo.destroy(); });
  }

  nascondi() {
    this.avviso.setVisible(false);
  }
}
