// ============================================================
// CONTROLLI - per ora solo tastiera (la versione per telefono è sospesa
// finché non decidiamo l'interfaccia giusta)
//
// La partita non sa quali tasti usi: chiede solo "dove vuole andare?",
// "vuole schivare?", "sta caricando?", "vuole la pausa?"...
//
// WASD/frecce: muoversi        Shift: schivata
// Spazio tenuto: colpo caricato   Spazio due volte di fila: colpo onda
// Ctrl: ricarica                Esc o P: pausa      R: ricomincia (da morto)
// ============================================================

class Controlli {
  constructor(scena) {
    this.scena = scena;
    this.frecceTastiera = scena.input.keyboard.createCursorKeys();
    this.tasti = scena.input.keyboard.addKeys('W,A,S,D,R,SHIFT,SPACE,ESC,P,CTRL');
    this.tastiDebug = scena.input.keyboard.addKeys('L,I,N,B,M'); // usati solo con ?debug=1
    this.richiestaPausa = false; // la imposta la pausa automatica (cambio di scheda)
    this.ultimoSpazio = -Infinity; // quando è stato premuto Spazio l'ultima volta (per il doppio tocco)
    this.ondaRichiesta = false;

    // Doppia pressione di Spazio: si controlla al momento della pressione
    this.tasti.SPACE.on('down', () => {
      const adesso = scena.time.now;
      if (adesso - this.ultimoSpazio < DOPPIO_SPAZIO_MS) {
        this.ondaRichiesta = true;
        this.ultimoSpazio = -Infinity;
      } else {
        this.ultimoSpazio = adesso;
      }
    });
  }

  // Direzione voluta: { x, y } di lunghezza 1, oppure { 0, 0 } se fermo
  direzione() {
    let dx = 0;
    let dy = 0;
    if (this.tasti.A.isDown || this.frecceTastiera.left.isDown) dx = -1;
    if (this.tasti.D.isDown || this.frecceTastiera.right.isDown) dx = 1;
    if (this.tasti.W.isDown || this.frecceTastiera.up.isDown) dy = -1;
    if (this.tasti.S.isDown || this.frecceTastiera.down.isDown) dy = 1;

    // In diagonale si andrebbe più veloci: normalizziamo
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    return { x: dx, y: dy };
  }

  // true una volta sola per ogni pressione di Shift
  schivata() {
    return Phaser.Input.Keyboard.JustDown(this.tasti.SHIFT);
  }

  // true se Spazio è tenuto premuto da un po' (un tocco veloce non conta,
  // così il doppio tocco per il colpo onda non fa partire anche la carica)
  caricaPremuta() {
    return this.tasti.SPACE.isDown && this.tasti.SPACE.getDuration() >= COLPO_CARICATO.sogliaMs;
  }

  // true una volta sola dopo un doppio tocco di Spazio
  onda() {
    const richiesta = this.ondaRichiesta;
    this.ondaRichiesta = false;
    return richiesta;
  }

  // true una volta sola per ogni pressione di Ctrl
  ricaricaManuale() {
    return Phaser.Input.Keyboard.JustDown(this.tasti.CTRL);
  }

  // true una volta sola per ogni pressione di Esc o P (o pausa automatica)
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

  // Dopo la morte: R
  ricomincia() {
    return Phaser.Input.Keyboard.JustDown(this.tasti.R);
  }

  // Prima di una pausa: dimentica le richieste in sospeso
  rilascia() {
    this.ondaRichiesta = false;
  }

  // Tasti della modalità debug: true una volta per pressione
  tastoDebug(nome) {
    return Phaser.Input.Keyboard.JustDown(this.tastiDebug[nome]);
  }

  // Si chiama quando si muore: niente da azzerare con la sola tastiera
  azzeraTocchi() {}
}
