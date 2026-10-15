// ============================================================
// SCENA PARTITA - mette insieme tutti i pezzi:
// arena, giocatore, arco, abilità, nemici, round, esperienza, vita e morte
// ============================================================

class ScenaPartita extends Phaser.Scene {
  constructor() {
    super('partita');
  }

  // create() viene eseguita UNA volta, quando la scena parte (o riparte)
  create() {
    // Aggiungendo ?debug=1 all'indirizzo si attivano i tasti di prova
    this.debug = new URLSearchParams(window.location.search).has('debug');
    this.invincibileDebug = false;

    // "tempo" è l'orologio della partita: avanza solo quando si gioca,
    // si ferma durante le scelte e la pausa
    this.tempo = 0;
    this.morto = false;

    // Abilità e benedizioni prese in questa run: { id: livello }
    this.livelliAbilita = {};
    this.stats = calcolaStatistiche(this.livelliAbilita);
    this.vita = this.stats.vitaMax;

    // Esperienza e scelte
    this.livello = 1;
    this.exp = 0;
    this.expNecessaria = this.costoLivello(1);
    // Scelte da mostrare appena possibile, in ordine. All'inizio si sceglie la prima abilità.
    this.codaScelte = [{ tipo: 'abilita', titolo: tr('scelta.prima') }];
    this.dannoNelRound = false;  // per il premio del round senza danni
    this.roundSenzaDanni = 0;    // quanti round di fila senza danni
    this.premiSaltati = 0;       // ogni PREMI_SALTATI_PER_MALEDETTA premi saltati = un potere maledetto
    // Overheal: cure in più a vita piena; a una vita intera si guadagna uno scudo
    this.overheal = 0;
    this.scudiOverheal = 0;
    this.capibranco = [];        // élite vive (la loro aura accelera i nemici vicini)
    this.bossAttivo = null;      // il boss o mini boss in campo (per la sua barra della vita)
    // Benedizioni con regole speciali
    this.seteBonus = 0;          // Sete di battaglia: danno in più accumulato in questo round
    this.secondaVitaUsata = false;
    this.invisibileFino = 0;     // Ombra lenta: fino a quando i nemici non ti vedono
    this.puntoVisto = { x: 0, y: 0 }; // dove i nemici credono che tu sia

    // Statistiche per il riepilogo di fine run
    this.danniPerFonte = {};
    this.uccisioni = 0;

    // Movimento
    this.ultimoColpo = -Infinity;    // momento dell'ultimo danno subito
    this.direzione = { x: 1, y: 0 }; // dove spara: sempre al contrario di dove cammina
    this.movimento = { x: 0, y: 0 }; // direzione dei comandi in questo momento
    this.fineSchivata = 0;
    this.dirSchivata = { x: 0, y: 0 };

    // Abilità difensive
    this.prossimaRigenerazione = INTERVALLO_RIGENERAZIONE_MS;
    this.scudoPronto = true;
    this.prossimoScudo = 0;

    // Zone di pericolo a terra (mortai, pioggia del boss)
    this.zone = [];

    // --- Arena: pavimento, ostacoli, percorsi dei nemici ---
    this.cameras.main.setBackgroundColor('#0e0e12');
    this.arena = new Arena(this);
    this.arena.genera(0);
    this.flowField = this.arena.flowField;

    // --- Giocatore: quadrato azzurro al centro dell'arena, seguito dalla telecamera ---
    this.giocatore = this.add.rectangle(this.arena.l / 2, this.arena.a / 2, LATO_GIOCATORE, LATO_GIOCATORE, 0x4fa3ff);
    this.physics.add.existing(this.giocatore);
    this.giocatore.body.setCollideWorldBounds(true); // non esce dall'arena
    this.cameras.main.startFollow(this.giocatore, true, 0.12, 0.12);

    // Cerchio azzurro attorno al giocatore quando lo Scudo spirituale è pronto
    this.aloneScudo = this.add.circle(0, 0, LATO_GIOCATORE * 0.9).setStrokeStyle(2, 0x7fd6ff, 0.9).setVisible(false);
    // Il mirino: un puntino che mostra dove sparerà
    this.mirino = this.add.rectangle(0, 0, 6, 6, 0xffffff);

    // --- Gruppi ---
    this.arco = new Arco(this);
    this.nemici = this.physics.add.group();
    this.proiettiliNemici = this.physics.add.group();
    const ostacoli = this.arena.ostacoli;

    // --- Collisioni ---
    this.physics.add.collider(this.giocatore, ostacoli);
    this.physics.add.collider(this.nemici, ostacoli);
    this.physics.add.collider(this.nemici, this.nemici); // i nemici non si sovrappongono
    this.physics.add.collider(this.arco.frecce, ostacoli, (f) => this.arco.suOstacolo(f));
    this.physics.add.overlap(this.arco.frecce, this.nemici, (f, n) => this.arco.suNemico(f, n));
    this.physics.add.overlap(this.giocatore, this.nemici, (giocatore, nemico) => this.subisciDanno(nemico.dannoContatto));
    this.physics.add.collider(this.proiettiliNemici, ostacoli, (p) => disattivaProiettile(p));
    this.physics.add.overlap(this.giocatore, this.proiettiliNemici, (giocatore, p) => {
      if (!p.active) return;
      disattivaProiettile(p);
      this.subisciDanno(p.danno);
    });

    // --- Comandi, round, interfaccia, evocazioni ---
    this.lame = new LameOrbitanti(this);
    this.scia = new SciaVento(this);
    this.antiFermo = new AntiFermo(this);
    this.consumabili = new Consumabili(this);
    this.controlli = new Controlli(this);
    this.round = new GestoreRound(this);
    this.interfaccia = new Interfaccia(this);

    // Pausa automatica quando si cambia scheda
    // (non in debug, dove il pannello di prova perde spesso il focus)
    if (!this.debug) {
      const pausaAutomatica = () => { this.controlli.richiestaPausa = true; };
      this.game.events.on('hidden', pausaAutomatica);
      this.game.events.on('blur', pausaAutomatica);
      this.events.once('shutdown', () => {
        this.game.events.off('hidden', pausaAutomatica);
        this.game.events.off('blur', pausaAutomatica);
      });
    }
    // Quando la partita riprende, i tasti premuti nella pausa non devono contare
    this.events.on('resume', () => this.controlli.dimenticaTastiPausa());
  }

