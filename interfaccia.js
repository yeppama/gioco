// ============================================================
// INTERFACCIA - tutto ciò che si legge sullo schermo durante la partita
// Tutti gli elementi hanno setScrollFactor(0): restano fermi sullo schermo
// mentre la telecamera segue il giocatore nell'arena.
// ============================================================

const COLORE_FRECCE = '#f2e6b8';

class Interfaccia {
  constructor(scena) {
    this.scena = scena;
    const testo = (x, y, colore, grandezza) =>
      scena.add.text(x, y, '', { fontSize: grandezza || '18px', color: colore }).setDepth(20).setScrollFactor(0);

    // Barra dell'esperienza: una striscia sottile in cima allo schermo
    scena.add.rectangle(0, 0, LARGHEZZA, 6, 0x2a2a35).setOrigin(0, 0).setDepth(20).setScrollFactor(0);
    this.barraExp = scena.add.rectangle(0, 0, 0, 6, 0x6fd36f).setOrigin(0, 0).setDepth(21).setScrollFactor(0);

    // In alto a sinistra: vita, frecce, livello
    this.testoVita = testo(16, 14, '#ffffff');
    this.testoFrecce = testo(16, 38, COLORE_FRECCE);
    this.testoLivello = testo(16, 62, '#6fd36f');

    // In alto al centro: round e tempo rimasto
    this.testoRound = testo(LARGHEZZA / 2, 14, '#ffffff').setOrigin(0.5, 0);
    this.testoTimer = testo(LARGHEZZA / 2, 38, '#8a8a99').setOrigin(0.5, 0);

    // Barra della vita del boss, sotto il numero del round
    this.nomeBoss = testo(LARGHEZZA / 2, 62, '#f2e6b8', '16px').setOrigin(0.5, 0);
    this.sfondoBoss = scena.add.rectangle(LARGHEZZA / 2 - 180, 86, 360, 10, 0x2a2a35)
      .setOrigin(0, 0.5).setDepth(20).setScrollFactor(0);
    this.barraBoss = scena.add.rectangle(LARGHEZZA / 2 - 180, 86, 360, 10, 0xc0392b)
      .setOrigin(0, 0.5).setDepth(21).setScrollFactor(0);
    this.nomeBoss.setVisible(false);
    this.sfondoBoss.setVisible(false);
    this.barraBoss.setVisible(false);

    // Scritta grande al centro (inizio e fine round)
    this.banner = scena.add.text(LARGHEZZA / 2, ALTEZZA / 2 - 120, '', {
      fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0).setAlpha(0);

    // Barra di ricarica sotto il giocatore (questa invece si muove con lui)
    this.barraRicarica = scena.add.rectangle(0, 0, 0, 4, 0xf2e6b8).setOrigin(0, 0.5).setDepth(20).setVisible(false);

    // Contatori: overheal e round senza danni, in alto a destra
    this.testoOverheal = testo(LARGHEZZA - 16, 14, '#6fd36f', '16px').setOrigin(1, 0);
    this.testoPerfetti = testo(LARGHEZZA - 16, 36, '#f7d774', '16px').setOrigin(1, 0);

    // Promemoria dei comandi
    this.testoAiuto = scena.add.text(16, ALTEZZA - 28, '', { fontSize: '14px', color: '#8a8a99' }).setDepth(20).setScrollFactor(0);

    if (scena.debug) {
      this.testoDebug = scena.add.text(LARGHEZZA - 16, 66, '', {
        fontSize: '14px', color: '#ff6b6b', align: 'right',
      }).setOrigin(1, 0).setDepth(20).setScrollFactor(0);
    }
  }

  // Chiamata ogni fotogramma: legge i valori dalla partita e aggiorna i testi
  aggiorna(t) {
    const s = this.scena;
    const arco = s.arco;
    // Le scritte fisse si rileggono ogni volta: così il cambio di lingua vale subito
    this.testoAiuto.setText(tr('hud.aiuto'));
    if (this.testoDebug) this.testoDebug.setText(tr('hud.debug'));
    this.testoVita.setText(tr('hud.vita', Math.ceil(s.vita), s.stats.vitaMax) + (s.invincibileDebug ? tr('hud.invincibile') : ''));
    this.testoLivello.setText(tr('hud.livello', s.livello));
    this.testoOverheal.setText(tr('hud.overheal', Math.floor(s.overheal), s.stats.vitaMax) + (s.scudiOverheal > 0 ? tr('hud.scudi', s.scudiOverheal) : ''));
    this.testoPerfetti.setText(tr('hud.perfetti', s.roundSenzaDanni));
    this.barraExp.setSize(LARGHEZZA * Phaser.Math.Clamp(s.exp / s.expNecessaria, 0, 1), 6);

    // Round e timer
    const ciclo = s.round.ciclo() > 0 ? tr('hud.ciclo', s.round.ciclo() + 1) : '';
    this.testoRound.setText(s.round.numero > 0 ? tr('hud.round', s.round.numero) + ciclo : '');
    this.testoTimer.setText(s.round.testoStato(t));

    // Barra del boss: visibile solo se c'è un boss o mini boss in campo
    const boss = s.bossAttivo;
    const visibile = !!(boss && boss.active);
    this.nomeBoss.setVisible(visibile);
    this.sfondoBoss.setVisible(visibile);
    this.barraBoss.setVisible(visibile);
    if (visibile) {
      this.nomeBoss.setText(tl(boss.dati.nome));
      this.barraBoss.setSize(360 * Phaser.Math.Clamp(boss.vita / boss.vitaMax, 0, 1), 10);
    }

    // Frecce, carica e ricarica
    if (arco.inRicarica) {
      const avanzamento = 1 - (arco.fineRicarica - t) / s.stats.ricaricaMs; // da 0 a 1
      this.testoFrecce.setText(tr('hud.ricarica'));
      this.barraRicarica.setVisible(true);
      this.barraRicarica.setPosition(s.giocatore.x - LATO_GIOCATORE / 2, s.giocatore.y + LATO_GIOCATORE / 2 + 8);
      this.barraRicarica.setSize(LATO_GIOCATORE * Phaser.Math.Clamp(avanzamento, 0, 1), 4);
    } else {
      const carica = arco.staCaricando ? tr('hud.carica', arco.carica) : '';
      this.testoFrecce.setText(tr('hud.frecce', arco.frecceRimaste, s.stats.frecceFaretra) + carica);
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

  // Schermata di fine run: come è andata e quale fonte ha fatto più danni
  mostraRiepilogo() {
    const s = this.scena;
    const secondi = Math.floor(s.tempo / 1000);
    const durata = Math.floor(secondi / 60) + ':' + String(secondi % 60).padStart(2, '0');
    const totale = Object.values(s.danniPerFonte).reduce((a, b) => a + b, 0) || 1;
    const fonti = Object.entries(s.danniPerFonte)
      .sort((a, b) => b[1] - a[1])
      .map(([fonte, danno]) => tr('fonte.' + fonte) + ': ' + Math.round(danno) + ' (' + Math.round(danno / totale * 100) + '%)');

    const righe = [
      tr('m.morto'),
      '',
      tr('m.info', s.round.numero, s.livello, durata),
      tr('m.uccisi', s.uccisioni),
      '',
      tr('m.fonti'),
      ...fonti,
      '',
      tr('m.ricomincia'),
    ];
    s.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LARGHEZZA, ALTEZZA, 0x000000, 0.6).setDepth(29).setScrollFactor(0);
    s.add.text(LARGHEZZA / 2, ALTEZZA / 2, righe.join('\n'), {
      fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setDepth(30).setScrollFactor(0);
  }
}
