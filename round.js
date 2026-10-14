// ============================================================
// ROUND - il ritmo della partita
//
// Round normale: per 20 s (+4 s a round) compaiono GRUPPI di nemici,
// ognuno da una direzione diversa, fuori dallo schermo.
// Poi smettono di arrivare, ma il round finisce solo quando sono
// tutti morti: intanto quelli rimasti si infuriano (più veloci).
//
// Ogni OGNI_QUANTI_ROUND_MINIBOSS round arriva anche un mini boss,
// ogni OGNI_QUANTI_ROUND_BOSS round c'è solo il boss.
// Un "ciclo" sono i round fino al boss: dopo ogni boss tutto è più forte.
// ============================================================

class GestoreRound {
  constructor(scena) {
    this.scena = scena;
    this.numero = 0;
    this.tipo = 'normale';      // 'normale', 'miniboss' oppure 'boss'
    this.fase = 'pausa';        // 'pausa', 'combattimento' oppure 'ripulisci'
    this.fineFase = 1000;       // il primo round parte 1 secondo dopo l'inizio
    this.inizio = 0;
    this.inizioFuria = 0;
    this.prossimaComparsa = 0;
  }

  // --- Numeri che dipendono dal round ---

  tipoDelRound(numero) {
    if (numero % OGNI_QUANTI_ROUND_BOSS === 0) return 'boss';
    if (numero % OGNI_QUANTI_ROUND_MINIBOSS === 0) return 'miniboss';
    return 'normale';
  }

  // 0 nel primo ciclo (round 1-10), 1 nel secondo (11-20)...
  ciclo() {
    return Math.floor(Math.max(0, this.numero - 1) / OGNI_QUANTI_ROUND_BOSS);
  }

  // Da 1 a 10: a che punto del ciclo siamo
  roundNelCiclo() {
    return (Math.max(0, this.numero - 1) % OGNI_QUANTI_ROUND_BOSS) + 1;
  }

  // Quanto sono più forti i nemici rispetto ai valori di config.js
  moltiplicatore() {
    return (1 + CRESCITA_PER_CICLO * this.ciclo()) * (1 + CRESCITA_PER_ROUND * (this.roundNelCiclo() - 1));
  }

  // Dopo i 45 secondi i nemici rimasti accelerano sempre di più
  furia(t) {
    if (this.fase !== 'ripulisci') return 1;
    return Math.min(FURIA_MASSIMA, 1 + FURIA_PER_SECONDO * (t - this.inizioFuria) / 1000);
  }

  // Un gruppo di nemici vicini tra loro, in un punto fuori dallo schermo.
  // I gruppi crescono man mano che si avanza nel ciclo.
  generaGruppo(nemiciVivi) {
    const posti = ONDATE.maxNemiciInsieme - nemiciVivi;
    const grandezza = Math.min(posti, ONDATE.gruppoMassimo, ONDATE.gruppoMinimo + Math.floor((this.roundNelCiclo() - 1) / 3));
    if (grandezza <= 0) return;
    const g = this.scena.giocatore;
    const centro = this.scena.arena.puntoComparsa(g.x, g.y, ONDATE.distanzaComparsaMin, ONDATE.distanzaComparsaMax);
    for (let i = 0; i < grandezza; i++) {
      const p = this.scena.arena.limita(centro.x + Phaser.Math.Between(-50, 50), centro.y + Phaser.Math.Between(-50, 50));
      generaNemico(this.scena, this.tipoCasuale(), p.x, p.y);
    }
  }

  // Secondi di comparse in questo round: 20, 24, 28... fino al boss
  durataS() {
    return Math.min(DURATA_ROUND.primoS + DURATA_ROUND.aumentoS * (this.roundNelCiclo() - 1), DURATA_ROUND.massimoS);
  }

  // Millisecondi tra un gruppo e il successivo in questo round
  intervallo() {
    const ms = ONDATE.intervalloInizialeMs - ONDATE.riduzionePerRoundMs * (this.roundNelCiclo() - 1);
    return Math.max(ms, ONDATE.intervalloMinimoMs);
  }

  // --- Andamento del round ---

  aggiorna(t) {
    const nemiciVivi = this.scena.nemici.countActive();

    if (this.fase === 'pausa') {
      if (t >= this.fineFase) this.iniziaRound(t);
      return;
    }

    // Round del boss: niente tempo, finisce quando il boss (e i suoi evocati) sono morti
    if (this.tipo === 'boss') {
      if (nemiciVivi === 0) this.terminaRound(t);
      return;
    }

    if (this.fase === 'combattimento') {
      if (t - this.inizio >= this.durataS() * 1000) {
        this.fase = 'ripulisci';
        this.inizioFuria = t;
        if (nemiciVivi > 0) this.scena.interfaccia.mostraBanner('Elimina i rimasti!');
        return;
      }
      if (t >= this.prossimaComparsa) {
        this.generaGruppo(nemiciVivi);
        this.prossimaComparsa = t + this.intervallo();
      }
      return;
    }

    // fase 'ripulisci'
    if (nemiciVivi === 0) this.terminaRound(t);
  }

  iniziaRound(t) {
    this.numero++;
    this.tipo = this.tipoDelRound(this.numero);
    this.fase = 'combattimento';
    this.inizio = t;
    this.prossimaComparsa = t + 500;
    this.scena.dannoNelRound = false;

    if (this.tipo === 'boss') {
      generaBoss(this.scena, 'boss');
      this.scena.interfaccia.mostraBanner(BOSS.nome);
    } else if (this.tipo === 'miniboss') {
      generaBoss(this.scena, 'miniboss');
      this.scena.interfaccia.mostraBanner('Round ' + this.numero + ': ' + MINIBOSS.nome);
    } else {
      this.scena.interfaccia.mostraBanner('Round ' + this.numero);
    }
  }

  terminaRound(t) {
    this.fase = 'pausa';
    this.fineFase = t + PAUSA_TRA_ROUND_MS;
    // Normalmente non c'è più nessuno; serve se il round viene chiuso dal tasto debug
    for (const n of this.scena.nemici.getChildren().slice()) dissolviNemico(this.scena, n);
    for (const p of this.scena.proiettiliNemici.getChildren()) if (p.active) disattivaProiettile(p);
    svuotaZone(this.scena);

    if (this.tipo === 'boss') {
      this.scena.espandiArena();
      this.scena.interfaccia.mostraBanner('Boss sconfitto! L\'arena si allarga');
    } else {
      this.scena.interfaccia.mostraBanner('Round ' + this.numero + ' superato!');
    }
    this.scena.fineRound(this.numero, this.tipo === 'boss');
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

  // Testo sotto il numero del round: secondi rimasti, nemici da eliminare...
  testoStato(t) {
    if (this.fase === 'pausa' || this.tipo === 'boss') return '';
    if (this.fase === 'ripulisci') return 'Rimasti: ' + this.scena.nemici.countActive();
    return Math.max(0, Math.ceil(this.durataS() - (t - this.inizio) / 1000)) + ' s';
  }
}