  // update() viene eseguita OGNI fotogramma (circa 60 volte al secondo)
  update(time, delta) {
    if (this.morto) {
      if (this.controlli.ricomincia()) this.scene.restart();
      return;
    }

    // Schermate di scelta e pausa: la partita si ferma finché non si chiudono
    if (this.codaScelte.length > 0) {
      this.apriScelta(this.codaScelte.shift());
      return;
    }
    if (this.controlli.pausaRichiesta()) {
      this.apriPausa();
      return;
    }

    // Avanza l'orologio della partita (massimo 50 ms per volta,
    // così se il browser si blocca un attimo non "salta" tutto in avanti)
    const passo = Math.min(delta, 50);
    this.tempo += passo;
    const t = this.tempo;

    if (this.debug) this.gestisciDebug(t);

    // Si legge sempre, anche durante lo scatto, così una richiesta vecchia non resta in sospeso
    const vuoleSchivare = this.controlli.schivata();

    // Durante la schivata i comandi di movimento non contano: si va dritti
    if (t < this.fineSchivata) {
      this.giocatore.body.setVelocity(this.dirSchivata.x * VELOCITA_SCHIVATA, this.dirSchivata.y * VELOCITA_SCHIVATA);
    } else {
      this.muoviGiocatore();
      if (vuoleSchivare) this.schiva(t);
    }

    // Il mirino sta sempre dal lato in cui partono le frecce
    this.mirino.setPosition(this.giocatore.x + this.direzione.x * 24, this.giocatore.y + this.direzione.y * 24);

    if (this.controlli.ricaricaManuale()) this.arco.ricaricaManuale(t);
    if (this.controlli.onda()) this.arco.sparaOnda(t);
    this.arco.aggiorna(t, this.controlli.caricaPremuta());
    this.gestisciDifese(t);
    this.antiFermo.aggiorna(t);
    if (this.arena.terrenoIn(this.giocatore.x, this.giocatore.y) === 'lava') this.subisciDanno(TERRENI.lavaDanno);
    this.lame.aggiorna(t);
    this.scia.aggiorna(t);
    this.consumabili.aggiorna(t);
    this.round.aggiorna(t);
    aggiornaZone(this, t);

    // Nemici: prima si aggiorna la mappa dei percorsi, poi ognuno si muove
    const visto = this.vista();
    this.flowField.aggiorna(visto.x, visto.y);
    // I capobranco (élite, non i boss) vivi in questo fotogramma: servono per la loro aura
    this.capibranco = this.nemici.getChildren().filter(n => n.elite && !n.eBoss);
    for (const n of this.nemici.getChildren().slice()) aggiornaNemico(this, n, t);

    this.arco.controllaBordi();
    for (const p of this.proiettiliNemici.getChildren()) {
      if (p.active && (p.x < 0 || p.x > this.arena.l || p.y < 0 || p.y > this.arena.a)) disattivaProiettile(p);
    }

    // Lampeggio mentre si è invulnerabili dopo un colpo; mezzo trasparente durante la schivata
    const invulnerabile = t - this.ultimoColpo < INVULNERABILITA_MS;
    this.giocatore.setAlpha(invulnerabile && Math.floor(t / 80) % 2 === 0 ? 0.3 : 1);
    if (t < this.fineSchivata) this.giocatore.setAlpha(0.5);
    if (t < this.invisibileFino) this.giocatore.setAlpha(0.25); // Ombra lenta: quasi invisibile

    this.interfaccia.aggiorna(t);
  }

  // ---------------------------------------------------------- MOVIMENTO

