// ============================================================
// PROGRESSI - esperienza, scelte, premi e pausa
//
// Level up, fine dei round, scala dei round senza danni, schermate
// "scegli 1 tra 3" e prendere abilità o benedizioni.
//
// Sono "pezzi" della scena partita, messi in un file a parte per
// non avere un unico file enorme. In fondo a partita.js una riga li
// aggiunge alla scena (Object.assign): dentro, "this" è sempre la scena.
// ============================================================

const METODI_PROGRESSI = {
  guadagnaExp(quantita) {
    this.exp += quantita * this.stats.expMolt;
    while (this.exp >= this.expNecessaria) {
      this.exp -= this.expNecessaria;
      this.livello++;
      this.expNecessaria = Math.round(EXP_PRIMO_LIVELLO * Math.pow(CRESCITA_EXP, this.livello - 1));
      this.codaScelte.push({ tipo: 'abilita', titolo: tr('scelta.livello', this.livello) });
    }
  },

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
  },

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
  },

  // Chiamata quando muore il mini boss
  bottinoMiniboss() {
    this.codaScelte.push({ tipo: 'maledetta', titolo: tr('scelta.sentinella') });
  },

  // Apre la schermata "scegli 1 tra 3" e mette in pausa la partita
  apriScelta(voce) {
    const tabelle = { abilita: ABILITA, maledetta: MALEDETTE, divina: DIVINE, premio: PREMI };
    const opzioni = estraiOpzioni(this.livelliAbilita, CARTE_PER_SCELTA, tabelle[voce.tipo]);
    // Se una combinazione è pronta, prende il posto della terza carta
    if (voce.tipo === 'abilita') {
      const combo = combinazioniPronte(this.livelliAbilita)[0];
      if (combo) opzioni.splice(CARTE_PER_SCELTA - 1, 1, { id: combo.id, nome: nomeDi(combo), livello: 1, rarita: 'combinazione', descrizione: descrizioneDi(combo, 1) });
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
  },

  apriPausa() {
    this.giocatore.body.setVelocity(0, 0);
    this.controlli.rilascia();
    this.scene.launch('pausa', { partita: this });
    this.scene.pause();
  },

  prendiAbilita(id) {
    const voce = trovaVoce(id);
    // Sicurezza: oltre il massimo i numeri delle abilità non esistono (es. Casinò livello 4 = NaN)
    if ((this.livelliAbilita[id] || 0) >= voce.max) return;
    this.livelliAbilita[id] = (this.livelliAbilita[id] || 0) + 1;
    const prima = this.stats;
    this.stats = calcolaStatistiche(this.livelliAbilita);
    // Se la vita massima cresce (Vigore), la stessa quantità si recupera subito
    if (this.stats.vitaMax > prima.vitaMax) this.vita += this.stats.vitaMax - prima.vitaMax;
    // Faretra più grande: le frecce in più arrivano subito (se non si sta ricaricando)
    if (this.stats.frecceFaretra > prima.frecceFaretra && !this.arco.inRicarica) {
      this.arco.frecceRimaste += this.stats.frecceFaretra - prima.frecceFaretra;
    }
    if (voce.alPrendere) voce.alPrendere(this);
    this.vita = Math.min(this.vita, this.stats.vitaMax);
    this.arco.frecceRimaste = Math.min(this.arco.frecceRimaste, this.stats.frecceFaretra);
  },
};
