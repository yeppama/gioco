// ============================================================
// NEMICI - come nascono, come si muovono, come muoiono
// Il tempo "t" che ricevono è quello della partita (si ferma in pausa).
// Boss e mini boss sono in boss.js, ma usano le stesse funzioni.
// ============================================================

// Fa comparire un nemico del tipo scelto nel punto (x, y);
// senza punto, ne sceglie uno fuori dallo schermo. elite = versione potenziata
function generaNemico(scena, tipo, x, y, elite = false) {
  if (x === undefined) {
    const g = scena.giocatore;
    const p = scena.arena.puntoComparsa(g.x, g.y, ONDATE.distanzaComparsaMin, ONDATE.distanzaComparsaMax);
    x = p.x;
    y = p.y;
  }

  const dati = TIPI_NEMICO[tipo];
  const molt = scena.round.moltiplicatore(); // più forti a ogni round
  const lato = dati.lato * (elite ? ELITE.lato : 1);
  const n = scena.add.rectangle(x, y, lato, lato, dati.colore);
  scena.nemici.add(n); // il gruppo fisico gli dà anche un corpo per le collisioni
  n.body.setCollideWorldBounds(true);

  preparaNemico(scena, n, tipo, dati, molt);
  if (elite) {
    n.elite = true;
    n.vitaMax = Math.round(n.vitaMax * ELITE.vita);
    n.vita = n.vitaMax;
    n.moltVelocita *= ELITE.velocita;
    n.moltDanno *= ELITE.danno;
    n.dannoContatto = Math.round(n.dannoContatto * ELITE.danno);
    n.exp *= ELITE.exp;
  }
  n.stato = 'insegue';  // caricatore: insegue, prepara, carica, recupero / tiratore: muove, mira
  n.prossimoTiro = scena.tempo + (dati.cadenzaMs || 0);

  // Compare con un piccolo "pop" per non sembrare dal nulla
  n.setScale(0.2);
  scena.tweens.add({ targets: n, scale: 1, duration: 200 });
  return n;
}

// Valori comuni a tutti i nemici, boss compresi
function preparaNemico(scena, n, tipo, dati, molt) {
  n.tipoNemico = tipo;
  n.dati = dati;
  n.colore = dati.colore;
  n.vitaMax = Math.round(dati.vita * molt);
  n.vita = n.vitaMax;
  n.exp = dati.exp;
  // Aggressività: dopo ogni boss i nemici sono più veloci e attaccano più spesso
  n.aggressivita = 1 + AGGRESSIVITA_PER_CICLO * scena.round.ciclo();
  // La velocità cresce la metà della vita (sennò diventano imprendibili), più l'aggressività del ciclo
  n.moltVelocita = (1 + (molt - 1) * 0.5) * n.aggressivita;
  n.moltDanno = molt;
  n.dannoContatto = Math.round(dati.danno * molt);
  n.fineStato = 0;
  n.dirCarica = null;
  // Effetti delle frecce elementali
  n.bruciaFino = 0;
  n.prossimaBruciatura = 0;
  n.dannoFuoco = 0;
  n.rallentatoFino = 0;
  n.rallentamento = 0;
  n.ultimoColpoLama = -Infinity;
}

// Velocità reale di un nemico in questo momento: difficoltà, furia, gelo...
function velocitaNemico(scena, n, base, t) {
  let v = base * n.moltVelocita * scena.stats.velocitaNemiciMolt;
  if (!n.eBoss) v *= scena.round.furia(t);
  if (t < n.rallentatoFino) v *= 1 - n.rallentamento;
  return v;
}

