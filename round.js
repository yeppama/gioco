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
    this.eventoProssimo = null;  // evento speciale deciso dalla scala dei round senza danni
    this.moltExtra = 1;          // round "più duro"
    this.minibossA = 0;          // quando far comparire il mini boss "a sorpresa" (0 = nessuno)
    this.dopoBossFurbo = false;  // quando muore il boss furbo arrivano due mini boss
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
  // Vita e danno: +10% a ogni round (senza mai ripartire da capo) e +33% per ogni boss sconfitto
  moltiplicatore() {
    const round = Math.max(1, this.numero);
    return (1 + CRESCITA_PER_ROUND * (round - 1)) * (1 + CRESCITA_PER_CICLO * this.ciclo()) * this.moltExtra;
  }

  // Dopo i 45 secondi i nemici rimasti accelerano sempre di più
  furia(t) {
    if (this.fase !== 'ripulisci') return 1;
    return Math.min(FURIA_MASSIMA, 1 + FURIA_PER_SECONDO * (t - this.inizioFuria) / 1000);
  }

  // Un gruppo di nemici vicini tra loro, in un punto fuori dallo schermo.
  // I gruppi crescono man mano che si avanza nel ciclo.
  generaGruppo(nemiciVivi, grandezzaFissa) {
    const posti = ONDATE.maxNemiciInsieme - nemiciVivi;
    const grandezza = grandezzaFissa || Math.min(posti, ONDATE.gruppoMassimo, ONDATE.gruppoMinimo + Math.floor((this.roundNelCiclo() - 1) / 3));
    if (grandezza <= 0) return;
    const g = this.scena.giocatore;
    const centro = this.scena.arena.puntoComparsa(g.x, g.y, ONDATE.distanzaComparsaMin, ONDATE.distanzaComparsaMax);
    for (let i = 0; i < grandezza; i++) {
      const p = this.scena.arena.limita(centro.x + Phaser.Math.Between(-50, 50), centro.y + Phaser.Math.Between(-50, 50));
      const elite = this.eliteDaGenerare;
      if (elite) {
        this.eliteDaGenerare = false;
        this.scena.interfaccia.mostraBanner('Un nemico d\'élite!');
      }
      generaNemico(this.scena, this.tipoCasuale(), p.x, p.y, elite);
    }
  }

  // Secondi di comparse in questo round: 20, 24, 28... fino al boss
  durataS() {
    return Math.min(DURATA_ROUND.primoS + DURATA_ROUND.aumentoS * (this.roundNelCiclo() - 1), DURATA_ROUND.massimoS);
  }

  // Millisecondi tra un gruppo e il successivo in questo round
  // Il ritmo continua ad aumentare anche dopo il boss (si conta il round assoluto)
  intervallo() {
    const ms = ONDATE.intervalloInizialeMs - ONDATE.riduzionePerRoundMs * (this.numero - 1);
    const minimo = Math.max(ONDATE.intervalloMinimoAssolutoMs, ONDATE.intervalloMinimoMs - ONDATE.riduzioneMinimoPerCicloMs * this.ciclo());
    return Math.max(ms, minimo);
  }

  // Velocità dei nemici in questo round: +7% a round dentro il ciclo
  moltiplicatoreVelocita() {
    return 1 + VELOCITA_PER_ROUND * (this.roundNelCiclo() - 1);
  }

  // --- Andamento del round ---

  aggiorna(t) {
    const nemiciVivi = this.scena.nemici.countActive();

    if (this.fase === 'pausa') {
      if (t >= this.fineFase) this.iniziaRound(t);
      return;
    }

    // Round del boss (o evento speciale): niente tempo, finisce quando sono tutti morti
    if (this.tipo === 'boss' || this.tipo === 'evento') {
      if (nemiciVivi === 0 && this.dopoBossFurbo) {
        // Il boss furbo è caduto: subito dopo, due mini boss
        this.dopoBossFurbo = false;
        generaBoss(this.scena, 'miniboss');
        generaBoss(this.scena, 'miniboss');
        this.scena.interfaccia.mostraBanner('E ora due Sentinelle!');
      } else if (nemiciVivi === 0) {
        this.terminaRound(t);
      }
      return;
    }

    // Mini boss "a sorpresa" (scala dei round senza danni)
    if (this.minibossA && (t >= this.minibossA || this.fase === 'ripulisci')) {
      this.minibossA = 0;
      generaBoss(this.scena, 'miniboss');
      this.scena.interfaccia.mostraBanner('Una Sentinella ti ha trovato!');
    }

    if (this.fase === 'combattimento') {
      if (t - this.inizio >= this.durataS() * 1000 && !this.minibossA) {
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
    this.moltExtra = 1;

    // Eventi della scala dei round senza danni
    const evento = this.eventoProssimo;
    this.eventoProssimo = null;
    if (evento === 'doppioboss' || evento === 'bossfurbo' ) {
      this.tipo = 'evento';
      if (evento === 'doppioboss') {
        generaBoss(this.scena, 'boss');
        generaBoss(this.scena, 'boss');
        this.scena.interfaccia.mostraBanner('Doppio boss!');
      } else {
        rendiFurbo(generaBoss(this.scena, 'boss'));
        this.dopoBossFurbo = true;
        this.scena.interfaccia.mostraBanner('Il Custode ti studia...');
      }
      return;
    }
    if (evento === 'difficile') this.moltExtra = SCALA_PERFETTI.moltDifficile;
    if (evento === 'miniboss' && this.tipo === 'normale') this.minibossA = t + Phaser.Math.Between(4000, 12000);

    // Dopo il round 7 di ogni ciclo (e fino al boss) arriva un nemico d'élite
    this.eliteDaGenerare = this.tipo === 'normale' && this.roundNelCiclo() > ELITE.dopoRound;

    if (this.tipo === 'boss') {
      generaBoss(this.scena, 'boss');
      // Il boss non arriva da solo: lo accompagna un'orda
      const quanti = ORDA_BOSS.nemiciPerGruppo + ORDA_BOSS.extraPerCiclo * this.ciclo();
      for (let i = 0; i < ORDA_BOSS.gruppi; i++) this.generaGruppo(0, quanti);
      this.scena.interfaccia.mostraBanner(BOSS.nome);
    } else if (this.tipo === 'miniboss') {
      generaBoss(this.scena, 'miniboss');
      this.scena.interfaccia.mostraBanner('Round ' + this.numero + ': ' + MINIBOSS.nome);
    } else {
      this.scena.interfaccia.mostraBanner('Round ' + this.numero + (this.moltExtra > 1 ? ': più duro!' : ''));
    }
  }

  terminaRound(t) {
    this.fase = 'pausa';
    this.fineFase = t + PAUSA_TRA_ROUND_MS;
    // Normalmente non c'è più nessuno; serve se il round viene chiuso dal tasto debug
    for (const n of this.scena.nemici.getChildren().slice()) dissolviNemico(this.scena, n);
    for (const p of this.scena.proiettiliNemici.getChildren()) if (p.active) disattivaProiettile(p);
    svuotaZone(this.scena);

    this.minibossA = 0;
    if (this.tipo === 'boss') {
      this.scena.espandiArena();
      this.scena.interfaccia.mostraBanner('Boss sconfitto! L\'arena si allarga');
    } else {
      this.scena.interfaccia.mostraBanner('Round ' + this.numero + ' superato!');
    }
    this.scena.fineRound(this.numero, this.tipo === 'boss');
  }

  // Salto in avanti (premio dei 10 round senza danni): nuova arena del ciclo raggiunto
  salta(quanti) {
    const cicloPrima = this.ciclo();
    this.numero += quanti;
    if (this.ciclo() !== cicloPrima) this.scena.rigeneraArena(this.ciclo());
    this.scena.interfaccia.mostraBanner('Scaraventato avanti di ' + quanti + ' round!');
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
    if (this.fase === 'pausa' || this.tipo === 'boss' || this.tipo === 'evento') return '';
    if (this.fase === 'ripulisci') return 'Rimasti: ' + this.scena.nemici.countActive();
    return Math.max(0, Math.ceil(this.durataS() - (t - this.inizio) / 1000)) + ' s';
  }
}
