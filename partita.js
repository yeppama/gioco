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
    this.expNecessaria = EXP_PRIMO_LIVELLO;
    // Scelte da mostrare appena possibile, in ordine. All'inizio si sceglie la prima abilità.
    this.codaScelte = [{ tipo: 'abilita', titolo: 'Scegli la tua prima abilità' }];
    this.dannoNelRound = false;  // per la benedizione divina
    this.divineRicevute = 0;     // ogni divina presa dimezza la probabilità della prossima
    this.bossAttivo = null;      // il boss o mini boss in campo (per la sua barra della vita)

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
    this.controlli = new Controlli(this);
    this.round = new GestoreRound(this);
    this.interfaccia = new Interfaccia(this);

    // Pausa automatica quando si cambia scheda o il telefono si blocca
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
    this.tempo += Math.min(delta, 50);
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

    this.arco.aggiorna(t, this.controlli.caricaPremuta());
    this.gestisciDifese(t);
    this.lame.aggiorna(t);
    this.round.aggiorna(t);
    aggiornaZone(this, t);

    // Nemici: prima si aggiorna la mappa dei percorsi, poi ognuno si muove
    this.flowField.aggiorna(this.giocatore.x, this.giocatore.y);
    for (const n of this.nemici.getChildren().slice()) aggiornaNemico(this, n, t);

    this.arco.controllaBordi();
    for (const p of this.proiettiliNemici.getChildren()) {
      if (p.active && (p.x < 0 || p.x > this.arena.l || p.y < 0 || p.y > this.arena.a)) disattivaProiettile(p);
    }

    // Lampeggio mentre si è invulnerabili dopo un colpo; mezzo trasparente durante la schivata
    const invulnerabile = t - this.ultimoColpo < INVULNERABILITA_MS;
    this.giocatore.setAlpha(invulnerabile && Math.floor(t / 80) % 2 === 0 ? 0.3 : 1);
    if (t < this.fineSchivata) this.giocatore.setAlpha(0.5);

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

    // Mentre carichi il colpo ti muovi più lento
    const velocita = this.stats.velocita * (this.arco.staCaricando ? COLPO_CARICATO.rallentamento : 1);
    this.giocatore.body.setVelocity(dx * velocita, dy * velocita);
  }

  // Scatto veloce che costa frecce
  schiva(t) {
    // Senza abbastanza frecce (o durante la ricarica) non si schiva
    if (!this.arco.consuma(this.stats.costoSchivata, t)) {
      this.interfaccia.lampeggiaFrecce();
      return;
    }
    // Si schiva dove si sta andando; da fermo, nell'ultima direzione in cui si camminava
    const fermo = this.movimento.x === 0 && this.movimento.y === 0;
    this.dirSchivata = fermo ? { x: -this.direzione.x, y: -this.direzione.y } : { ...this.movimento };
    this.fineSchivata = t + DURATA_SCHIVATA_MS;
  }

  // ---------------------------------------------------------- DANNI AI NEMICI

  // Danno di una freccia in questo momento (Ultimo respiro lo raddoppia a vita bassa)
  dannoFreccia() {
    const vitaBassa = this.vita < this.stats.vitaMax * 0.3;
    return this.stats.danno * (this.stats.ultimoRespiro && vitaBassa ? 2 : 1);
  }

  // Frecce infuocate e di brina
  applicaEffetti(n) {
    const t = this.tempo;
    if (this.stats.fuocoDanno > 0) {
      if (t >= n.bruciaFino) n.prossimaBruciatura = t + INTERVALLO_FUOCO_MS;
      n.bruciaFino = t + DURATA_FUOCO_MS;
      n.dannoFuoco = this.stats.fuocoDanno * this.stats.dannoMolt;
    }
    if (this.stats.geloRallenta > 0) {
      n.rallentatoFino = t + DURATA_GELO_MS;
      n.rallentamento = n.eBoss ? this.stats.geloRallenta / 2 : this.stats.geloRallenta;
    }
  }

  nemicoPiuVicino(raggio) {
    let migliore = null;
    let distanzaMigliore = raggio;
    for (const n of this.nemici.getChildren()) {
      const d = Phaser.Math.Distance.Between(this.giocatore.x, this.giocatore.y, n.x, n.y);
      if (d < distanzaMigliore) {
        distanzaMigliore = d;
        migliore = n;
      }
    }
    return migliore;
  }

  // Per il riepilogo di fine run: quanti danni ha fatto ogni fonte
  registraDanno(fonte, quantita) {
    this.danniPerFonte[fonte] = (this.danniPerFonte[fonte] || 0) + quantita;
  }

  // ---------------------------------------------------------- VITA E DIFESE

  gestisciDifese(t) {
    // Rigenerazione
    if (t >= this.prossimaRigenerazione) {
      this.prossimaRigenerazione = t + INTERVALLO_RIGENERAZIONE_MS;
      if (this.stats.rigenerazione > 0 && !this.stats.rigenerazioneBloccata) {
        this.vita = Math.min(this.stats.vitaMax, this.vita + this.stats.rigenerazione);
      }
    }
    // Scudo spirituale: torna pronto dopo il suo tempo di ricarica
    if (this.stats.scudoMs > 0 && !this.scudoPronto && t >= this.prossimoScudo) this.scudoPronto = true;
    this.aloneScudo.setVisible(this.stats.scudoMs > 0 && this.scudoPronto);
    this.aloneScudo.setPosition(this.giocatore.x, this.giocatore.y);
  }

  subisciDanno(danno) {
    const t = this.tempo;
    if (this.morto || this.invincibileDebug) return;
    if (t - this.ultimoColpo < INVULNERABILITA_MS) return;
    if (t < this.fineSchivata) return; // durante la schivata si è intoccabili

    // Lo scudo assorbe il colpo intero
    if (this.stats.scudoMs > 0 && this.scudoPronto) {
      this.scudoPronto = false;
      this.prossimoScudo = t + this.stats.scudoMs;
      this.ultimoColpo = t;
      this.cameras.main.flash(120, 127, 214, 255);
      return;
    }

    this.ultimoColpo = t;
    this.dannoNelRound = true;
    this.vita = Math.max(0, this.vita - danno);
    this.cameras.main.shake(100, 0.005); // piccolo scossone dello schermo
    if (this.vita === 0) this.muori();
  }

  // ---------------------------------------------------------- ESPERIENZA, SCELTE, PAUSA

  guadagnaExp(quantita) {
    this.exp += quantita * this.stats.expMolt;
    while (this.exp >= this.expNecessaria) {
      this.exp -= this.expNecessaria;
      this.livello++;
      this.expNecessaria = Math.round(EXP_PRIMO_LIVELLO * Math.pow(CRESCITA_EXP, this.livello - 1));
      this.codaScelte.push({ tipo: 'abilita', titolo: 'Livello ' + this.livello + '!' });
    }
  }

  // Chiamata da round.js quando un round finisce
  fineRound(numero) {
    if (numero < DIVINA_DAL_ROUND || this.dannoNelRound) return;
    // Probabilità che si dimezza a ogni divina presa: 100%, 50%, 25%...
    if (Math.random() < Math.pow(0.5, this.divineRicevute)) {
      this.codaScelte.push({ tipo: 'divina', titolo: 'Nessun danno: benedizione divina' });
    }
  }

  // Chiamata quando muore il mini boss
  bottinoMiniboss() {
    this.codaScelte.push({ tipo: 'maledetta', titolo: 'La Sentinella lascia un potere maledetto' });
  }

  // Apre la schermata "scegli 1 tra 3" e mette in pausa la partita
  apriScelta(voce) {
    const tabelle = { abilita: ABILITA, maledetta: MALEDETTE, divina: DIVINE };
    const opzioni = estraiOpzioni(this.livelliAbilita, 3, tabelle[voce.tipo]);
    if (opzioni.length === 0) return; // tutto già al massimo
    this.giocatore.body.setVelocity(0, 0);
    this.controlli.rilascia();
    this.scene.launch('scelta', {
      titolo: voce.titolo,
      tipo: voce.tipo,
      opzioni,
      alScegliere: (id) => {
        if (id === 'riposo') {
          this.vita = Math.min(this.stats.vitaMax, this.vita + this.stats.vitaMax * RIPOSO_CURA);
        } else if (id) {
          this.prendiAbilita(id);
          if (voce.tipo === 'divina') this.divineRicevute++;
        }
        this.scene.resume();
      },
    });
    this.scene.pause();
  }

  apriPausa() {
    this.giocatore.body.setVelocity(0, 0);
    this.controlli.rilascia();
    this.scene.launch('pausa', { partita: this });
    this.scene.pause();
  }

  prendiAbilita(id) {
    this.livelliAbilita[id] = (this.livelliAbilita[id] || 0) + 1;
    const prima = this.stats;
    this.stats = calcolaStatistiche(this.livelliAbilita);
    // Se la vita massima cresce (Vigore), la stessa quantità si recupera subito
    if (this.stats.vitaMax > prima.vitaMax) this.vita += this.stats.vitaMax - prima.vitaMax;
    // Faretra più grande: le frecce in più arrivano subito (se non si sta ricaricando)
    if (this.stats.frecceFaretra > prima.frecceFaretra && !this.arco.inRicarica) {
      this.arco.frecceRimaste += this.stats.frecceFaretra - prima.frecceFaretra;
    }
    const voce = trovaVoce(id);
    if (voce.alPrendere) voce.alPrendere(this);
    this.vita = Math.min(this.vita, this.stats.vitaMax);
    this.arco.frecceRimaste = Math.min(this.arco.frecceRimaste, this.stats.frecceFaretra);
  }

  // Dopo ogni boss: nuova arena più grande, giocatore di nuovo al centro
  espandiArena() {
    this.arena.genera(this.round.ciclo() + 1);
    this.flowField = this.arena.flowField;
    this.giocatore.body.reset(this.arena.l / 2, this.arena.a / 2);
    this.arco.disattivaTutte();
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
    this.interfaccia.nascondiPerMorte();
    this.controlli.azzeraTocchi();
    this.interfaccia.mostraRiepilogo();
  }
}
