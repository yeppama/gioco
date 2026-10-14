// ============================================================
// SCENA PAUSA - si apre sopra la partita (Esc, P o pulsante II)
// Mostra abilità e benedizioni prese, con il loro livello,
// e le statistiche reali del personaggio in questo momento.
// ============================================================

class ScenaPausa extends Phaser.Scene {
  constructor() {
    super('pausa');
  }

  init(dati) {
    this.partita = dati.partita;
    this.chiusa = false;
  }

  create() {
    const p = this.partita;
    const s = p.stats;
    const testo = (x, y, contenuto, stile) => this.add.text(x, y, contenuto, { fontSize: '16px', color: '#cfcfd8', lineSpacing: 4, ...stile });
    const titolo = (x, y, contenuto, colore) => testo(x, y, contenuto, { fontSize: '19px', color: colore, fontStyle: 'bold' });

    this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LARGHEZZA, ALTEZZA, 0x000000, 0.8);
    this.add.text(LARGHEZZA / 2, 40, 'Pausa', { fontSize: '34px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const ciclo = p.round.ciclo() + 1;
    this.add.text(LARGHEZZA / 2, 76, 'Round ' + p.round.numero + '  ·  Ciclo ' + ciclo + '  ·  Livello ' + p.livello, {
      fontSize: '16px', color: '#8a8a99',
    }).setOrigin(0.5);

    // Elenco "Nome  livello/massimo" delle voci prese da una tabella
    const elenco = (tabella) => {
      const righe = tabella.filter(v => p.livelliAbilita[v.id]).map(v => v.nome + '  ' + p.livelliAbilita[v.id] + '/' + v.max);
      return righe.length > 0 ? righe.join('\n') : '—';
    };

    // Colonna sinistra: abilità
    titolo(40, 110, 'Abilità', '#f2e6b8');
    testo(40, 140, elenco(ABILITA));

    // Colonna centrale: benedizioni
    titolo(300, 110, 'Benedizioni divine', '#f7d774');
    testo(300, 140, elenco(DIVINE));
    titolo(300, 250, 'Benedizioni maledette', '#ff6b6b');
    testo(300, 280, elenco(MALEDETTE));
    titolo(300, 370, 'Premi', '#6fd36f');
    testo(300, 400, elenco(PREMI).replace(/\/999/g, ''));

    // Colonna destra: statistiche reali
    const frecceRaffica = (1 + s.frecceParallele) * (1 + 2 * s.coppieDiagonali);
    const righe = [
      'Vita: ' + Math.ceil(p.vita) + ' / ' + s.vitaMax,
      'Danno freccia: ' + s.danno.toFixed(1),
      'Raffiche al secondo: ' + (1000 / s.cadenzaMs).toFixed(1),
      'Frecce per raffica: ' + frecceRaffica,
      'Faretra: ' + s.frecceFaretra,
      'Ricarica: ' + (s.ricaricaMs / 1000).toFixed(1) + ' s',
      'Schivata: ' + s.costoSchivata + ' frecce',
      'Velocità: ' + Math.round(s.velocita),
    ];
    if (s.rimbalzi > 0) righe.push('Rimbalzi: ' + s.rimbalzi);
    if (s.perforazioni > 0) righe.push('Perforazioni: ' + s.perforazioni);
    if (s.raggioMira > 0) righe.push('Mira automatica: ' + s.raggioMira + ' px');
    if (s.expMolt !== 1) righe.push('Esperienza: x' + s.expMolt.toFixed(2));
    titolo(560, 110, 'Statistiche', '#7fd6ff');
    testo(560, 140, righe.join('\n'));

    // Pulsanti
    this.pulsante(LARGHEZZA / 2 - 110, ALTEZZA - 60, 'Riprendi (Esc)', () => this.riprendi());
    this.pulsante(LARGHEZZA / 2 + 110, ALTEZZA - 60, 'Ricomincia', () => this.ricomincia());

    this.input.keyboard.on('keydown-ESC', () => this.riprendi());
    this.input.keyboard.on('keydown-P', () => this.riprendi());
  }

  pulsante(x, y, etichetta, azione) {
    const sfondo = this.add.rectangle(x, y, 190, 44, 0x23232d).setStrokeStyle(2, 0x5a5a6a).setInteractive({ useHandCursor: true });
    this.add.text(x, y, etichetta, { fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);
    sfondo.on('pointerover', () => sfondo.setStrokeStyle(3, 0xf2e6b8));
    sfondo.on('pointerout', () => sfondo.setStrokeStyle(2, 0x5a5a6a));
    sfondo.on('pointerdown', azione);
  }

  riprendi() {
    if (this.chiusa) return;
    this.chiusa = true;
    this.scene.stop();
    this.partita.scene.resume();
  }

  ricomincia() {
    if (this.chiusa) return;
    this.chiusa = true;
    this.scene.stop();
    this.partita.scene.restart();
  }
}
