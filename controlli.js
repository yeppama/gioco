// ============================================================
// CONTROLLI - tastiera (PC) e touch (telefono) nello stesso posto
//
// La partita non sa se stai usando la tastiera o il dito:
// chiede solo "dove vuole andare?", "vuole schivare?", "sta caricando?",
// "vuole la pausa?".
//
// Tastiera: WASD/frecce, Shift schivata, Spazio colpo caricato, Ctrl ricarica, Esc o P pausa.
// Touch:
//  - metà destra: appoggia il dito dove vuoi, compare un joystick
//  - metà sinistra: un tocco = schivata
//  - pulsante "Carica" in basso a sinistra: tienilo premuto per il colpo caricato
//  - pulsante pausa in alto a destra
// ============================================================

class Controlli {
  constructor(scena) {
    this.scena = scena;
    const touch = scena.sys.game.device.input.touch;

    // --- Tastiera ---
    this.frecceTastiera = scena.input.keyboard.createCursorKeys();
    this.tasti = scena.input.keyboard.addKeys('W,A,S,D,R,SHIFT,SPACE,ESC,P,CTRL');
    this.tastiDebug = scena.input.keyboard.addKeys('L,I,N,B,M'); // usati solo con ?debug=1

    // --- Touch ---
    scena.input.addPointer(2);   // fino a tre dita insieme (joystick + carica + schivata)
    this.dito = null;            // id del dito che sta usando il joystick
    this.centro = { x: 0, y: 0 };
    this.joystick = { x: 0, y: 0 };
    this.schivataTouch = false;  // diventa true quando si tocca la metà sinistra
    this.tocco = false;          // diventa true a ogni tocco (serve per ricominciare)
    this.ditoCarica = null;      // id del dito sul pulsante di carica
    this.richiestaPausa = false; // la imposta il pulsante pausa (o la pausa automatica)

    // Disegno del joystick: un cerchio grande (base) e uno piccolo (pomello).
    // setScrollFactor(0) = resta fermo sullo schermo anche quando la telecamera si muove
    this.base = scena.add.circle(0, 0, RAGGIO_JOYSTICK, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.3).setDepth(30).setScrollFactor(0).setVisible(false);
    this.pomello = scena.add.circle(0, 0, 22, 0xffffff, 0.35).setDepth(30).setScrollFactor(0).setVisible(false);

    // Pulsante pausa (sempre visibile: si può usare anche col mouse)
    this.pulsantePausa = scena.add.circle(LARGHEZZA - 34, 34, 20, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.4).setDepth(30).setScrollFactor(0).setInteractive();
    scena.add.text(LARGHEZZA - 34, 34, 'II', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(31).setScrollFactor(0);

    // Pulsante del colpo caricato (solo sui dispositivi touch)
    this.pulsanteCarica = null;
    if (touch) {
      this.pulsanteCarica = scena.add.circle(70, ALTEZZA - 110, 42, 0x7fd6ff, 0.15)
        .setStrokeStyle(2, 0x7fd6ff, 0.6).setDepth(30).setScrollFactor(0).setInteractive();
      scena.add.text(70, ALTEZZA - 110, 'Carica', { fontSize: '14px', color: '#7fd6ff' })
        .setOrigin(0.5).setDepth(31).setScrollFactor(0);
    }

    // "sopra" = gli oggetti cliccabili sotto il dito (i pulsanti)
    scena.input.on('pointerdown', (p, sopra) => this.ditoGiu(p, sopra));
    scena.input.on('pointermove', (p) => this.ditoMuove(p));
    scena.input.on('pointerup', (p) => this.ditoSu(p));
    scena.input.on('pointerupoutside', (p) => this.ditoSu(p));
  }

  ditoGiu(p, sopra = []) {
    this.tocco = true;
    // I pulsanti hanno la precedenza su joystick e schivata
    if (sopra.includes(this.pulsantePausa)) {
      this.richiestaPausa = true;
      return;
    }
    if (this.pulsanteCarica && sopra.includes(this.pulsanteCarica)) {
      this.ditoCarica = p.id;
      return;
    }
    if (p.x >= LARGHEZZA / 2) {
      if (this.dito !== null) return; // il joystick è già in uso
      this.dito = p.id;
      this.centro = { x: p.x, y: p.y };
      this.joystick = { x: 0, y: 0 };
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.pomello.setPosition(p.x, p.y).setVisible(true);
    } else {
      this.schivataTouch = true;
    }
  }

  ditoMuove(p) {
    if (p.id !== this.dito) return;
    const dx = p.x - this.centro.x;
    const dy = p.y - this.centro.y;
    const distanza = Math.hypot(dx, dy);

    // Il pomello non esce dal cerchio
    const limite = Math.min(distanza, RAGGIO_JOYSTICK);
    const angolo = Math.atan2(dy, dx);
    this.pomello.setPosition(this.centro.x + Math.cos(angolo) * limite, this.centro.y + Math.sin(angolo) * limite);

    // Una piccola zona morta al centro, così non si cammina per sbaglio
    if (distanza < RAGGIO_JOYSTICK * 0.25) {
      this.joystick = { x: 0, y: 0 };
    } else {
      this.joystick = { x: dx / distanza, y: dy / distanza }; // lunghezza 1, come la tastiera
    }
  }

  ditoSu(p) {
    if (p.id === this.ditoCarica) this.ditoCarica = null;
    if (p.id !== this.dito) return;
    this.dito = null;
    this.joystick = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.pomello.setVisible(false);
  }

  // Direzione voluta: { x, y } di lunghezza 1, oppure { 0, 0 } se fermo
  direzione() {
    let dx = 0;
    let dy = 0;
    if (this.tasti.A.isDown || this.frecceTastiera.left.isDown) dx = -1;
    if (this.tasti.D.isDown || this.frecceTastiera.right.isDown) dx = 1;
    if (this.tasti.W.isDown || this.frecceTastiera.up.isDown) dy = -1;
    if (this.tasti.S.isDown || this.frecceTastiera.down.isDown) dy = 1;

    if (dx === 0 && dy === 0) return { ...this.joystick }; // nessun tasto: si usa il joystick

    // In diagonale si andrebbe più veloci: normalizziamo
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    return { x: dx, y: dy };
  }

  // true una volta sola per ogni pressione di Shift o tocco a sinistra
  schivata() {
    const tasto = Phaser.Input.Keyboard.JustDown(this.tasti.SHIFT);
    const touch = this.schivataTouch;
    this.schivataTouch = false;
    return tasto || touch;
  }

  // true finché si tiene premuto Spazio o il pulsante Carica
  caricaPremuta() {
    return this.tasti.SPACE.isDown || this.ditoCarica !== null;
  }

  // true una volta sola per ogni pressione di Ctrl
  ricaricaManuale() {
    return Phaser.Input.Keyboard.JustDown(this.tasti.CTRL);
  }

  // true una volta sola per ogni pressione di Esc, P o del pulsante pausa
  pausaRichiesta() {
    const tasto = Phaser.Input.Keyboard.JustDown(this.tasti.ESC) || Phaser.Input.Keyboard.JustDown(this.tasti.P);
    const richiesta = this.richiestaPausa;
    this.richiestaPausa = false;
    return tasto || richiesta;
  }

  // Dopo la pausa: Esc/P premuti per chiuderla non devono riaprirla subito
  dimenticaTastiPausa() {
    Phaser.Input.Keyboard.JustDown(this.tasti.ESC);
    Phaser.Input.Keyboard.JustDown(this.tasti.P);
    this.richiestaPausa = false;
  }

  // Dopo la morte: R oppure un tocco qualsiasi
  ricomincia() {
    const tasto = Phaser.Input.Keyboard.JustDown(this.tasti.R);
    const touch = this.tocco;
    this.tocco = false;
    return tasto || touch;
  }

  // Lascia andare joystick e carica (prima di una pausa, così non restano "incastrati")
  rilascia() {
    if (this.dito !== null) this.ditoSu({ id: this.dito });
    this.ditoCarica = null;
    this.schivataTouch = false;
  }

  // Tasti della modalità debug: true una volta per pressione
  tastoDebug(nome) {
    return Phaser.Input.Keyboard.JustDown(this.tastiDebug[nome]);
  }

  // Dimentica i tocchi vecchi (si chiama quando si muore,
  // così il dito che stava giocando non fa ripartire subito la partita)
  azzeraTocchi() {
    this.tocco = false;
    this.schivataTouch = false;
  }
}
