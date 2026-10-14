// ============================================================
// COMBATTIMENTO - danni ai nemici e regole delle benedizioni
//
// Danno delle frecce, effetti elementali, mira automatica, dove i nemici
// ti vedono (Ombra lenta), cosa succede a ogni uccisione, Ricarica sacra.
//
// Sono "pezzi" della scena partita, messi in un file a parte per
// non avere un unico file enorme. In fondo a partita.js una riga li
// aggiunge alla scena (Object.assign): dentro, "this" è sempre la scena.
// ============================================================

const METODI_COMBATTIMENTO = {
  // Danno di una freccia in questo momento
  // (Ultimo respiro lo raddoppia a vita bassa, Sete di battaglia cresce con le uccisioni)
  dannoFreccia() {
    const ultimo = this.vitaCritica() ? BENEDIZIONI.ultimorespiro.danno : 1;
    return this.stats.danno * ultimo * (1 + this.seteBonus);
  },

  // Dove i nemici credono che tu sia: di solito dove sei, ma con Ombra lenta
  // dopo una schivata guardano il punto da cui sei partito
  vista() {
    if (this.tempo >= this.invisibileFino) return this.giocatore;
    return { x: this.puntoVisto.x, y: this.puntoVisto.y, body: { velocity: { x: 0, y: 0 } } };
  },

  // Chiamata da nemici.js a ogni uccisione: effetti delle benedizioni
  alUccidere() {
    // Patto di sangue: ogni uccisione costa vita (ma non uccide mai)
    if (this.stats.vitaPerUccisione > 0) this.vita = Math.max(1, this.vita - this.stats.vitaPerUccisione);
    // Faretra benedetta: frecce restituite
    this.arco.restituisci(this.stats.frecceUccisione);
    // Sete di battaglia: danno in più fino a fine round
    if (this.stats.setePerUccisione > 0) {
      this.seteBonus = Math.min(BENEDIZIONI.setebattaglia.dannoMassimo, this.seteBonus + this.stats.setePerUccisione);
    }
  },

  // Ricarica sacra: i nemici vicini (non i boss) vengono spinti via
  respingiNemici(t) {
    const R = BENEDIZIONI.ricaricasacra;
    const g = this.giocatore;
    const onda = this.add.circle(g.x, g.y, R.raggioSpinta, 0xf7d774, 0.15).setStrokeStyle(2, 0xf7d774, 0.7);
    this.time.delayedCall(180, () => onda.destroy());
    for (const n of this.nemici.getChildren()) {
      if (n.eBoss || Phaser.Math.Distance.Between(g.x, g.y, n.x, n.y) > R.raggioSpinta) continue;
      const a = Phaser.Math.Angle.Between(g.x, g.y, n.x, n.y);
      n.body.setVelocity(Math.cos(a) * R.forzaSpinta, Math.sin(a) * R.forzaSpinta);
      n.spintaFino = t + R.durataSpintaMs;
    }
  },

  // Frecce infuocate e di brina
  applicaEffetti(n) {
    const t = this.tempo;
    const resistenza = resistenzaDi(this, n); // élite e nemici dopo i boss resistono agli elementi
    if (this.stats.fuocoDanno > 0) {
      if (t >= n.bruciaFino) n.prossimaBruciatura = t + INTERVALLO_FUOCO_MS;
      n.bruciaFino = t + DURATA_FUOCO_MS;
      n.dannoFuoco = this.stats.fuocoDanno * this.stats.dannoMolt * (1 - resistenza);
    }
    if (this.stats.geloRallenta > 0) {
      n.rallentatoFino = t + DURATA_GELO_MS;
      const gelo = n.eBoss ? this.stats.geloRallenta / 2 : this.stats.geloRallenta;
      n.rallentamento = gelo * (1 - resistenza);
    }
  },

  nemicoPiuVicino(raggio) {
    let migliore = null;
    let distanzaMigliore = raggio;
    for (const n of this.nemici.getChildren()) {
      const d = Phaser.Math.Distance.Between(this.giocatore.x, this.giocatore.y, n.x, n.y);
      if (d < distanzaMigliore) {
        distanzaMigliore = d;
        migliore = n;
      }
    }
    return migliore;
  },

  // Per il riepilogo di fine run: quanti danni ha fatto ogni fonte
  registraDanno(fonte, quantita) {
    this.danniPerFonte[fonte] = (this.danniPerFonte[fonte] || 0) + quantita;
  },
};
