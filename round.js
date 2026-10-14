// ============================================================
// ROUND - il ritmo della partita
//
// Ogni round dura DURATA_ROUND_S secondi. Durante il round i nemici
// compaiono a intervalli regolari, sempre più fitti. Allo scadere
// del tempo i nemici rimasti spariscono, c'è una breve pausa
// e parte il round successivo.
// (Il boss dopo il round 5 arriverà nella Fase 3.)
// ============================================================

class GestoreRound {
  constructor(scena) {
    this.scena = scena;
    this.numero = 0;
    this.fase = 'pausa';        // 'pausa' oppure 'combattimento'
    this.fineFase = 1000;       // il primo round parte 1 secondo dopo l'inizio
    this.inizio = 0;
    this.prossimaComparsa = 0;
  }

  aggiorna(t) {
    if (this.fase === 'pausa') {
      if (t >= this.fineFase) this.iniziaRound(t);
      return;
    }

    if (t - this.inizio >= DURATA_ROUND_S * 1000) {
      this.terminaRound(t);
      return;
    }

    if (t >= this.prossimaComparsa) {
      if (this.scena.nemici.countActive() < ONDATE.maxNemiciInsieme) {
        generaNemico(this.scena, this.tipoCasuale());
      }
      this.prossimaComparsa = t + this.intervallo();
    }
  }

  iniziaRound(t) {
    this.numero++;
    this.fase = 'combattimento';
    this.inizio = t;
    this.prossimaComparsa = t + 500;
    this.scena.interfaccia.mostraBanner('Round ' + this.numero);
  }

  terminaRound(t) {
    this.fase = 'pausa';
    this.fineFase = t + PAUSA_TRA_ROUND_MS;
    for (const n of this.scena.nemici.getChildren().slice()) dissolviNemico(this.scena, n);
    for (const p of this.scena.proiettiliNemici.getChildren()) if (p.active) disattivaProiettile(p);
    this.scena.interfaccia.mostraBanner('Round ' + this.numero + ' superato!');
  }

  // Millisecondi tra un nemico e il successivo in questo round
  intervallo() {
    const ms = ONDATE.intervalloInizialeMs - ONDATE.riduzionePerRoundMs * (this.numero - 1);
    return Math.max(ms, ONDATE.intervalloMinimoMs);
  }

  // Sceglie un tipo tra quelli già sbloccati, tenendo conto dei pesi
  tipoCasuale() {
    const possibili = COMPARSA_TIPI.filter(c => c.daRound <= this.numero);
    const totale = possibili.reduce((somma, c) => somma + c.peso, 0);
    let estratto = Math.random() * totale;
    for (const c of possibili) {
      estratto -= c.peso;
      if (estratto < 0) return c.tipo;
    }
    return possibili[0].tipo;
  }

  moltiplicatoreVita() {
    return 1 + CRESCITA_NEMICI_PER_ROUND * Math.max(0, this.numero - 1);
  }

  // Secondi che mancano alla fine del round (null se si è in pausa)
  secondiRimasti(t) {
    if (this.fase !== 'combattimento') return null;
    return Math.max(0, Math.ceil(DURATA_ROUND_S - (t - this.inizio) / 1000));
  }
}
