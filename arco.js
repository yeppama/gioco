// ============================================================
// ARCO - frecce, faretra, ricarica e colpo caricato
//
// L'arco spara da solo alle spalle del giocatore (direzione del mirino).
// Ogni raffica costa 1 freccia della faretra; a faretra vuota si ricarica.
// Tenendo premuto Spazio (o il pulsante sul telefono) l'arco smette di sparare
// e mette da parte frecce: al rilascio partono tutte insieme e perforano.
// ============================================================

class Arco {
  constructor(scena) {
    this.scena = scena;
    this.frecce = scena.physics.add.group();
    this.frecceRimaste = scena.stats.frecceFaretra;
    this.inRicarica = false;
    this.fineRicarica = 0;
    this.prossimoSparo = 0;
    this.prossimaOnda = 0;
    this.prossimoCircolare = 0;
    // Colpo caricato
    this.staCaricando = false;
    this.carica = 0;            // frecce messe da parte
    this.prossimaCarica = 0;
    this.indicatore = scena.add.circle(0, 0, 22).setStrokeStyle(3, 0x7fd6ff, 0.9).setVisible(false);
  }

  get stats() {
    return this.scena.stats;
  }

  iniziaRicarica(t) {
    this.inRicarica = true;
    this.fineRicarica = t + this.stats.ricaricaMs;
  }

  // Ricarica manuale (Ctrl): solo se la faretra non è già piena
  ricaricaManuale(t) {
    if (this.inRicarica || this.staCaricando || this.frecceRimaste >= this.stats.frecceFaretra) return;
    this.iniziaRicarica(t);
  }

  // Toglie frecce dalla faretra (schivata); restituisce false se non bastano
  consuma(quante, t) {
    if (this.inRicarica || this.frecceRimaste < quante) return false;
    this.frecceRimaste -= quante;
    if (this.frecceRimaste === 0) this.iniziaRicarica(t);
    return true;
  }

  // Chiamata ogni fotogramma. "tiene" = Spazio tenuto premuto
  aggiorna(t, tiene) {
    const g = this.scena.giocatore;
    this.gestisciCircolare(t);
    this.indicatore.setPosition(g.x, g.y).setVisible(this.staCaricando);
    if (this.staCaricando) this.indicatore.setRadius(22 + this.carica * 2.5);

    if (this.inRicarica) {
      if (t < this.fineRicarica) return;
      this.inRicarica = false; // ricarica finita
      this.frecceRimaste = this.stats.frecceFaretra;
    }

    // Si tiene premuto: niente spari normali, si accumulano frecce
    if (tiene) {
      if (!this.staCaricando) {
        this.staCaricando = true;
        this.prossimaCarica = t;
      }
      if (t >= this.prossimaCarica && this.carica < COLPO_CARICATO.massimo && this.frecceRimaste > 0) {
        this.carica++;
        this.frecceRimaste--;
        this.prossimaCarica = t + COLPO_CARICATO.intervalloMs;
      }
      return;
    }

    // Appena rilasciato: parte il colpo caricato
    if (this.staCaricando) {
      if (this.carica > 0) this.sparaCaricato();
      this.staCaricando = false;
      this.carica = 0;
      this.prossimoSparo = t + this.stats.cadenzaMs;
      if (this.frecceRimaste === 0) this.iniziaRicarica(t);
      return;
    }

    // Tiro normale automatico
    if (t >= this.prossimoSparo) {
      this.spara();
      // Una raffica costa una freccia, anche se ne partono di più (Casinò: a volte è gratis)
      if (Math.random() >= this.stats.frecciaGratis) this.frecceRimaste--;
      this.prossimoSparo = t + this.stats.cadenzaMs;
      if (this.frecceRimaste === 0) this.iniziaRicarica(t);
    }
  }