// Chiamata ogni fotogramma per ogni nemico vivo
function aggiornaNemico(scena, n, t) {
  // Fuoco: danno a intervalli finché brucia
  if (t < n.bruciaFino && t >= n.prossimaBruciatura) {
    n.prossimaBruciatura = t + INTERVALLO_FUOCO_MS;
    colpisciNemico(scena, n, n.dannoFuoco, 'Fuoco');
    if (!n.active) return; // è morto bruciato
  }
  // Bordo colorato: arancione se brucia, azzurro se rallentato
  if (t < n.bruciaFino) n.setStrokeStyle(3, 0xff7a1a);
  else if (t < n.rallentatoFino) n.setStrokeStyle(3, 0x7fd6ff);
  else if (n.elite) n.setStrokeStyle(3, ELITE.colore);
  else n.isStroked = false;

  if (n.eBoss) aggiornaBoss(scena, n, t);
  else if (n.tipoNemico === 'caricatore') aggiornaCaricatore(scena, n, t);
  else if (n.tipoNemico === 'tiratore') aggiornaTiratore(scena, n, t);
  else if (n.tipoNemico === 'mortaio') aggiornaMortaio(scena, n, t);
  else insegui(scena, n, velocitaNemico(scena, n, n.dati.velocita, t));
}

// Dove mira un nemico: il giocatore, oppure (élite) dove il giocatore sta andando
function bersaglioDi(scena, n) {
  const g = scena.giocatore;
  if (!n.elite) return { x: g.x, y: g.y };
  const v = g.body.velocity;
  return scena.arena.limita(g.x + v.x * ELITE.previsioneS, g.y + v.y * ELITE.previsioneS);
}

// Resistenza a fuoco e gelo: 0 = nessuna, 0.6 = effetti ridotti del 60%
function resistenzaDi(scena, n) {
  const base = RESISTENZA.perBossSconfitto * scena.round.ciclo() + (n.elite ? RESISTENZA.elite : 0);
  return Math.min(RESISTENZA.massima, base);
}

// Segue il flow field; quando è vicino punta dritto al giocatore (o dove sta andando)
function insegui(scena, n, velocita) {
  const passo = scena.flowField.prossimoPasso(n.x, n.y);
  const bersaglio = passo || bersaglioDi(scena, n);
  scena.physics.moveTo(n, bersaglio.x, bersaglio.y, velocita);
}

function aggiornaCaricatore(scena, n, t) {
  const d = n.dati;
  const g = scena.giocatore;
  const furia = scena.round.furia(t);

  if (n.stato === 'insegue') {
    insegui(scena, n, velocitaNemico(scena, n, d.velocita, t));
    if (Phaser.Math.Distance.Between(n.x, n.y, g.x, g.y) < d.distanzaCarica) {
      // La direzione si decide ADESSO: se ti sposti mentre lampeggia, lo scatto ti manca
      // (l'élite però mira dove stai andando)
      const mira = bersaglioDi(scena, n);
      const angolo = Phaser.Math.Angle.Between(n.x, n.y, mira.x, mira.y);
      n.dirCarica = { x: Math.cos(angolo), y: Math.sin(angolo) };
      n.stato = 'prepara';
      n.fineStato = t + d.preparazioneMs / (furia * n.aggressivita); // infuriato (o nei cicli avanzati) si prepara più in fretta
    }
  } else if (n.stato === 'prepara') {
    n.body.setVelocity(0, 0);
    // Lampeggio bianco: è l'avviso per il giocatore
    n.setFillStyle(Math.floor(t / 80) % 2 === 0 ? 0xffffff : n.colore);
    if (t >= n.fineStato) {
      n.setFillStyle(n.colore);
      n.stato = 'carica';
      n.fineStato = t + d.durataCaricaMs;
    }
  } else if (n.stato === 'carica') {
    const v = velocitaNemico(scena, n, d.velocitaCarica, t);
    n.body.setVelocity(n.dirCarica.x * v, n.dirCarica.y * v);
    // Lo scatto finisce col tempo o se sbatte contro qualcosa
    const haSbattuto = !n.body.blocked.none || !n.body.touching.none;
    if (t >= n.fineStato || haSbattuto) {
      n.stato = 'recupero';
      n.fineStato = t + d.recuperoMs / furia;
      n.setAlpha(0.6); // un po' trasparente: è stordito, è il momento di colpirlo
    }
  } else if (n.stato === 'recupero') {
    n.body.setVelocity(0, 0);
    if (t >= n.fineStato) {
      n.setAlpha(1);
      n.stato = 'insegue';
    }
  }
}

