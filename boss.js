// ============================================================
// BOSS E MINI BOSS
//
// Funzionano a turni: si avvicinano, poi scelgono il prossimo attacco
// della loro lista, lo ANNUNCIANO (lampeggio + segnale rosso a terra)
// e solo dopo lo eseguono. L'annuncio è il tempo per spostarsi.
//
// Attacchi:
//  - carica: scatto in linea retta (la linea rossa mostra dove)
//  - anello: proiettili in tutte le direzioni
//  - ventaglio: proiettili a ventaglio verso il giocatore
//  - evocazione: fa comparire nemici attorno a sé
//  - pioggia: cerchi rossi attorno al giocatore che esplodono poco dopo
// ============================================================

function generaBoss(scena, tipo) {
  const dati = tipo === 'boss' ? BOSS : MINIBOSS;
  const g = scena.giocatore;
  const punto = scena.arena.puntoComparsa(g.x, g.y, BOSS_COMUNI.comparsaMin, BOSS_COMUNI.comparsaMax);
  const n = scena.add.rectangle(punto.x, punto.y, dati.lato, dati.lato, dati.colore);
  scena.nemici.add(n);
  n.body.setCollideWorldBounds(true);
  n.body.pushable = false; // gli altri nemici non lo spostano

  preparaNemico(scena, n, tipo, dati, scena.round.moltiplicatore());
  n.eBoss = true;
  n.moltVelocita = 1; // i boss non accelerano con i round: diventano solo più resistenti
  n.attacchi = tipo === 'boss' ? ['carica', 'pioggia', 'anello', 'evocazione'] : ['ventaglio', 'carica'];
  n.indiceAttacco = 0;
  n.stato = 'avvicina';
  n.prossimoAttacco = scena.tempo + BOSS_COMUNI.primoAttaccoMs;
  n.faseExtra = false;
  n.avviso = null;

  scena.bossAttivo = n;
  n.setScale(0.2);
  scena.tweens.add({ targets: n, scale: 1, duration: 500, ease: 'Back.Out' });
  return n;
}

// Boss "furbo" (scala dei round senza danni): prevede i tuoi movimenti e schiva le frecce
function rendiFurbo(n) {
  n.furbo = true;
  n.elite = true; // usa la mira "predittiva" degli élite (e il bordo dorato)
  n.vitaMax = Math.round(n.vitaMax * BOSS_FURBO.vita);
  n.vita = n.vitaMax;
  n.prossimaSchivata = 0;
  return n;
}

// Se una freccia gli sta arrivando addosso, scarta di lato
function provaASchivare(scena, n, t) {
  if (t < n.prossimaSchivata) return false;
  for (const f of scena.arco.frecce.getChildren()) {
    if (!f.active) continue;
    const dx = n.x - f.x;
    const dy = n.y - f.y;
    const distanza = Math.hypot(dx, dy);
    if (distanza > BOSS_FURBO.distanzaAllarme) continue;
    const v = f.body.velocity;
    const velocita = Math.hypot(v.x, v.y) || 1;
    // Sta venendo verso di lui? (e passerebbe abbastanza vicino)
    const verso = (dx * v.x + dy * v.y) / velocita;
    const laterale = Math.abs(dx * v.y - dy * v.x) / velocita;
    if (verso <= 0 || laterale > n.dati.lato) continue;
    const lato = Math.random() < 0.5 ? 1 : -1;
    n.dirCarica = { x: -v.y / velocita * lato, y: v.x / velocita * lato };
    n.stato = 'schiva';
    n.fineStato = t + BOSS_FURBO.durataSchivataMs;
    n.prossimaSchivata = t + BOSS_FURBO.pausaSchivateMs;
    return true;
  }
  return false;
}

function aggiornaBoss(scena, n, t) {
  const d = n.dati;
  const g = scena.vista(); // dove il boss ti vede

  if (n.stato === 'schiva') {
    n.body.setVelocity(n.dirCarica.x * BOSS_FURBO.velocitaSchivata, n.dirCarica.y * BOSS_FURBO.velocitaSchivata);
    if (t >= n.fineStato) n.stato = 'avvicina';
    return;
  }
  if (n.furbo && n.stato === 'avvicina' && provaASchivare(scena, n, t)) return;

  // Fase extra del boss: dal secondo ciclo, sotto metà vita
  if (n.tipoNemico === 'boss' && !n.faseExtra && scena.round.ciclo() >= 1 && n.vita < n.vitaMax * d.faseExtra.sogliaVita) {
    n.faseExtra = true;
    n.colore = d.faseExtra.colore;
    n.setFillStyle(n.colore);
    scena.interfaccia.mostraBanner(tr('b.custodeInfuria'));
  }
  const pausa = n.faseExtra ? d.faseExtra.pausaTraAttacchiMs : d.pausaTraAttacchiMs;

  if (n.stato === 'avvicina') {
    insegui(scena, n, velocitaNemico(scena, n, d.velocita, t));
    if (t >= n.prossimoAttacco) iniziaAttacco(scena, n, t);
  } else if (n.stato === 'prepara') {
    n.body.setVelocity(0, 0);
    n.setFillStyle(Math.floor(t / 90) % 2 === 0 ? 0xffffff : n.colore);
    if (t >= n.fineStato) {
      n.setFillStyle(n.colore);
      if (n.avviso) { n.avviso.destroy(); n.avviso = null; }
      eseguiAttacco(scena, n, t, pausa);
    }
  } else if (n.stato === 'carica') {
    const att = d.carica;
    n.body.setVelocity(n.dirCarica.x * att.velocita, n.dirCarica.y * att.velocita);
    if (t >= n.fineStato || !n.body.blocked.none) {
      n.stato = 'avvicina';
      n.prossimoAttacco = t + pausa;
    }
  }
}

