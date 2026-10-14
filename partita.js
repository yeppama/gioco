// ============================================================
// SCENA PARTITA - arena, giocatore, arco, nemici, vita e morte
// ============================================================

class ScenaPartita extends Phaser.Scene {
  constructor() {
    super('partita');
  }

  // create() viene eseguita UNA volta, quando la scena parte (o riparte)
  create() {
    this.vita = VITA_MAX;
    this.morto = false;
    this.ultimoColpo = -Infinity; // momento dell'ultimo danno subito
    this.prossimoSparo = 0;       // da quando si può sparare di nuovo
    this.direzione = { x: 1, y: 0 }; // dove guarda il giocatore (all'inizio a destra)

    // --- Ostacoli: rettangoli grigi che non si muovono ---
    this.ostacoli = this.physics.add.staticGroup();
    for (const o of OSTACOLI) {
      const blocco = this.add.rectangle(o.x, o.y, o.l, o.a, 0x55555f);
      this.physics.add.existing(blocco, true); // true = fermo, non viene spinto
      this.ostacoli.add(blocco);
    }

    // --- Mappa dei percorsi per i nemici ---
    this.flowField = new FlowField(LARGHEZZA, ALTEZZA, CELLA_FLOW, OSTACOLI, MARGINE_FLOW);

    // --- Giocatore: quadrato azzurro al centro ---
    this.giocatore = this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LATO_GIOCATORE, LATO_GIOCATORE, 0x4fa3ff);
    this.physics.add.existing(this.giocatore);
    this.giocatore.body.setCollideWorldBounds(true); // non esce dall'arena

    // Il mirino: un puntino davanti al giocatore che mostra dove sparerà
    this.mirino = this.add.rectangle(0, 0, 6, 6, 0xffffff);

    // --- Gruppi: frecce e nemici ---
    this.frecce = this.physics.add.group();
    this.nemici = this.physics.add.group();
    generaNemico(this, 'inseguitore');
    generaNemico(this, 'caricatore');

    // --- Collisioni ---
    this.physics.add.collider(this.giocatore, this.ostacoli);
    this.physics.add.collider(this.nemici, this.ostacoli);
    this.physics.add.collider(this.nemici, this.nemici); // i nemici non si sovrappongono
    this.physics.add.collider(this.frecce, this.ostacoli, (freccia) => this.disattivaFreccia(freccia));
    this.physics.add.overlap(this.frecce, this.nemici, (freccia, nemico) => {
      if (!freccia.active) return;
      this.disattivaFreccia(freccia);
      colpisciNemico(this, nemico, DANNO_FRECCIA);
    });
    this.physics.add.overlap(this.giocatore, this.nemici, (giocatore, nemico) => this.subisciDanno(nemico.dati.danno));

    // --- Tasti ---
    this.frecceTastiera = this.input.keyboard.createCursorKeys();
    this.tasti = this.input.keyboard.addKeys('W,A,S,D,R');

    // --- Interfaccia ---
    this.testoVita = this.add.text(16, 16, '', { fontSize: '20px', color: '#ffffff' });
    this.aggiornaTestoVita();
  }

  // update() viene eseguita OGNI fotogramma (circa 60 volte al secondo)
  update(time) {
    if (this.morto) {
      if (Phaser.Input.Keyboard.JustDown(this.tasti.R)) this.scene.restart();
      return;
    }

    const inMovimento = this.muoviGiocatore();

    // Il mirino sta sempre davanti al giocatore
    this.mirino.setPosition(this.giocatore.x + this.direzione.x * 24, this.giocatore.y + this.direzione.y * 24);

    // Da fermo si spara, a intervalli regolari
    if (!inMovimento && time >= this.prossimoSparo) {
      this.spara();
      this.prossimoSparo = time + CADENZA_MS;
    }

    // Nemici: prima si aggiorna la mappa dei percorsi, poi ognuno si muove
    this.flowField.aggiorna(this.giocatore.x, this.giocatore.y);
    for (const n of this.nemici.getChildren().slice()) aggiornaNemico(this, n, time);

    // Le frecce uscite dall'arena tornano disponibili
    for (const f of this.frecce.getChildren()) {
      if (f.active && (f.x < 0 || f.x > LARGHEZZA || f.y < 0 || f.y > ALTEZZA)) this.disattivaFreccia(f);
    }

    // Lampeggio mentre si è invulnerabili dopo un colpo
    const invulnerabile = time - this.ultimoColpo < INVULNERABILITA_MS;
    this.giocatore.setAlpha(invulnerabile && Math.floor(time / 80) % 2 === 0 ? 0.3 : 1);
  }

  // Muove il giocatore e restituisce true se si sta muovendo
  muoviGiocatore() {
    let dx = 0; // -1 sinistra, 1 destra
    let dy = 0; // -1 su, 1 giù

    if (this.tasti.A.isDown || this.frecceTastiera.left.isDown) dx = -1;
    if (this.tasti.D.isDown || this.frecceTastiera.right.isDown) dx = 1;
    if (this.tasti.W.isDown || this.frecceTastiera.up.isDown) dy = -1;
    if (this.tasti.S.isDown || this.frecceTastiera.down.isDown) dy = 1;

    // In diagonale si andrebbe più veloci: normalizziamo
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    const inMovimento = dx !== 0 || dy !== 0;
    if (inMovimento) this.direzione = { x: dx, y: dy }; // ricorda dove guarda

    this.giocatore.body.setVelocity(dx * VELOCITA, dy * VELOCITA);
    return inMovimento;
  }

  // Le frecce non vengono distrutte: si riusano (più veloce con tante frecce)
  spara() {
    let f = this.frecce.getFirstDead(false);
    if (!f) {
      f = this.add.rectangle(0, 0, LATO_FRECCIA, LATO_FRECCIA, 0xf2e6b8);
      this.frecce.add(f);
    }
    const partenzaX = this.giocatore.x + this.direzione.x * 20;
    const partenzaY = this.giocatore.y + this.direzione.y * 20;
    f.setActive(true).setVisible(true);
    f.body.enable = true;
    f.body.reset(partenzaX, partenzaY);
    f.body.setVelocity(this.direzione.x * VELOCITA_FRECCIA, this.direzione.y * VELOCITA_FRECCIA);
  }

  disattivaFreccia(f) {
    f.setActive(false).setVisible(false);
    f.body.stop();
    f.body.enable = false;
  }

  subisciDanno(danno) {
    const adesso = this.time.now;
    if (this.morto || adesso - this.ultimoColpo < INVULNERABILITA_MS) return;

    this.ultimoColpo = adesso;
    this.vita = Math.max(0, this.vita - danno);
    this.aggiornaTestoVita();
    this.cameras.main.shake(100, 0.005); // piccolo scossone dello schermo

    if (this.vita === 0) this.muori();
  }

  muori() {
    this.morto = true;
    this.giocatore.body.setVelocity(0, 0);
    for (const n of this.nemici.getChildren()) n.body.setVelocity(0, 0);
    this.giocatore.setAlpha(1);
    this.giocatore.setFillStyle(0x333344); // il giocatore diventa grigio
    this.mirino.setVisible(false);

    this.add.text(LARGHEZZA / 2, ALTEZZA / 2, 'SEI MORTO\nPremi R per ricominciare', {
      fontSize: '32px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
  }

  aggiornaTestoVita() {
    this.testoVita.setText('Vita: ' + this.vita + ' / ' + VITA_MAX);
  }
}
