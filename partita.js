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
    this.codaScelte = [{ tipo: 'abilita', titolo: tr('scelta.prima') }];
    this.dannoNelRound = false;  // per il premio del round senza danni
    this.roundSenzaDanni = 0;    // quanti round di fila senza danni
    this.premiSaltati = 0;       // ogni PREMI_SALTATI_PER_MALEDETTA premi saltati = un potere maledetto
    // Overheal: cure in più a vita piena; a una vita intera si guadagna uno scudo
    this.overheal = 0;
    this.scudiOverheal = 0;
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
    this.fulmine = new Fulmine(this);
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
    this.fulmine.aggiorna(t, passo);
    if (this.arena.terrenoIn(this.giocatore.x, this.giocatore.y) === 'lava') this.subisciDanno(TERRENI.lavaDanno);
    this.lame.aggiorna(t);
    this.scia.aggiorna(t);
    this.consumabili.aggiorna(t);
    this.round.aggiorna(t);
    aggiornaZone(this, t);

    // Nemici: prima si aggiorna la mappa dei percorsi, poi ognuno si muove
    const visto = this.vista();
    this.flowField.aggiorna(visto.x, visto.y);
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

  // ---------------------------------------------------------- DANNI AI NEMICI

  // Danno di una freccia in questo momento
  // (Ultimo respiro lo raddoppia a vita bassa, Sete di battaglia cresce con le uccisioni)
  dannoFreccia() {
    const ultimo = this.vitaCritica() ? BENEDIZIONI.ultimorespiro.danno : 1;
    return this.stats.danno * ultimo * (1 + this.seteBonus);
  }

  // Ultimo respiro attivo e vita sotto la soglia
  vitaCritica() {
    return this.stats.ultimoRespiro && this.vita < this.stats.vitaMax * BENEDIZIONI.ultimorespiro.soglia;
  }

  // Dove i nemici credono che tu sia: di solito dove sei, ma con Ombra lenta
  // dopo una schivata guardano il punto da cui sei partito
  vista() {
    if (this.tempo >= this.invisibileFino) return this.giocatore;
    return { x: this.puntoVisto.x, y: this.puntoVisto.y, body: { velocity: { x: 0, y: 0 } } };
  }

  // Chiamata da nemici.js a ogni uccisione: effetti delle benedizioni
  alUccidere() {
    // Patto di sangue: ogni uccisione costa vita (ma non uccide mai)
    if (this.stats.vitaPerUccisione > 0) this.vita = Math.max(1, this.vita - this.stats.vitaPerUccisione);
    // Faretra benedetta: frecce restituite
    this.arco.restituisci(this.stats.frecceUccisione);
    // Sete di battaglia: danno in più fino a fine round
    if (this.stats.setePerUccisione > 0) {
      this.seteBonus = Math.min(BENEDIZIONI.setebattaglia.dannoMassimo, this.seteBonus + this.stats.setePerUccisione);
    }
  }

  // Ricarica sacra: i nemici vicini (non i boss) vengono spinti via
  respingiNemici(t) {
    const R = BENEDIZIONI.ricaricasacra;
    const g = this.giocatore;
    const onda = this.add.circle(g.x, g.y, R.raggioSpinta, 0xf7d774, 0.15).setStrokeStyle(2, 0xf7d774, 0.7);
    this.time.delayedCall(180, () => onda.destroy());
    for (const n of this.nemici.getChildren()) {
      if (n.eBoss || Phaser.Math.Distance.Between(g.x, g.y, n.x, n.y) > R.raggioSpinta) continue;
      const a = Phaser.Math.Angle.Between(g.x, g.y, n.x, n.y);
      n.body.setVelocity(Math.cos(a) * R.forzaSpinta, Math.sin(a) * R.forzaSpinta);
      n.spintaFino = t + R.durataSpintaMs;
    }
  }

  // Frecce infuocate e di brina
  applicaEffetti(n) {
    const t = this.tempo;
    const resistenza = resistenzaDi(this, n); // élite e nemici dopo i boss resistono agli elementi
    if (this.stats.fuocoDanno > 0) {
      if (t >= n.bruciaFino) n.prossimaBruciatura = t + INTERVALLO_FUOCO_MS;
      n.bruciaFino = t + DURATA_FUOCO_MS;
      n.dannoFuoco = this.stats.fuocoDanno * this.stats.dannoMolt * (1 - resistenza);
    }
    if (this.stats.geloRallenta > 0) {
      n.rallentatoFino = t + DURATA_GELO_MS;
      const gelo = n.eBoss ? this.stats.geloRallenta / 2 : this.stats.geloRallenta;
      n.rallentamento = gelo * (1 - resistenza);
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
      // Ultimo respiro: a vita critica l'abilità Rigenerazione si ferma (le altre cure no)
      if (this.stats.rigenerazione > 0 && !this.vitaCritica()) this.cura(this.stats.rigenerazione);
    }
    // Scudo spirituale: torna pronto dopo il suo tempo di ricarica
    if (this.stats.scudoMs > 0 && !this.scudoPronto && t >= this.prossimoScudo) this.scudoPronto = true;
    this.aloneScudo.setVisible(this.stats.scudoMs > 0 && this.scudoPronto);
    this.aloneScudo.setPosition(this.giocatore.x, this.giocatore.y);
  }

  // Ogni cura passa da qui: quello che supera la vita massima va nell'overheal
  cura(quantita) {
    // Ultimo respiro: tutte le cure valgono meno
    quantita *= this.stats.cureMolt;
    const spazio = this.stats.vitaMax - this.vita;
    this.vita = Math.min(this.stats.vitaMax, this.vita + quantita);
    const avanzo = quantita - Math.max(0, spazio);
    if (avanzo <= 0) return;
    this.overheal += avanzo;
    // Una vita intera di cure in più (senza danni nel mezzo) = uno scudo da un colpo
    while (this.overheal >= this.stats.vitaMax && this.scudiOverheal < OVERHEAL_SCUDI_MASSIMI) {
      this.overheal -= this.stats.vitaMax;
      this.scudiOverheal++;
      this.interfaccia.mostraBanner(tr('b.scudoOverheal'));
    }
    if (this.scudiOverheal >= OVERHEAL_SCUDI_MASSIMI) this.overheal = Math.min(this.overheal, this.stats.vitaMax);
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

    // Poi gli scudi dell'overheal, uno per colpo
    if (this.scudiOverheal > 0) {
      this.scudiOverheal--;
      this.ultimoColpo = t;
      this.cameras.main.flash(120, 111, 211, 111);
      return;
    }

    this.ultimoColpo = t;
    this.dannoNelRound = true;
    this.overheal = 0; // un danno vero azzera l'accumulo dell'overheal
    this.vita = Math.max(0, this.vita - danno);
    this.cameras.main.shake(100, 0.005); // piccolo scossone dello schermo
    if (this.vita === 0 && this.stats.secondaVita && !this.secondaVitaUsata) {
      // Seconda vita: una volta per partita si torna in piedi
      this.secondaVitaUsata = true;
      this.vita = Math.round(this.stats.vitaMax * BENEDIZIONI.secondavita.vita);
      this.ultimoColpo = t + BENEDIZIONI.secondavita.invulnerabileMs - INVULNERABILITA_MS; // un attimo per scappare
      this.cameras.main.flash(300, 247, 215, 116);
      this.interfaccia.mostraBanner(tr('b.secondaVita'));
      return;
    }
    if (this.vita === 0) this.muori();
  }

  // ---------------------------------------------------------- ESPERIENZA, SCELTE, PAUSA

  guadagnaExp(quantita) {
    this.exp += quantita * this.stats.expMolt;
    while (this.exp >= this.expNecessaria) {
      this.exp -= this.expNecessaria;
      this.livello++;
      this.expNecessaria = Math.round(EXP_PRIMO_LIVELLO * Math.pow(CRESCITA_EXP, this.livello - 1));
      this.codaScelte.push({ tipo: 'abilita', titolo: tr('scelta.livello', this.livello) });
    }
  }

  // Chiamata da round.js quando un round finisce
  fineRound(numero, eraBoss) {
    // Benedizione divina: solo e soltanto dopo aver sconfitto un boss
    if (eraBoss) this.codaScelte.push({ tipo: 'divina', titolo: tr('scelta.divinaBoss') });
    // Round senza danni: un premio a scelta (e il contatore sale)
    if (!this.dannoNelRound) {
      this.roundSenzaDanni++;
      this.codaScelte.push({ tipo: 'premio', titolo: tr('scelta.premio') });
      this.scalaPerfetti();
    } else {
      this.roundSenzaDanni = 0;
    }
  }

  // Più round di fila senza danni = prove più dure, e alla fine un premio enorme
  scalaPerfetti() {
    const n = this.roundSenzaDanni;
    const S = SCALA_PERFETTI;
    if (n === S.minibossA) this.round.eventoProssimo = 'miniboss';
    else if (n === S.difficileA) this.round.eventoProssimo = 'difficile';
    else if (n === S.doppioBossA) this.round.eventoProssimo = 'doppioboss';
    else if (n === S.bossFurboA) this.round.eventoProssimo = 'bossfurbo';
    else if (n >= S.premioA) {
      this.codaScelte.push({ tipo: 'divina', titolo: tr('scelta.perfetti1') });
      this.codaScelte.push({ tipo: 'divina', titolo: tr('scelta.perfetti2') });
      this.round.salta(S.salto);
      this.roundSenzaDanni = 0;
    }
  }

  // Chiamata quando muore il mini boss
  bottinoMiniboss() {
    this.codaScelte.push({ tipo: 'maledetta', titolo: tr('scelta.sentinella') });
  }

  // Apre la schermata "scegli 1 tra 3" e mette in pausa la partita
  apriScelta(voce) {
    const tabelle = { abilita: ABILITA, maledetta: MALEDETTE, divina: DIVINE, premio: PREMI };
    const opzioni = estraiOpzioni(this.livelliAbilita, 3, tabelle[voce.tipo]);
    // Se una combinazione è pronta, prende il posto della terza carta
    if (voce.tipo === 'abilita') {
      const combo = combinazioniPronte(this.livelliAbilita)[0];
      if (combo) opzioni.splice(2, 1, { id: combo.id, nome: nomeDi(combo), livello: 1, rarita: 'combinazione', descrizione: descrizioneDi(combo, 1) });
    }
    if (opzioni.length === 0) return; // tutto già al massimo
    this.giocatore.body.setVelocity(0, 0);
    this.controlli.rilascia();
    this.scene.launch('scelta', {
      titolo: voce.titolo,
      tipo: voce.tipo,
      opzioni,
      premiSaltati: this.premiSaltati,
      alScegliere: (id) => {
        if (id === 'riposo') {
          this.cura(this.stats.vitaMax * RIPOSO_CURA);
        } else if (id === 'salta') {
          // Premi saltati: dopo un certo numero arriva un potere maledetto
          this.premiSaltati++;
          if (this.premiSaltati >= PREMI_SALTATI_PER_MALEDETTA) {
            this.premiSaltati = 0;
            this.codaScelte.push({ tipo: 'maledetta', titolo: tr('scelta.saltati') });
          }
        } else if (id) {
          this.prendiAbilita(id);
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
    this.fulmine.nascondi();
    this.interfaccia.nascondiPerMorte();
    this.controlli.azzeraTocchi();
    this.interfaccia.mostraRiepilogo();
  }
}
