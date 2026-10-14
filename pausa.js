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
    this.add.text(LARGHEZZA / 2, 40, tr('p.titolo'), { fontSize: '34px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const ciclo = p.round.ciclo() + 1;
    this.add.text(LARGHEZZA / 2, 76, tr('p.info', p.round.numero, ciclo, p.livello), {
      fontSize: '16px', color: '#8a8a99',
    }).setOrigin(0.5);

    // Elenco "Nome  livello/massimo" delle voci prese da una tabella
    const elenco = (tabella) => {
      const righe = tabella.filter(v => p.livelliAbilita[v.id]).map(v => nomeDi(v) + '  ' + p.livelliAbilita[v.id] + (v.max < 99 ? '/' + v.max : ''));
      return righe.length > 0 ? righe.join('\n') : '—';
    };

    // Colonna sinistra: abilità
    titolo(40, 110, tr('p.abilita'), '#f2e6b8');
    testo(40, 140, elenco([...ABILITA, ...COMBINAZIONI]));
    // Ricette delle combinazioni, così si possono scoprire
    const ricette = COMBINAZIONI.map(c => nomeDi(c) + ':\n  ' + Object.entries(c.requisiti)
      .map(([id, liv]) => nomeDi(trovaVoce(id)) + ' ' + liv).join(' + ')).join('\n');
    titolo(40, 420, tr('p.combinazioni'), '#f1c40f');
    testo(40, 448, ricette, { fontSize: '14px' });

    // Colonna centrale: benedizioni
    titolo(300, 110, tr('p.divine'), '#f7d774');
    testo(300, 140, elenco(DIVINE));
    titolo(300, 250, tr('p.maledette'), '#ff6b6b');
    testo(300, 280, elenco(MALEDETTE));
    titolo(300, 370, tr('p.premi'), '#6fd36f');
    testo(300, 400, elenco(PREMI));

    // Colonna destra: statistiche reali
    const frecceRaffica = (1 + s.frecceParallele) * (1 + 2 * s.coppieDiagonali);
    const righe = [
      tr('st.vita', Math.ceil(p.vita), s.vitaMax),
      tr('st.danno', s.danno.toFixed(1)),
      tr('st.raffiche', (1000 / s.cadenzaMs).toFixed(1)),
      tr('st.perRaffica', frecceRaffica),
      tr('st.faretra', s.frecceFaretra),
      tr('st.ricarica', (s.ricaricaMs / 1000).toFixed(1)),
      tr('st.schivata', s.costoSchivata),
      tr('st.velocita', Math.round(s.velocita)),
    ];
    if (s.rimbalzi > 0) righe.push(tr('st.rimbalzi', s.rimbalzi));
    if (s.perforazioni > 0) righe.push(tr('st.perforazioni', s.perforazioni));
    if (s.raggioMira > 0) righe.push(tr('st.mira', s.raggioMira));
    if (s.frecciaGratis > 0) righe.push(tr('st.gratis', Math.round(s.frecciaGratis * 100)));
    if (s.expMolt !== 1) righe.push(tr('st.esperienza', s.expMolt.toFixed(2)));
    titolo(560, 110, tr('p.statistiche'), '#7fd6ff');
    testo(560, 140, righe.join('\n'));

    // Pulsanti
    this.pulsante(LARGHEZZA / 2 - 220, ALTEZZA - 60, tr('p.riprendi'), () => this.riprendi());
    this.pulsante(LARGHEZZA / 2, ALTEZZA - 60, tr('p.ricomincia'), () => this.ricomincia());
    // Cambio lingua: la pausa si ridisegna subito nella nuova lingua
    this.pulsante(LARGHEZZA / 2 + 220, ALTEZZA - 60, tr('p.lingua'), () => {
      impostaLingua(LINGUA === 'it' ? 'en' : 'it');
      this.scene.restart({ partita: this.partita });
    });

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
