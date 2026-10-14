// ============================================================
// NEMICI - come nascono, come si muovono, come muoiono
// Il tempo "t" che ricevono è quello della partita (si ferma in pausa).
// Boss e mini boss sono in boss.js, ma usano le stesse funzioni.
// ============================================================

// Fa comparire un nemico del tipo scelto in un punto lontano dal giocatore
function generaNemico(scena, tipo) {
  const g = scena.giocatore;
  const lontani = PUNTI_COMPARSA.filter(p => Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y) >= DISTANZA_MIN_COMPARSA);
  const punto = Phaser.Utils.Array.GetRandom(lontani.length > 0 ? lontani : PUNTI_COMPARSA);

  const dati = TIPI_NEMICO[tipo];
  const molt = scena.round.moltiplicatore(); // più forti a ogni round
  const n = scena.add.rectangle(punto.x, punto.y, dati.lato, dati.lato, dati.colore);
  scena.nemici.add(n); // il gruppo fisico gli dà anche un corpo per le collisioni
  n.body.setCollideWorldBounds(true);

  preparaNemico(scena, n, tipo, dati, molt);
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
  n.moltVelocita = 1 + (molt - 1) * 0.5;   // la velocità cresce la metà della vita (sennò diventano imprendibili)
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
    colpisciNemico(scena, n, n.dannoFuoco);
    if (!n.active) return; // è morto bruciato
  }
  // Bordo colorato: arancione se brucia, azzurro se rallentato
  if (t < n.bruciaFino) n.setStrokeStyle(3, 0xff7a1a);
  else if (t < n.rallentatoFino) n.setStrokeStyle(3, 0x7fd6ff);
  else n.isStroked = false;

  if (n.eBoss) aggiornaBoss(scena, n, t);
  else if (n.tipoNemico === 'caricatore') aggiornaCaricatore(scena, n, t);
  else if (n.tipoNemico === 'tiratore') aggiornaTiratore(scena, n, t);
  else insegui(scena, n, velocitaNemico(scena, n, n.dati.velocita, t));
}

// Segue il flow field; quando è vicino punta dritto al giocatore
function insegui(scena, n, velocita) {
  const passo = scena.flowField.prossimoPasso(n.x, n.y);
  const bersaglio = passo || scena.giocatore;
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
      const angolo = Phaser.Math.Angle.Between(n.x, n.y, g.x, g.y);
      n.dirCarica = { x: Math.cos(angolo), y: Math.sin(angolo) };
      n.stato = 'prepara';
      n.fineStato = t + d.preparazioneMs / furia; // infuriato si prepara più in fretta
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
      const angolo = Phaser.Math.Angle.Between(n.x, n.y, g.x, g.y);
      sparaProiettileDa(scena, n.x, n.y, angolo, d.velocitaProiettile, Math.round(d.dannoProiettile * n.moltDanno));
      n.stato = 'muove';
      n.prossimoTiro = t + d.cadenzaMs / furia;
    }
    return;
  }

  // Cerca di stare alla sua distanza preferita; infuriato smette di scappare e si avvicina
  const ideale = furia > 1 ? d.distanzaIdeale * 0.5 : d.distanzaIdeale;
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

// Un colpo (freccia, fuoco, lama) ha colpito il nemico
function colpisciNemico(scena, n, danno) {
  if (!n.active) return;
  n.vita -= danno;

  if (n.vita <= 0) {
    scena.guadagnaExp(n.exp);
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
