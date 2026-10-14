// ============================================================
// LAME ORBITANTI - la prima evocazione
// Girano attorno al giocatore e feriscono i nemici che toccano.
// Ogni nemico può essere colpito da una lama solo ogni LAME.intervalloColpoMs,
// altrimenti chi resta a contatto morirebbe all'istante.
// ============================================================

class LameOrbitanti {
  constructor(scena) {
    this.scena = scena;
    this.gruppo = scena.physics.add.group();
    scena.physics.add.overlap(this.gruppo, scena.nemici, (lama, nemico) => this.colpisci(nemico));
  }

  // Chiamata ogni fotogramma
  aggiorna(t) {
    const quante = this.scena.stats.lame;
    if (quante === 0) return;

    // Crea le lame mancanti (quando si prende un nuovo livello dell'abilità).
    // Si conta prima quante ne servono: un ciclo "finché mancano" rischierebbe di non finire mai.
    const mancanti = quante - this.gruppo.getLength();
    for (let i = 0; i < mancanti; i++) {
      const lama = this.scena.add.rectangle(0, 0, LAME.lato, LAME.lato, 0xc9d6e3).setStrokeStyle(2, 0xffffff);
      this.gruppo.add(lama);
    }
    const lame = this.gruppo.getChildren();

    // Distribuite in modo uniforme sul cerchio, che ruota col tempo
    const giro = (t / 1000) * LAME.giriAlSecondo * Math.PI * 2;
    const g = this.scena.giocatore;
    lame.forEach((lama, i) => {
      const a = giro + (Math.PI * 2 * i) / quante;
      lama.setPosition(g.x + Math.cos(a) * LAME.raggio, g.y + Math.sin(a) * LAME.raggio);
      lama.setRotation(a);
    });
  }

  colpisci(n) {
    const t = this.scena.tempo;
    if (!n.active || t - n.ultimoColpoLama < LAME.intervalloColpoMs) return;
    n.ultimoColpoLama = t;
    colpisciNemico(this.scena, n, LAME.danno * this.scena.stats.dannoMolt, 'Lame orbitanti');
  }

  nascondi() {
    for (const lama of this.gruppo.getChildren()) lama.setVisible(false);
  }
}
