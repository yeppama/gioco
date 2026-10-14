// ============================================================
// INTERFACCIA - tutto ciò che si legge sullo schermo durante la partita
// ============================================================

const COLORE_FRECCE = '#f2e6b8';

class Interfaccia {
  constructor(scena) {
    this.scena = scena;
    const testo = (x, y, colore, grandezza) =>
      scena.add.text(x, y, '', { fontSize: grandezza || '18px', color: colore }).setDepth(20);

    // Barra dell'esperienza: una striscia sottile in cima allo schermo
    scena.add.rectangle(0, 0, LARGHEZZA, 6, 0x2a2a35).setOrigin(0, 0).setDepth(20);
    this.barraExp = scena.add.rectangle(0, 0, 0, 6, 0x6fd36f).setOrigin(0, 0).setDepth(21);

    // In alto a sinistra: vita, frecce, livello
    this.testoVita = testo(16, 14, '#ffffff');
    this.testoFrecce = testo(16, 38, COLORE_FRECCE);
    this.testoLivello = testo(16, 62, '#6fd36f');

    // In alto al centro: round e tempo rimasto
    this.testoRound = testo(LARGHEZZA / 2, 14, '#ffffff').setOrigin(0.5, 0);
    this.testoTimer = testo(LARGHEZZA / 2, 38, '#8a8a99').setOrigin(0.5, 0);

    // Scritta grande al centro (inizio e fine round)
    this.banner = scena.add.text(LARGHEZZA / 2, ALTEZZA / 2 - 120, '', {
      fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    // Barra di ricarica sotto il giocatore, visibile solo mentre ricarica
    this.barraRicarica = scena.add.rectangle(0, 0, 0, 4, 0xf2e6b8).setOrigin(0, 0.5).setDepth(20).setVisible(false);

    // Promemoria dei comandi: diverso su telefono e su PC
    const touch = scena.sys.game.device.input.touch;
    const aiuto = touch
      ? 'Tocca a sinistra: schivata (frecce)   Destra: joystick'
      : 'WASD: muoviti   Shift: schivata (costa frecce)';
    scena.add.text(16, ALTEZZA - 28, aiuto, { fontSize: '15px', color: '#8a8a99' }).setDepth(20);

    if (scena.debug) {
      scena.add.text(LARGHEZZA - 16, ALTEZZA - 28, 'DEBUG  L: livello  I: invincibile  N: round dopo', {
        fontSize: '14px', color: '#ff6b6b',
      }).setOrigin(1, 0).setDepth(20);
    }
  }

  // Chiamata ogni fotogramma: legge i valori dalla partita e aggiorna i testi
  aggiorna(t) {
    const s = this.scena;
    this.testoVita.setText('Vita: ' + Math.ceil(s.vita) + ' / ' + s.stats.vitaMax + (s.invincibileDebug ? '  (invincibile)' : ''));
    this.testoLivello.setText('Livello ' + s.livello);
    this.barraExp.setSize(LARGHEZZA * Phaser.Math.Clamp(s.exp / s.expNecessaria, 0, 1), 6);

    // Round e timer
    this.testoRound.setText(s.round.numero > 0 ? 'Round ' + s.round.numero : '');
    const secondi = s.round.secondiRimasti(t);
    this.testoTimer.setText(secondi === null ? '' : secondi + ' s');

    // Frecce e ricarica
    if (s.frecceRimaste === 0) {
      const avanzamento = 1 - (s.fineRicarica - t) / RICARICA_MS; // da 0 a 1
      this.testoFrecce.setText('Ricarica...');
      this.barraRicarica.setVisible(true);
      this.barraRicarica.setPosition(s.giocatore.x - LATO_GIOCATORE / 2, s.giocatore.y + LATO_GIOCATORE / 2 + 8);
      this.barraRicarica.setSize(LATO_GIOCATORE * Phaser.Math.Clamp(avanzamento, 0, 1), 4);
    } else {
      this.testoFrecce.setText('Frecce: ' + s.frecceRimaste + ' / ' + s.stats.frecceFaretra);
      this.barraRicarica.setVisible(false);
    }
  }

  mostraBanner(testo) {
    this.banner.setText(testo).setAlpha(1);
    this.scena.tweens.killTweensOf(this.banner);
    this.scena.tweens.add({ targets: this.banner, alpha: 0, delay: 1200, duration: 500 });
  }

  // Il contatore delle frecce diventa rosso per un attimo (schivata senza frecce)
  lampeggiaFrecce() {
    this.testoFrecce.setColor('#ff6b6b');
    this.scena.time.delayedCall(250, () => this.testoFrecce.setColor(COLORE_FRECCE));
  }

  nascondiPerMorte() {
    this.barraRicarica.setVisible(false);
  }
}