// Sceglie il prossimo attacco e lo annuncia
function iniziaAttacco(scena, n, t) {
  const g = scena.vista();
  n.attaccoCorrente = n.attacchi[n.indiceAttacco % n.attacchi.length];
  n.indiceAttacco++;
  const att = n.dati[n.attaccoCorrente];
  n.stato = 'prepara';
  n.fineStato = t + att.preparazioneMs;
  n.body.setVelocity(0, 0);

  if (n.attaccoCorrente === 'carica') {
    // La direzione si decide adesso; una striscia rossa mostra dove passerà
    const angolo = Phaser.Math.Angle.Between(n.x, n.y, g.x, g.y);
    n.dirCarica = { x: Math.cos(angolo), y: Math.sin(angolo) };
    const lunghezza = att.velocita * att.durataMs / 1000;
    n.avviso = scena.add.rectangle(n.x, n.y, lunghezza, n.dati.lato * 0.8, 0xff4444, 0.25)
      .setOrigin(0, 0.5).setRotation(angolo).setDepth(-1);
  } else if (n.attaccoCorrente === 'anello' || n.attaccoCorrente === 'evocazione' || n.attaccoCorrente === 'pioggia') {
    // Un cerchio rosso che si allarga attorno al boss
    n.avviso = scena.add.circle(n.x, n.y, n.dati.lato / 2).setStrokeStyle(3, 0xff4444, 0.7).setDepth(-1);
    scena.tweens.add({ targets: n.avviso, scale: 3, duration: att.preparazioneMs });
  }
  // Il ventaglio si annuncia solo col lampeggio: è il più leggero
}

function eseguiAttacco(scena, n, t, pausa) {
  const att = n.dati[n.attaccoCorrente];
  const danno = Math.round((att.danno || 0) * n.moltDanno);
  n.stato = 'avvicina';
  n.prossimoAttacco = t + pausa;

  if (n.attaccoCorrente === 'carica') {
    n.stato = 'carica';
    n.fineStato = t + att.durataMs;
  } else if (n.attaccoCorrente === 'anello') {
    anelloDiProiettili(scena, n, att, danno, 0);
    // Fase extra: un secondo anello sfalsato poco dopo
    if (n.faseExtra) {
      scena.time.delayedCall(n.dati.faseExtra.ritardoSecondoAnelloMs, () => {
        if (n.active) anelloDiProiettili(scena, n, att, danno, Math.PI / att.proiettili);
      });
    }
  } else if (n.attaccoCorrente === 'pioggia') {
    pioggiaDiColpi(scena, att, danno);
  } else if (n.attaccoCorrente === 'ventaglio') {
    const centro = Phaser.Math.Angle.Between(n.x, n.y, scena.vista().x, scena.vista().y);
    const apertura = Phaser.Math.DegToRad(att.apertura);
    for (let i = 0; i < att.proiettili; i++) {
      const a = centro - apertura / 2 + apertura * i / (att.proiettili - 1);
      sparaProiettileDa(scena, n.x, n.y, a, att.velocita, danno);
    }
  } else if (n.attaccoCorrente === 'evocazione') {
    for (let i = 0; i < att.quanti; i++) {
      const a = (Math.PI * 2 * i) / att.quanti;
      const p = scena.arena.limita(n.x + Math.cos(a) * att.distanza, n.y + Math.sin(a) * att.distanza);
      const evocato = generaNemico(scena, 'inseguitore', p.x, p.y);
      evocato.exp = att.exp; // gli evocati danno poca esperienza, sennò conviene farli evocare all'infinito
    }
  }
}

// La prima zona cade esattamente dove sei: restare fermi è la cosa peggiore
function pioggiaDiColpi(scena, att, danno) {
  const g = scena.vista();
  for (let i = 0; i < att.zone; i++) {
    const x = i === 0 ? g.x : g.x + Phaser.Math.Between(-att.spargimento, att.spargimento);
    const y = i === 0 ? g.y : g.y + Phaser.Math.Between(-att.spargimento, att.spargimento);
    const p = scena.arena.limita(x, y);
    creaZona(scena, p.x, p.y, att.raggio, att.ritardoMs, danno);
  }
}

function anelloDiProiettili(scena, n, att, danno, sfasamento) {
  for (let i = 0; i < att.proiettili; i++) {
    const a = sfasamento + (Math.PI * 2 * i) / att.proiettili;
    sparaProiettileDa(scena, n.x, n.y, a, att.velocita, danno);
  }
}