  muoviGiocatore() {
    // Direzione da tastiera o joystick: x e y tra -1 e 1
    const { x: dx, y: dy } = this.controlli.direzione();
    this.movimento = { x: dx, y: dy };
    // Si spara alle proprie spalle: direzione opposta al movimento.
    // Da fermo resta l'ultima direzione, quindi si continua a sparare lì.
    if (dx !== 0 || dy !== 0) this.direzione = { x: -dx, y: -dy };

    // Mentre carichi il colpo ti muovi più lento; nei rovi anche
    const nelRovi = this.arena.terrenoIn(this.giocatore.x, this.giocatore.y) === 'rovi';
    // Faretra pesante: lento solo finché la faretra è più che mezza piena
    const faretraPesante = this.arco.frecceRimaste > this.stats.frecceFaretra / 2 ? this.stats.velocitaSePiena : 1;
    // Calice: ogni scudo overheal attivo ti fa andare più veloce
    const calice = 1 + this.stats.velocitaPerScudo * this.scudiOverheal;
    const velocita = this.stats.velocita * faretraPesante * calice
      * (this.arco.staCaricando ? COLPO_CARICATO.rallentamento : 1)
      * (nelRovi ? TERRENI.roviRallentamento : 1);
    this.giocatore.body.setVelocity(dx * velocita, dy * velocita);
  }

  // Scatto veloce che costa frecce
  schiva(t) {
    if (this.stats.schivataDiVita > 0) {
      // Corpo di cenere: si paga in vita (mai fino a morire), anche durante la ricarica
      const costo = this.stats.vitaMax * this.stats.schivataDiVita;
      if (this.vita <= costo) return;
      this.vita -= costo;
    } else if (!this.arco.consuma(this.stats.costoSchivata, t)) {
      // Senza abbastanza frecce (o durante la ricarica) non si schiva
      this.interfaccia.lampeggiaFrecce();
      return;
    }
    // Ombra lenta: i nemici restano a guardare il punto da cui sei partito
    if (this.stats.invisibileMs > 0) {
      this.puntoVisto = { x: this.giocatore.x, y: this.giocatore.y };
      this.invisibileFino = t + DURATA_SCHIVATA_MS + this.stats.invisibileMs;
    }
    // Si schiva dove si sta andando; da fermo, nell'ultima direzione in cui si camminava
    const fermo = this.movimento.x === 0 && this.movimento.y === 0;
    this.dirSchivata = fermo ? { x: -this.direzione.x, y: -this.direzione.y } : { ...this.movimento };
    this.fineSchivata = t + DURATA_SCHIVATA_MS;
  }

  // Dopo ogni boss: nuova arena più grande, giocatore di nuovo al centro
  espandiArena() {
    this.rigeneraArena(this.round.ciclo() + 1);
  }

  rigeneraArena(ciclo) {
    this.arena.genera(ciclo);
    this.flowField = this.arena.flowField;
    this.giocatore.body.reset(this.arena.l / 2, this.arena.a / 2);
    this.arco.disattivaTutte();
    this.consumabili.svuota();
    this.scia.svuota();
    svuotaZone(this);
  }

  // ---------------------------------------------------------- DEBUG E MORTE

  // Tasti di prova, attivi solo con ?debug=1 nell'indirizzo
  gestisciDebug(t) {
    if (this.controlli.tastoDebug('L')) this.guadagnaExp(this.expNecessaria - this.exp);
    if (this.controlli.tastoDebug('I')) this.invincibileDebug = !this.invincibileDebug;
    if (this.controlli.tastoDebug('N') && this.round.fase !== 'pausa') this.round.terminaRound(t);
    // B / M: il prossimo round sarà quello del boss / del mini boss
    if (this.controlli.tastoDebug('B')) this.saltaAlRound(OGNI_QUANTI_ROUND_BOSS, t);
    if (this.controlli.tastoDebug('M')) this.saltaAlRound(OGNI_QUANTI_ROUND_MINIBOSS, t);
  }

  // Debug: chiude il round attuale e fa sì che il prossimo sia un multiplo di "ogni"
  saltaAlRound(ogni, t) {
    const prossimo = (Math.floor(this.round.numero / ogni) + 1) * ogni;
    this.round.numero = prossimo - 1;
    if (this.round.fase !== 'pausa') this.round.terminaRound(t);
  }

  muori() {
    this.morto = true;
    this.giocatore.body.setVelocity(0, 0);
    for (const n of this.nemici.getChildren()) n.body.setVelocity(0, 0);
    this.giocatore.setAlpha(1);
    this.giocatore.setFillStyle(0x333344); // il giocatore diventa grigio
    this.mirino.setVisible(false);
    this.aloneScudo.setVisible(false);
    this.arco.nascondi();
    this.lame.nascondi();
    this.scia.svuota();
    this.antiFermo.nascondi();
    this.interfaccia.nascondiPerMorte();
    this.controlli.azzeraTocchi();
    this.interfaccia.mostraRiepilogo();
  }
}

// I metodi degli altri file diventano metodi della scena partita
// (vedi vita.js, combattimento.js, progressi.js)
Object.assign(ScenaPartita.prototype, METODI_VITA, METODI_COMBATTIMENTO, METODI_PROGRESSI);
