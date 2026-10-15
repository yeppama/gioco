// ============================================================
// ANTI-FERMO - chi resta fermo viene raggiunto dai nemici
//
// Se il giocatore resta dentro un piccolo cerchio (ANTI_FERMO.raggio),
// ogni tot secondi compare un gruppo di nemici vicino a lui, ogni volta
// più vicino. Basta uscire dal cerchio per far ripartire tutto.
// Il cerchio (e non "velocità zero") evita il trucco di dondolare sul posto.
// Vale sempre durante i round, anche con il boss; non tra un round e l'altro.
// ============================================================

class AntiFermo {
  constructor(scena) {
    this.scena = scena;
    this.punto = null;     // dove il giocatore si è "fermato"
    this.inizio = 0;       // da quando è fermo lì
    this.arrivi = 0;       // quanti gruppi sono già arrivati (decide la distanza)
    // Avviso: un cerchio rosso che si stringe sul giocatore prima di ogni arrivo
    this.avviso = scena.add.circle(0, 0, 60).setStrokeStyle(2, 0xff4444, 0.8).setVisible(false).setDepth(5);
  }

  // Quanto bisogna aspettare tra un gruppo e l'altro (Radici di pietra lo accorcia)
  intervallo() {
    return this.scena.stats.intervalloFermoMs;
  }

  aggiorna(t) {
    const scena = this.scena;
    const g = scena.giocatore;

    // Tra un round e l'altro non succede niente: si riparte da capo
    if (scena.round.fase === 'pausa') {
      this.azzera(t, g);
      this.avviso.setVisible(false);
      return;
    }

    // Uscito dal cerchio: nuovo punto di partenza
    if (!this.punto || Phaser.Math.Distance.Between(g.x, g.y, this.punto.x, this.punto.y) > ANTI_FERMO.raggio) {
      this.azzera(t, g);
    }

    const attesa = t - this.inizio;
    if (attesa >= this.intervallo()) {
      this.fattiRaggiungere();
      this.inizio = t;
    }

    // Avviso: compare a metà dell'attesa e si stringe fino all'arrivo
    const avanzamento = (t - this.inizio) / this.intervallo();
    const mostra = avanzamento > ANTI_FERMO.avvisoDa;
    this.avviso.setVisible(mostra).setPosition(g.x, g.y);
    if (mostra) this.avviso.setScale(1.6 - avanzamento);
  }

  azzera(t, g) {
    this.punto = { x: g.x, y: g.y };
    this.inizio = t;
    this.arrivi = 0;
  }

  // Un gruppo di nemici compare attorno al giocatore, ogni volta più vicino
  fattiRaggiungere() {
    const scena = this.scena;
    const g = scena.giocatore;
    const distanze = ANTI_FERMO.distanze;
    const d = distanze[Math.min(this.arrivi, distanze.length - 1)];
    this.arrivi++;
    const centro = scena.arena.puntoComparsa(g.x, g.y, d - 20, d + 20);
    for (let i = 0; i < ANTI_FERMO.nemici; i++) {
      const p = scena.arena.limita(centro.x + Phaser.Math.Between(-40, 40), centro.y + Phaser.Math.Between(-40, 40));
      generaNemico(scena, scena.round.tipoCasuale(), p.x, p.y);
    }
  }

  nascondi() {
    this.avviso.setVisible(false);
  }
}
