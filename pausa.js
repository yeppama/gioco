// ============================================================
// SCENA PAUSA - si apre sopra la partita (Esc o P)
//
// Tre pagine, una alla volta, così il testo resta sempre grande:
//  1. Abilità (con premi e combinazioni)
//  2. Benedizioni (divine e maledette)
//  3. Statistiche (valori reali ed effetti speciali attivi)
// Si cambia pagina con le linguette in alto, con le frecce ← → o con 1, 2, 3.
// La pausa ha i suoi tasti (come la schermata di scelta): la partita è ferma.
// ============================================================

const PAGINE_PAUSA = ['abilita', 'benedizioni', 'statistiche'];

class ScenaPausa extends Phaser.Scene {
  constructor() {
    super('pausa');
  }

  init(dati) {
    // Se per qualche motivo i dati non arrivano, si tiene la partita di prima
    this.partita = (dati && dati.partita) || this.partita;
    this.chiusa = false;
    // Si riapre sull'ultima pagina guardata
    this.pagina = dati.pagina || this.partita.paginaPausa || 'abilita';
    this.partita.paginaPausa = this.pagina;
  }

  create() {
    const p = this.partita;

    this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LARGHEZZA, ALTEZZA, 0x000000, 0.85);
    this.add.text(LARGHEZZA / 2, 36, tr('p.titolo'), { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(LARGHEZZA / 2, 70, tr('p.info', p.round.numero, p.round.ciclo() + 1, p.livello), {
      fontSize: '16px', color: '#8a8a99',
    }).setOrigin(0.5);

    this.linguette();
    if (this.pagina === 'abilita') this.paginaAbilita();
    else if (this.pagina === 'benedizioni') this.paginaBenedizioni();
    else this.paginaStatistiche();

    // Pulsanti
    this.pulsante(LARGHEZZA / 2 - 220, ALTEZZA - 50, tr('p.riprendi'), () => this.riprendi());
    this.pulsante(LARGHEZZA / 2, ALTEZZA - 50, tr('p.ricomincia'), () => this.ricomincia());
    // Cambio lingua: la pausa si ridisegna subito nella nuova lingua, sulla stessa pagina
    this.pulsante(LARGHEZZA / 2 + 220, ALTEZZA - 50, tr('p.lingua'), () => {
      impostaLingua(LINGUA === 'it' ? 'en' : 'it');
      this.vaiA(this.pagina);
    });

    this.input.keyboard.on('keydown-ESC', () => this.riprendi());
    this.input.keyboard.on('keydown-P', () => this.riprendi());
    this.input.keyboard.on('keydown-LEFT', () => this.scorri(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.scorri(1));
    this.input.keyboard.on('keydown', (evento) => {
      const numero = parseInt(evento.key, 10);
      if (numero >= 1 && numero <= PAGINE_PAUSA.length) this.vaiA(PAGINE_PAUSA[numero - 1]);
    });
  }

  // --- Pagine ---

  // Le tre linguette in alto: quella aperta è evidenziata
  linguette() {
    const largh = 220;
    PAGINE_PAUSA.forEach((nome, i) => {
      const x = LARGHEZZA / 2 + (i - 1) * (largh + 10);
      const aperta = nome === this.pagina;
      const sfondo = this.add.rectangle(x, 112, largh, 34, aperta ? 0x3a3a48 : 0x1a1a22)
        .setStrokeStyle(2, aperta ? 0xf2e6b8 : 0x3a3a48)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, 112, (i + 1) + '  ' + tr('p.pagina.' + nome), {
        fontSize: '16px', color: aperta ? '#ffffff' : '#8a8a99', fontStyle: aperta ? 'bold' : 'normal',
      }).setOrigin(0.5);
      sfondo.on('pointerdown', () => this.vaiA(nome));
    });
  }

  paginaAbilita() {
    const ricette = COMBINAZIONI.map(c => nomeDi(c) + ':\n  ' + Object.entries(c.requisiti)
      .map(([id, liv]) => nomeDi(trovaVoce(id)) + ' ' + liv).join(' + ')).join('\n');
    this.colonna(60, [{ titolo: tr('p.abilita'), colore: '#f2e6b8', testo: this.elenco([...ABILITA, ...COMBINAZIONI]) }]);
    this.colonna(430, [
      { titolo: tr('p.premi'), colore: '#6fd36f', testo: this.elenco(PREMI) },
      // Le ricette si vedono sempre, così le combinazioni si possono scoprire
      { titolo: tr('p.combinazioni'), colore: '#f1c40f', testo: ricette },
    ]);
  }

  paginaBenedizioni() {
    this.colonna(60, [{ titolo: tr('p.divine'), colore: '#f7d774', testo: this.elenco(DIVINE) }]);
    this.colonna(430, [{ titolo: tr('p.maledette'), colore: '#ff6b6b', testo: this.elenco(MALEDETTE) }]);
  }

  paginaStatistiche() {
    const p = this.partita;
    const s = p.stats;
    const frecceRaffica = (1 + s.frecceParallele) * (1 + 2 * s.coppieDiagonali);
    const base = [
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
    if (s.rimbalzi > 0) base.push(tr('st.rimbalzi', s.rimbalzi));
    if (s.perforazioni > 0) base.push(tr('st.perforazioni', s.perforazioni));
    if (s.raggioMira > 0) base.push(tr('st.mira', s.raggioMira));
    if (s.frecciaGratis > 0) base.push(tr('st.gratis', percentuale(s.frecciaGratis)));
    if (s.expMolt !== 1) base.push(tr('st.esperienza', s.expMolt.toFixed(2)));

    // Effetti delle benedizioni: come stanno ADESSO
    const effetti = [tr('st.scudi', p.scudiOverheal, OVERHEAL_SCUDI_MASSIMI)];
    if (s.dannoBossMolt !== 1) effetti.push(tr('st.dannoBoss', s.dannoBossMolt.toFixed(2)));
    if (s.cureMolt !== 1) effetti.push(tr('st.cure', s.cureMolt.toFixed(2)));
    if (s.setePerUccisione > 0) effetti.push(tr('st.sete', percentuale(p.seteBonus)));
    if (s.ultimoRespiro) effetti.push(tr(p.vitaCritica() ? 'st.ultimoAttivo' : 'st.ultimoSpento'));
    if (s.secondaVita) effetti.push(tr(p.secondaVitaUsata ? 'st.secondaUsata' : 'st.secondaPronta'));

    this.colonna(60, [{ titolo: tr('p.statistiche'), colore: '#7fd6ff', testo: base.join('\n') }]);
    this.colonna(430, [{ titolo: tr('p.effetti'), colore: '#c39bd3', testo: effetti.join('\n') }]);
  }

  // --- Aiuti ---

  // Elenco "Nome  livello/massimo" delle voci prese da una tabella
  elenco(tabella) {
    const livelli = this.partita.livelliAbilita;
    const righe = tabella.filter(v => livelli[v.id]).map(v => nomeDi(v) + '  ' + livelli[v.id] + (v.max < 99 ? '/' + v.max : ''));
    return righe.length > 0 ? righe.join('\n') : '—';
  }

  // Sezioni (titolo + testo) una sotto l'altra nella colonna, da y=150 in giù.
  // Su una pagina sola c'è spazio; se una lista fosse lunghissima,
  // il testo si rimpicciolisce un po' invece di finire sotto i pulsanti.
  colonna(x, sezioni) {
    const fondo = ALTEZZA - 85;
    for (let grandezza = 17; grandezza >= 11; grandezza--) {
      const oggetti = [];
      let y = 150;
      for (const sez of sezioni) {
        const titolo = this.add.text(x, y, sez.titolo, { fontSize: (grandezza + 3) + 'px', color: sez.colore, fontStyle: 'bold' });
        y += titolo.height + 8;
        const testo = this.add.text(x, y, sez.testo, { fontSize: grandezza + 'px', color: '#cfcfd8', lineSpacing: grandezza > 14 ? 4 : 2 });
        y += testo.height + 18;
        oggetti.push(titolo, testo);
      }
      if (y - 18 <= fondo || grandezza === 11) return;
      for (const o of oggetti) o.destroy();
    }
  }

  vaiA(pagina) {
    // Solo se la pausa è già aperta e disegnata (sennò il riavvio perderebbe i dati)
    if (this.chiusa || !this.sys.isActive()) return;
    this.scene.restart({ partita: this.partita, pagina });
  }

  scorri(direzione) {
    const i = PAGINE_PAUSA.indexOf(this.pagina);
    this.vaiA(PAGINE_PAUSA[(i + direzione + PAGINE_PAUSA.length) % PAGINE_PAUSA.length]);
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