  // Una raffica: la direzione base, più le frecce extra date dalle abilità
  spara() {
    const scena = this.scena;
    const g = scena.giocatore;
    let angolo = Math.atan2(scena.direzione.y, scena.direzione.x);

    // Occhio del cacciatore: se c'è un nemico abbastanza vicino, si mira a lui
    if (this.stats.raggioMira > 0) {
      const bersaglio = scena.nemicoPiuVicino(this.stats.raggioMira);
      if (bersaglio) angolo = Phaser.Math.Angle.Between(g.x, g.y, bersaglio.x, bersaglio.y);
    }

    // Ventaglio: coppie di frecce inclinate a destra e a sinistra
    const angoli = [angolo];
    for (let i = 1; i <= this.stats.coppieDiagonali; i++) {
      const scarto = Phaser.Math.DegToRad(ANGOLO_VENTAGLIO * i);
      angoli.push(angolo - scarto, angolo + scarto);
    }

    // Freccia doppia: per ogni direzione, più frecce affiancate
    const affiancate = 1 + this.stats.frecceParallele;
    for (const a of angoli) {
      const perpendicolare = a + Math.PI / 2;
      for (let k = 0; k < affiancate; k++) {
        const spostamento = (k - (affiancate - 1) / 2) * DISTANZA_PARALLELE;
        const x = g.x + Math.cos(a) * PARTENZA_FRECCIA + Math.cos(perpendicolare) * spostamento;
        const y = g.y + Math.sin(a) * PARTENZA_FRECCIA + Math.sin(perpendicolare) * spostamento;
        // Furia cieca: ogni freccia devia un po' a caso
        const deviazione = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-1, 1) * this.stats.deviazione);
        this.lancia(x, y, a + deviazione);
      }
    }
  }

  // Colpo onda (doppio Spazio): un muro di frecce che attraversa tutto
  sparaOnda(t) {
    const scena = this.scena;
    if (this.stats.frecceFaretra < COLPO_ONDA.faretraMinima) {
      scena.interfaccia.mostraBanner(tr('b.onda', COLPO_ONDA.faretraMinima));
      return;
    }
    if (t < this.prossimaOnda || !this.consuma(COLPO_ONDA.costo, t)) {
      scena.interfaccia.lampeggiaFrecce();
      return;
    }
    this.prossimaOnda = t + COLPO_ONDA.ricaricaMs;
    const g = scena.giocatore;
    const angolo = Math.atan2(scena.direzione.y, scena.direzione.x);
    const perpendicolare = angolo + Math.PI / 2;
    for (let i = 0; i < COLPO_ONDA.frecce; i++) {
      const spostamento = (i - (COLPO_ONDA.frecce - 1) / 2) * COLPO_ONDA.spaziatura;
      this.lancia(g.x + Math.cos(perpendicolare) * spostamento, g.y + Math.sin(perpendicolare) * spostamento, angolo, {
        moltDanno: COLPO_ONDA.moltDanno, perforazioniExtra: 99, colore: 0x7fffd4, fonte: 'Colpo onda',
      });
    }
    scena.cameras.main.shake(100, 0.004);
  }

  // Tiro circolare (Vento della fortuna): frecce in tutte le direzioni, gratis
  gestisciCircolare(t) {
    if (!this.stats.tiroCircolare || t < this.prossimoCircolare) return;
    this.prossimoCircolare = t + this.intervalloCircolare() * 1000;
    const g = this.scena.giocatore;
    for (let i = 0; i < TIRO_CIRCOLARE.frecce; i++) {
      const a = (Math.PI * 2 * i) / TIRO_CIRCOLARE.frecce;
      this.lancia(g.x + Math.cos(a) * PARTENZA_FRECCIA, g.y + Math.sin(a) * PARTENZA_FRECCIA, a, { colore: 0xf7d774, fonte: 'Tiro circolare' });
    }
  }

  // Secondi tra due tiri circolari: si legge la tabella, interpolando tra i punti
  intervalloCircolare() {
    const punti = TIRO_CIRCOLARE.tempi;
    const f = this.stats.frecceFaretra;
    if (f <= punti[0][0]) return punti[0][1];
    for (let i = 1; i < punti.length; i++) {
      const [f0, s0] = punti[i - 1];
      const [f1, s1] = punti[i];
      if (f <= f1) return s0 + (s1 - s0) * (f - f0) / (f1 - f0);
    }
    return punti[punti.length - 1][1];
  }

  // Colpo caricato: tutte le frecce messe da parte, quasi parallele, che perforano
  sparaCaricato() {
    const scena = this.scena;
    const g = scena.giocatore;
    const angolo = Math.atan2(scena.direzione.y, scena.direzione.x);
    const apertura = Phaser.Math.DegToRad(COLPO_CARICATO.apertura);
    for (let i = 0; i < this.carica; i++) {
      const a = angolo + (i - (this.carica - 1) / 2) * apertura;
      this.lancia(g.x + Math.cos(a) * PARTENZA_FRECCIA, g.y + Math.sin(a) * PARTENZA_FRECCIA, a, {
        moltDanno: COLPO_CARICATO.moltDanno,
        perforazioniExtra: COLPO_CARICATO.perforazioniExtra,
        colore: 0x7fd6ff,
        fonte: 'Colpo caricato',
      });
    }
    scena.cameras.main.shake(80, 0.003);
  }

  // Le frecce non vengono distrutte: si riusano (più veloce con tante frecce)
  lancia(x, y, angolo, opzioni = {}) {
    let f = this.frecce.getFirstDead(false);
    if (!f) {
      f = this.scena.add.rectangle(0, 0, LATO_FRECCIA, LATO_FRECCIA, 0xf2e6b8);
      this.frecce.add(f);
      f.body.setBounce(1); // serve per Rimbalzo: sugli ostacoli torna indietro
    }
    f.setFillStyle(opzioni.colore || 0xf2e6b8);
    f.moltDanno = opzioni.moltDanno || 1;
    f.fonte = opzioni.fonte || 'Frecce';
    f.rimbalziRimasti = this.stats.rimbalzi;
    f.perforazioniRimaste = this.stats.perforazioni + (opzioni.perforazioniExtra || 0);
    f.colpiti = new Set(); // nemici già colpiti da questa freccia (non due volte lo stesso)
    f.setActive(true).setVisible(true);
    f.body.enable = true;
    f.body.reset(x, y);
    f.body.setVelocity(Math.cos(angolo) * VELOCITA_FRECCIA, Math.sin(angolo) * VELOCITA_FRECCIA);
  }

  suOstacolo(f) {
    if (f.rimbalziRimasti > 0) {
      f.rimbalziRimasti--;   // la fisica l'ha già fatta rimbalzare
      f.colpiti.clear();     // dopo un rimbalzo può colpire di nuovo
    } else {
      this.disattiva(f);
    }
  }

  suNemico(f, n) {
    if (!f.active || f.colpiti.has(n)) return;
    f.colpiti.add(n);
    this.scena.applicaEffetti(n);
    colpisciNemico(this.scena, n, this.scena.dannoFreccia() * f.moltDanno, f.fonte);
    if (f.perforazioniRimaste > 0) {
      f.perforazioniRimaste--; // la attraversa e continua
    } else {
      this.disattiva(f);
    }
  }

  // Bordi dell'arena: con Rimbalzo la freccia torna indietro, altrimenti sparisce
  controllaBordi() {
    const arena = this.scena.arena;
    for (const f of this.frecce.getChildren()) {
      if (!f.active) continue;
      const fuoriX = f.x < 0 || f.x > arena.l;
      const fuoriY = f.y < 0 || f.y > arena.a;
      if (!fuoriX && !fuoriY) continue;
      if (f.rimbalziRimasti > 0) {
        f.rimbalziRimasti--;
        f.colpiti.clear();
        if (fuoriX) f.body.velocity.x *= -1;
        if (fuoriY) f.body.velocity.y *= -1;
        f.setPosition(Phaser.Math.Clamp(f.x, 0, arena.l), Phaser.Math.Clamp(f.y, 0, arena.a));
      } else {
        this.disattiva(f);
      }
    }
  }

  disattiva(f) {
    f.setActive(false).setVisible(false);
    f.body.stop();
    f.body.enable = false;
  }

  disattivaTutte() {
    for (const f of this.frecce.getChildren()) if (f.active) this.disattiva(f);
  }

  nascondi() {
    this.indicatore.setVisible(false);
  }
}
