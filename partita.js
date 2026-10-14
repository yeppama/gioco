// ============================================================
// SCENA PARTITA - arena, giocatore, un nemico, vita e morte
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

    // --- Ostacoli: rettangoli grigi che non si muovono ---
    this.ostacoli = this.physics.add.staticGroup();
    for (const o of OSTACOLI) {
      const blocco = this.add.rectangle(o.x, o.y, o.l, o.a, 0x55555f);
      this.physics.add.existing(blocco, true); // true = fermo, non viene spinto
      this.ostacoli.add(blocco);
    }

    // --- Giocatore: quadrato azzurro al centro ---
    this.giocatore = this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LATO_GIOCATORE, LATO_GIOCATORE, 0x4fa3ff);
    this.physics.add.existing(this.giocatore);
    this.giocatore.body.setCollideWorldBounds(true); // non esce dall'arena

    // --- Nemico: quadrato rosso nell'angolo in alto a sinistra ---
    this.nemico = this.add.rectangle(60, 60, LATO_NEMICO, LATO_NEMICO, 0xe0453a);
    this.physics.add.existing(this.nemico);
    this.nemico.body.setCollideWorldBounds(true);

    // --- Collisioni ---
    this.physics.add.collider(this.giocatore, this.ostacoli); // il giocatore sbatte sugli ostacoli
    this.physics.add.collider(this.nemico, this.ostacoli);    // anche il nemico
    // Quando giocatore e nemico si toccano, chiama subisciDanno
    this.physics.add.overlap(this.giocatore, this.nemico, () => this.subisciDanno());

    // --- Tasti ---
    this.frecce = this.input.keyboard.createCursorKeys();
    this.tasti = this.input.keyboard.addKeys('W,A,S,D,R');

    // --- Interfaccia ---
    this.testoVita = this.add.text(16, 16, '', { fontSize: '20px', color: '#ffffff' });
    this.aggiornaTestoVita();
  }

  // update() viene eseguita OGNI fotogramma (circa 60 volte al secondo)
  update(time) {
    if (this.morto) {
      // R per ricominciare
      if (Phaser.Input.Keyboard.JustDown(this.tasti.R)) this.scene.restart();
      return;
    }

    this.muoviGiocatore();

    // Il nemico va verso il giocatore
    this.physics.moveToObject(this.nemico, this.giocatore, VELOCITA_NEMICO);

    // Lampeggio mentre si è invulnerabili dopo un colpo
    const invulnerabile = time - this.ultimoColpo < INVULNERABILITA_MS;
    this.giocatore.setAlpha(invulnerabile && Math.floor(time / 80) % 2 === 0 ? 0.3 : 1);
  }

  muoviGiocatore() {
    let dx = 0; // -1 sinistra, 1 destra
    let dy = 0; // -1 su, 1 giù

    if (this.tasti.A.isDown || this.frecce.left.isDown) dx = -1;
    if (this.tasti.D.isDown || this.frecce.right.isDown) dx = 1;
    if (this.tasti.W.isDown || this.frecce.up.isDown) dy = -1;
    if (this.tasti.S.isDown || this.frecce.down.isDown) dy = 1;

    // In diagonale si andrebbe più veloci: normalizziamo
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    // Ora diamo una velocità al corpo fisico, così le collisioni funzionano
    this.giocatore.body.setVelocity(dx * VELOCITA, dy * VELOCITA);
  }

  subisciDanno() {
    const adesso = this.time.now;
    if (this.morto || adesso - this.ultimoColpo < INVULNERABILITA_MS) return;

    this.ultimoColpo = adesso;
    this.vita = Math.max(0, this.vita - DANNO_NEMICO);
    this.aggiornaTestoVita();
    this.cameras.main.shake(100, 0.005); // piccolo scossone dello schermo

    if (this.vita === 0) this.muori();
  }

  muori() {
    this.morto = true;
    this.giocatore.body.setVelocity(0, 0);
    this.nemico.body.setVelocity(0, 0);
    this.giocatore.setAlpha(1);
    this.giocatore.setFillStyle(0x333344); // il giocatore diventa grigio

    this.add.text(LARGHEZZA / 2, ALTEZZA / 2, 'SEI MORTO\nPremi R per ricominciare', {
      fontSize: '32px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
  }

  aggiornaTestoVita() {
    this.testoVita.setText('Vita: ' + this.vita + ' / ' + VITA_MAX);
  }
}