function aggiornaTiratore(scena, n, t) {
  const d = n.dati;
  const g = scena.giocatore;
  const distanza = Phaser.Math.Distance.Between(n.x, n.y, g.x, g.y);
  const furia = scena.round.furia(t);

  if (n.stato === 'mira') {
    // Fermo e lampeggiante: tra poco spara
    n.body.setVelocity(0, 0);
    n.setFillStyle(Math.floor(t / 70) % 2 === 0 ? 0xffffff : n.colore);
    if (t >= n.fineStato) {
      n.setFillStyle(n.colore);
      const mira = bersaglioDi(scena, n);
      const angolo = Phaser.Math.Angle.Between(n.x, n.y, mira.x, mira.y);
      sparaProiettileDa(scena, n.x, n.y, angolo, d.velocitaProiettile, Math.round(d.dannoProiettile * n.moltDanno));
      n.stato = 'muove';
      n.prossimoTiro = t + d.cadenzaMs / (furia * n.aggressivita);
    }
    return;
  }

  // Cerca di stare alla sua distanza preferita; infuriato (fine round) ti viene addosso,
  // così il round non si allunga all'infinito
  const ideale = furia > 1 ? 0 : d.distanzaIdeale;
  const v = velocitaNemico(scena, n, d.velocita, t);
  if (distanza > ideale + 40) {
    insegui(scena, n, v);
  } else if (distanza < ideale - 40) {
    const angolo = Phaser.Math.Angle.Between(g.x, g.y, n.x, n.y); // dal giocatore verso il nemico = scappa
    n.body.setVelocity(Math.cos(angolo) * v, Math.sin(angolo) * v);
  } else {
    n.body.setVelocity(0, 0);
  }

  // Spara solo se non è troppo lontano
  if (t >= n.prossimoTiro && distanza < ideale + 150) {
    n.stato = 'mira';
    n.fineStato = t + d.preparazioneTiroMs;
  }
}

// Mortaio: sta lontano e ogni tanto segna un cerchio dove sei tu.
// Dopo un attimo il cerchio esplode: chi è rimasto fermo viene colpito.
function aggiornaMortaio(scena, n, t) {
  const d = n.dati;
  const g = scena.giocatore;
  const distanza = Phaser.Math.Distance.Between(n.x, n.y, g.x, g.y);
  const furia = scena.round.furia(t);
  const ideale = furia > 1 ? 0 : d.distanzaIdeale; // infuriato ti viene addosso
  const v = velocitaNemico(scena, n, d.velocita, t);

  if (distanza > ideale + 60) {
    insegui(scena, n, v);
  } else if (distanza < ideale - 60) {
    const angolo = Phaser.Math.Angle.Between(g.x, g.y, n.x, n.y);
    n.body.setVelocity(Math.cos(angolo) * v, Math.sin(angolo) * v);
  } else {
    n.body.setVelocity(0, 0);
  }

  if (t >= n.prossimoTiro && distanza < ideale + 250) {
    const mira = bersaglioDi(scena, n);
    creaZona(scena, mira.x, mira.y, d.raggio, d.ritardoMs, Math.round(d.dannoEsplosione * n.moltDanno));
    n.prossimoTiro = t + d.cadenzaMs / (furia * n.aggressivita);
    // Piccolo rinculo visivo
    n.setFillStyle(0xffffff);
    scena.time.delayedCall(80, () => { if (n.active) n.setFillStyle(n.colore); });
  }
}

// ---------------------------------------------------------- ZONE DI PERICOLO
// Un cerchio rosso a terra che si riempie; quando è pieno esplode.

