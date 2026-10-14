// ============================================================
// SCENA PARTITA - mette insieme tutti i pezzi:
// giocatore, arco, abilità, nemici, round, esperienza, vita e morte
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
    // si ferma durante la scelta delle abilità
    this.tempo = 0;
    this.morto = false;

    // Abilità prese in questa run: { idAbilita: livello }
    this.livelliAbilita = {};
    this.stats = calcolaStatistiche(this.livelliAbilita);
    this.vita = this.stats.vitaMax;

    // Esperienza
    this.livello = 1;
    this.exp = 0;
    this.expNecessaria = EXP_PRIMO_LIVELLO;
    // Scelte da mostrare appena possibile (abilità, benedizioni), in ordine.
    // All'inizio si sceglie la prima abilità.
    this.codaScelte = [{ tipo: 'abilita', titolo: 'Scegli la tua prima abilità' }];
    this.dannoNelRound = false;  // per la benedizione divina
    this.bossAttivo = null;      // il boss o mini boss in campo (per la sua barra della vita)

    // Arco e movimento
    this.ultimoColpo = -Infinity;    // momento dell'ultimo danno subito
    this.prossimoSparo = 0;
    this.frecceRimaste = this.stats.frecceFaretra;
    this.fineRicarica = 0;
    this.direzione = { x: 1, y: 0 }; // dove spara: sempre al contrario di dove cammina
    this.movimento = { x: 0, y: 0 }; // direzione dei comandi in questo momento
    this.fineSchivata = 0;
    this.dirSchivata = { x: 0, y: 0 };

    // Abilità difensive
    this.prossimaRigenerazione = INTERVALLO_RIGENERAZIONE_MS;
    this.scudoPronto = true;
    this.prossimoScudo = 0;

    // --- Ostacoli: rettangoli grigi che non si muovono ---
    this.ostacoli = this.physics.add.staticGroup();
    for (const o of OSTACOLI) {
      const blocco = this.add.rectangle(o.x, o.y, o.l, o.a, 0x55555f);
      this.physics.add.existing(blocco, true); // true = fermo, non viene spinto
      this.ostacoli.add(blocco);
    }

    // --- Mappa dei percorsi per i nemici ---
    this.flowField = new FlowField(LARGHEZZA, ALTEZZA, CELLA_FLOW, OSTACOLI, MARGINE_FLOW);

    // --- Giocatore: quadrato azzurro al centro ---
    this.giocatore = this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LATO_GIOCATORE, LATO_GIOCATORE, 0x4fa3ff);
    this.physics.add.existing(this.giocatore);
    this.giocatore.body.setCollideWorldBounds(true); // non esce dall'arena

    // Cerchio azzurro attorno al giocatore quando lo Scudo spirituale è pronto
    this.aloneScudo = this.add.circle(0, 0, LATO_GIOCATORE * 0.9).setStrokeStyle(2, 0x7fd6ff, 0.9).setVisible(false);
    // Il mirino: un puntino che mostra dove sparerà
    this.mirino = this.add.rectangle(0, 0, 6, 6, 0xffffff);

    // --- Gruppi ---
    this.frecce = this.physics.add.group();
    this.nemici = this.physics.add.group();
    this.proiettiliNemici = this.physics.add.group();

    // --- Collisioni ---
    this.physics.add.collider(this.giocatore, this.ostacoli);
    this.physics.add.collider(this.nemici, this.ostacoli);
    this.physics.add.collider(this.nemici, this.nemici); // i nemici non si sovrappongono
    this.physics.add.collider(this.frecce, this.ostacoli, (freccia) => this.frecciaSuOstacolo(freccia));
    this.physics.add.overlap(this.frecce, this.nemici, (freccia, nemico) => this.frecciaSuNemico(freccia, nemico));
    this.physics.add.overlap(this.giocatore, this.nemici, (giocatore, nemico) => this.subisciDanno(nemico.dannoContatto));
    this.physics.add.collider(this.proiettiliNemici, this.ostacoli, (p) => disattivaProiettile(p));
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
  }

  // update() viene eseguita OGNI fotogramma (circa 60 volte al secondo)
  update(time, delta) {
    if (this.morto) {
      if (this.controlli.ricomincia()) this.scene.restart();
      return;
    }

    // Schermate di scelta: la partita si mette in pausa finché non si sceglie
    if (this.codaScelte.length > 0) {
      this.apriScelta(this.codaScelte.shift());
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

    this.gestisciArco(t);
    this.gestisciDifese(t);
    this.lame.aggiorna(t);
    this.round.aggiorna(t);

    // Nemici: prima si aggiorna la mappa dei percorsi, poi ognuno si muove
    this.flowField.aggiorna(this.giocatore.x, this.giocatore.y);
    for (const n of this.nemici.getChildren().slice()) aggiornaNemico(this, n, t);

    this.controllaBordiFrecce();
    for (const p of this.proiettiliNemici.getChildren()) {
      if (p.active && (p.x < 0 || p.x > LARGHEZZA || p.y < 0 || p.y > ALTEZZA)) disattivaProiettile(p);
    }

    // Lampeggio mentre si è invulnerabili dopo un colpo; mezzo trasparente durante la schivata
    const invulnerabile = t - this.ultimoColpo < INVULNERABILITA_MS;
    this.giocatore.setAlpha(invulnerabile && Math.floor(t / 80) % 2 === 0 ? 0.3 : 1);
    if (t < this.fineSchivata) this.giocatore.setAlpha(0.5);

    this.interfaccia.aggiorna(t);
  }

  // ---------------------------------------------------------- MOVIMENTO

  // Muove il giocatore e restituisce true se si sta muovendo
  muoviGiocatore() {
    // Direzione da tastiera o joystick: x e y tra -1 e 1
    const { x: dx, y: dy } = this.controlli.direzione();
    this.movimento = { x: dx, y: dy };
    const inMovimento = dx !== 0 || dy !== 0;
    // Si spara alle proprie spalle: direzione opposta al movimento.
    // Da fermo resta l'ultima direzione, quindi si continua a sparare lì.
    if (inMovimento) this.direzione = { x: -dx, y: -dy };

    this.giocatore.body.setVelocity(dx * this.stats.velocita, dy * this.stats.velocita);
    return inMovimento;
  }

  // Scatto veloce che costa frecce
  schiva(t) {
    // Senza abbastanza frecce (o durante la ricarica) non si schiva
    if (this.frecceRimaste < this.stats.costoSchivata) {
      this.interfaccia.lampeggiaFrecce();
      return;
    }

    // Si schiva dove si sta andando; da fermo, nell'ultima direzione in cui si camminava
    const fermo = this.movimento.x === 0 && this.movimento.y === 0;
    this.dirSchivata = fermo ? { x: -this.direzione.x, y: -this.direzione.y } : { ...this.movimento };
    this.fineSchivata = t + DURATA_SCHIVATA_MS;

    this.frecceRimaste -= this.stats.costoSchivata;
    if (this.frecceRimaste === 0) this.fineRicarica = t + this.stats.ricaricaMs; // faretra svuotata: si ricarica
  }

  // ---------------------------------------------------------- ARCO

  // Spara da solo a intervalli regolari; a faretra vuota ricarica
  gestisciArco(t) {
    const inRicarica = this.frecceRimaste === 0;
    if (inRicarica && t >= this.fineRicarica) {
      this.frecceRimaste = this.stats.frecceFaretra; // ricarica finita
    } else if (!inRicarica && t >= this.prossimoSparo) {
      this.spara();
      this.frecceRimaste--; // una raffica costa una freccia, anche se ne partono di più
      this.prossimoSparo = t + this.stats.cadenzaMs;
      if (this.frecceRimaste === 0) this.fineRicarica = t + this.stats.ricaricaMs;
    }
  }

  // Una raffica: la direzione base, più le frecce extra date dalle abilità
  spara() {
    const g = this.giocatore;
    let angolo = Math.atan2(this.direzione.y, this.direzione.x);

    // Occhio del cacciatore: se c'è un nemico abbastanza vicino, si mira a lui
    if (this.stats.raggioMira > 0) {
      const bersaglio = this.nemicoPiuVicino(this.stats.raggioMira);
      if (bersaglio) angolo = Phaser.Math.Angle.Between(g.x, g.y, bersaglio.x, bersaglio.y);
    }

    // Ventaglio: coppie di frecce inclinate a destra e a sinistra
    const angoli = [angolo];
    for (let i = 1; i <= this.stats.coppieDiagonali; i++) {
      const scarto = Phaser.Math.DegToRad(ANGOLO_VENTAGLIO * i);
      angoli.push(angolo - scarto, angolo + scarto);
    }

    // Freccia doppia: per ogni direzione, più frecce affiancate
    const affiancate = 1 + this.stats.frecceParallele;
    for (const a of angoli) {
      const perpendicolare = a + Math.PI / 2;
      for (let k = 0; k < affiancate; k++) {
        const spostamento = (k - (affiancate - 1) / 2) * DISTANZA_PARALLELE;
        const x = g.x + Math.cos(a) * 20 + Math.cos(perpendicolare) * spostamento;
        const y = g.y + Math.sin(a) * 20 + Math.sin(perpendicolare) * spostamento;
        // Furia cieca: ogni freccia devia un po' a caso
        const deviazione = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-1, 1) * this.stats.deviazione);
        this.lanciaFreccia(x, y, a + deviazione);
      }
    }
  }

  // Le frecce non vengono distrutte: si riusano (più veloce con tante frecce)
  lanciaFreccia(x, y, angolo) {
    let f = this.frecce.getFirstDead(false);
    if (!f) {
      f = this.add.rectangle(0, 0, LATO_FRECCIA, LATO_FRECCIA, 0xf2e6b8);
      this.frecce.add(f);
      f.body.setBounce(1); // serve per Rimbalzo: sugli ostacoli torna indietro
    }
    f.rimbalziRimasti = this.stats.rimbalzi;
    f.perforazioniRimaste = this.stats.perforazioni;
    f.colpiti = new Set(); // nemici già colpiti da questa freccia (non due volte lo stesso)
    f.setActive(true).setVisible(true);
    f.body.enable = true;
    f.body.reset(x, y);
    f.body.setVelocity(Math.cos(angolo) * VELOCITA_FRECCIA, Math.sin(angolo) * VELOCITA_FRECCIA);
  }

  frecciaSuOstacolo(f) {
    if (f.rimbalziRimasti > 0) {
      f.rimbalziRimasti--;   // la fisica l'ha già fatta rimbalzare
      f.colpiti.clear();     // dopo un rimbalzo può colpire di nuovo
    } else {
      this.disattivaFreccia(f);
    }
  }

  frecciaSuNemico(f, n) {
    if (!f.active || f.colpiti.has(n)) return;
    f.colpiti.add(n);
    this.applicaEffetti(n);
    colpisciNemico(this, n, this.dannoFreccia());
    if (f.perforazioniRimaste > 0) {
      f.perforazioniRimaste--; // la attraversa e continua
    } else {
      this.disattivaFreccia(f);
    }
  }

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

  // Bordi dell'arena: con Rimbalzo la freccia torna indietro, altrimenti sparisce
  controllaBordiFrecce() {
    for (const f of this.frecce.getChildren()) {
      if (!f.active) continue;
      const fuoriX = f.x < 0 || f.x > LARGHEZZA;
      const fuoriY = f.y < 0 || f.y > ALTEZZA;
      if (!fuoriX && !fuoriY) continue;
      if (f.rimbalziRimasti > 0) {
        f.rimbalziRimasti--;
        f.colpiti.clear();
        if (fuoriX) f.body.velocity.x *= -1;
        if (fuoriY) f.body.velocity.y *= -1;
        f.setPosition(Phaser.Math.Clamp(f.x, 0, LARGHEZZA), Phaser.Math.Clamp(f.y, 0, ALTEZZA));
      } else {
        this.disattivaFreccia(f);
      }
    }
  }

  disattivaFreccia(f) {
    f.setActive(false).setVisible(false);
    f.body.stop();
    f.body.enable = false;
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

  // ---------------------------------------------------------- VITA E DIFESE

  gestisciDifese(t) {
    // Rigenerazione
    if (t >= this.prossimaRigenerazione) {
      this.prossimaRigenerazione = t + INTERVALLO_RIGENERAZIONE_MS;
      if (this.stats.rigenerazione > 0 && !this.stats.rigenerazioneBloccata) this.vita = Math.min(this.stats.vitaMax, this.vita + this.stats.rigenerazione);
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

  // ---------------------------------------------------------- ESPERIENZA E ABILITÀ

  guadagnaExp(quantita) {
    this.exp += quantita * this.stats.expMolt;
    while (this.exp >= this.expNecessaria) {
      this.exp -= this.expNecessaria;
      this.livello++;
      this.expNecessaria = Math.round(EXP_PRIMO_LIVELLO * Math.pow(CRESCITA_EXP, this.livello - 1));
      this.codaScelte.push({ tipo: 'abilita', titolo: 'Livello ' + this.livello + '!' });
      // Ogni 5 livelli, in più, una benedizione maledetta
      if (this.livello % 5 === 0) this.codaScelte.push({ tipo: 'maledetta', titolo: 'Benedizione maledetta' });
    }
  }

  // Chiamata da round.js quando un round finisce
  fineRound(numero) {
    if (numero >= 3 && !this.dannoNelRound) {
      this.codaScelte.push({ tipo: 'divina', titolo: 'Nessun danno: benedizione divina' });
    }
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
        if (id) this.prendiAbilita(id); // id vuoto = benedizione maledetta rifiutata
        this.scene.resume();
      },
    });
    this.scene.pause();
  }

  prendiAbilita(id) {
    this.livelliAbilita[id] = (this.livelliAbilita[id] || 0) + 1;
    const prima = this.stats;
    this.stats = calcolaStatistiche(this.livelliAbilita);
    // Se la vita massima cresce (Vigore), la stessa quantità si recupera subito
    if (this.stats.vitaMax > prima.vitaMax) this.vita += this.stats.vitaMax - prima.vitaMax;
    // Faretra più grande: le frecce in più arrivano subito (se non si sta ricaricando)
    if (this.stats.frecceFaretra > prima.frecceFaretra && this.frecceRimaste > 0) {
      this.frecceRimaste += this.stats.frecceFaretra - prima.frecceFaretra;
    }
    const voce = trovaVoce(id);
    if (voce.alPrendere) voce.alPrendere(this);
    this.vita = Math.min(this.vita, this.stats.vitaMax);
    this.frecceRimaste = Math.min(this.frecceRimaste, this.stats.frecceFaretra);
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
    this.lame.nascondi();
    this.interfaccia.nascondiPerMorte();
    this.controlli.azzeraTocchi();

    const comeRicominciare = this.sys.game.device.input.touch ? 'Tocca per ricominciare' : 'Premi R per ricominciare';
    const riepilogo = 'Round ' + this.round.numero + '  ·  Livello ' + this.livello;
    this.add.text(LARGHEZZA / 2, ALTEZZA / 2, 'SEI MORTO\n' + riepilogo + '\n\n' + comeRicominciare, {
      fontSize: '30px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(30);
  }
}
