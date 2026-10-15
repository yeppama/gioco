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

    // Ricette delle combinazioni, così si possono scoprire
    const ricette = COMBINAZIONI.map(c => nomeDi(c) + ':\n  ' + Object.entries(c.requisiti)
      .map(([id, liv]) => nomeDi(trovaVoce(id)) + ' ' + liv).join(' + ')).join('\n');

    // Colonna sinistra: abilità, combinazioni e premi. Centrale: benedizioni.
    // Le sezioni si mettono una sotto l'altra (non a posizioni fisse),
    // così una lista lunga spinge giù le altre invece di sovrapporsi.
    this.colonna(40, [
      { titolo: tr('p.abilita'), colore: '#f2e6b8', testo: elenco([...ABILITA, ...COMBINAZIONI]) },
      { titolo: tr('p.combinazioni'), colore: '#f1c40f', testo: ricette, piccolo: true },
      { titolo: tr('p.premi'), colore: '#6fd36f', testo: elenco(PREMI) },
    ]);
    this.colonna(300, [
      { titolo: tr('p.divine'), colore: '#f7d774', testo: elenco(DIVINE) },
      { titolo: tr('p.maledette'), colore: '#ff6b6b', testo: elenco(MALEDETTE) },
    ]);

    // Colonna destra: statistiche reali
    const frecceRaffica = (1 + s.frecceParallele) * (1 + 2 * s.coppieDiagonali);
    const righe = [
      tr('st.vita', Math.ceil(p.vita), s.vitaMax),
      tr('st.danno', s.danno.toFixed(1)),
      tr('st.raffiche', (1000 / s.cadenzaMs).toFixed(1)),
      tr('st.perRaffica', frecceRaffica),
      tr('st.faretra', s.frecceFaretra),
      tr('st.ricarica', (s.ricaricaMs / 1000).toFixed(1)),
      // Corpo di cenere: la schivata costa vita, non frecce
      s.schivataDiVita > 0 ? tr('st.schivataVita', percentuale(s.schivataDiVita)) : tr('st.schivata', s.costoSchivata),
      tr('st.velocita', Math.round(s.velocita)),
    ];
    if (s.rimbalzi > 0) righe.push(tr('st.rimbalzi', s.rimbalzi));
    if (s.perforazioni > 0) righe.push(tr('st.perforazioni', s.perforazioni));
    if (s.raggioMira > 0) righe.push(tr('st.mira', s.raggioMira));
    if (s.frecciaGratis > 0) righe.push(tr('st.gratis', Math.round(s.frecciaGratis * 100)));
    if (s.expMolt !== 1) righe.push(tr('st.esperienza', s.expMolt.toFixed(2)));
    // Regole speciali delle benedizioni: come stanno ADESSO
    if (s.dannoBossMolt !== 1) righe.push(tr('st.dannoBoss', s.dannoBossMolt.toFixed(2)));
    if (s.cureMolt !== 1) righe.push(tr('st.cure', s.cureMolt.toFixed(2)));
    if (p.scudiOverheal > 0 || s.velocitaPerScudo > 0) righe.push(tr('st.scudi', p.scudiOverheal, OVERHEAL_SCUDI_MASSIMI));
    if (s.setePerUccisione > 0) righe.push(tr('st.sete', percentuale(p.seteBonus)));
    if (s.ultimoRespiro) righe.push(tr(p.vitaCritica() ? 'st.ultimoAttivo' : 'st.ultimoSpento'));
    if (s.secondaVita) righe.push(tr(p.secondaVitaUsata ? 'st.secondaUsata' : 'st.secondaPronta'));
    titolo(560, 110, tr('p.statistiche'), '#7fd6ff');
    // Con tante righe si rimpicciolisce il testo, così non finisce sotto i pulsanti
    const piccolo = righe.length > 12;
    testo(560, 140, righe.join('\n'), piccolo ? { fontSize: '13px', lineSpacing: 2 } : {});

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

  // Disegna delle sezioni (titolo + testo) una sotto l'altra, da y=110 in giù.
  // Se non ci stanno sopra i pulsanti, riprova con caratteri più piccoli.
  colonna(x, sezioni) {
    const fondo = ALTEZZA - 90;
    for (let grandezza = 16; grandezza >= 10; grandezza--) {
      const oggetti = [];
      let y = 110;
      for (const sez of sezioni) {
        const titolo = this.add.text(x, y, sez.titolo, { fontSize: (grandezza + 3) + 'px', color: sez.colore, fontStyle: 'bold' });
        y += titolo.height + 6;
        const testo = this.add.text(x, y, sez.testo, {
          fontSize: (sez.piccolo ? grandezza - 2 : grandezza) + 'px', color: '#cfcfd8', lineSpacing: grandezza > 13 ? 4 : 2,
        });
        y += testo.height + 14;
        oggetti.push(titolo, testo);
      }
      // Ci sta (o è già il carattere più piccolo): si tiene così
      if (y - 14 <= fondo || grandezza === 10) return;
      for (const o of oggetti) o.destroy();
    }
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