function creaZona(scena, x, y, raggio, ritardoMs, danno) {
  const bordo = scena.add.circle(x, y, raggio).setStrokeStyle(2, 0xff4444, 0.8).setDepth(-5);
  const riempimento = scena.add.circle(x, y, raggio, 0xff4444, 0.25).setDepth(-5).setScale(0);
  scena.zone.push({ x, y, raggio, danno, inizio: scena.tempo, esplodeA: scena.tempo + ritardoMs, bordo, riempimento });
}

function aggiornaZone(scena, t) {
  const g = scena.giocatore;
  for (const z of scena.zone) {
    // Il cerchio interno cresce: quando tocca il bordo, esplode
    z.riempimento.setScale(Phaser.Math.Clamp((t - z.inizio) / (z.esplodeA - z.inizio), 0, 1));
    if (t < z.esplodeA) continue;
    if (Phaser.Math.Distance.Between(z.x, z.y, g.x, g.y) <= z.raggio + LATO_GIOCATORE / 2) scena.subisciDanno(z.danno);
    const lampo = scena.add.circle(z.x, z.y, z.raggio, 0xffa040, 0.6).setDepth(-4);
    scena.time.delayedCall(150, () => lampo.destroy());
    z.esplosa = true;
  }
  // Toglie quelle esplose (un nuovo elenco, invece di cancellare mentre si scorre)
  for (const z of scena.zone) if (z.esplosa) { z.bordo.destroy(); z.riempimento.destroy(); }
  scena.zone = scena.zone.filter(z => !z.esplosa);
}

function svuotaZone(scena) {
  for (const z of scena.zone) { z.bordo.destroy(); z.riempimento.destroy(); }
  scena.zone = [];
}

// Proiettili dei nemici: come le frecce, si riusano invece di distruggerli
function sparaProiettileDa(scena, x, y, angolo, velocita, danno) {
  let p = scena.proiettiliNemici.getFirstDead(false);
  if (!p) {
    p = scena.add.circle(0, 0, 6, 0xd9a8ff);
    scena.proiettiliNemici.add(p);
  }
  p.danno = danno;
  p.setActive(true).setVisible(true);
  p.body.enable = true;
  p.body.reset(x, y);
  p.body.setVelocity(Math.cos(angolo) * velocita, Math.sin(angolo) * velocita);
}

function disattivaProiettile(p) {
  p.setActive(false).setVisible(false);
  p.body.stop();
  p.body.enable = false;
}

// Un colpo (freccia, fuoco, lama) ha colpito il nemico.
// "fonte" serve al riepilogo di fine run.
function colpisciNemico(scena, n, danno, fonte = 'Frecce') {
  if (!n.active) return;
  scena.registraDanno(fonte, Math.min(danno, n.vita));
  n.vita -= danno;

  if (n.vita <= 0) {
    scena.uccisioni++;
    scena.guadagnaExp(n.exp);
    if (n.tipoNemico === 'miniboss') scena.bottinoMiniboss();
    if (n.avviso) n.avviso.destroy();
    if (n === scena.bossAttivo) scena.bossAttivo = null;
    effettoScomparsa(scena, n);
    n.destroy();
    return;
  }

  // Breve lampo bianco per far capire che il colpo è andato a segno
  n.setFillStyle(0xffffff);
  scena.time.delayedCall(60, () => {
    if (n.active) n.setFillStyle(n.colore);
  });
}

// Chiusura forzata del round: i nemici spariscono senza dare esperienza
function dissolviNemico(scena, n) {
  if (n.avviso) n.avviso.destroy();
  if (n === scena.bossAttivo) scena.bossAttivo = null;
  effettoScomparsa(scena, n);
  n.destroy();
}

// Un cerchio del colore del nemico che si allarga e svanisce
function effettoScomparsa(scena, n) {
  const c = scena.add.circle(n.x, n.y, n.dati.lato / 2, n.colore, 0.8);
  scena.tweens.add({ targets: c, scale: 2.2, alpha: 0, duration: 220, onComplete: () => c.destroy() });
}
