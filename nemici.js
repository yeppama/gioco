// ============================================================
// NEMICI - come nascono, come si muovono, come muoiono
// Il tempo "t" che ricevono è quello della partita (si ferma in pausa)
// ============================================================

// Fa comparire un nemico del tipo scelto in un punto lontano dal giocatore
function generaNemico(scena, tipo) {
  const g = scena.giocatore;
  const lontani = PUNTI_COMPARSA.filter(p => Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y) >= DISTANZA_MIN_COMPARSA);
  const punto = Phaser.Utils.Array.GetRandom(lontani.length > 0 ? lontani : PUNTI_COMPARSA);

  const dati = TIPI_NEMICO[tipo];
  const n = scena.add.rectangle(punto.x, punto.y, dati.lato, dati.lato, dati.colore);
  scena.nemici.add(n); // il gruppo fisico gli dà anche un corpo per le collisioni
  n.body.setCollideWorldBounds(true);

  n.tipoNemico = tipo;
  n.dati = dati;
  n.vita = Math.round(dati.vita * scena.round.moltiplicatoreVita()); // più forti nei round avanzati
  n.exp = dati.exp;
  n.dannoContatto = dati.danno;
  n.stato = 'insegue';  // caricatore: insegue, prepara, carica, recupero / tiratore: muove, mira
  n.fineStato = 0;      // quando finisce lo stato attuale
  n.dirCarica = null;   // direzione dello scatto, decisa all'inizio della preparazione
  n.prossimoTiro = scena.tempo + (dati.cadenzaMs || 0);

  // Compare con un piccolo "pop" per non sembrare dal nulla
  n.setScale(0.2);
  scena.tweens.add({ targets: n, scale: 1, duration: 200 });
  return n;
}

// Chiamata ogni fotogramma per ogni nemico vivo
function aggiornaNemico(scena, n, t) {
  if (n.tipoNemico === 'caricatore') aggiornaCaricatore(scena, n, t);
  else if (n.tipoNemico === 'tiratore') aggiornaTiratore(scena, n, t);
  else insegui(scena, n, n.dati.velocita);
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

  if (n.stato === 'insegue') {
    insegui(scena, n, d.velocita);
    if (Phaser.Math.Distance.Between(n.x, n.y, g.x, g.y) < d.distanzaCarica) {
      // La direzione si decide ADESSO: se ti sposti mentre lampeggia, lo scatto ti manca
      const angolo = Phaser.Math.Angle.Between(n.x, n.y, g.x, g.y);
      n.dirCarica = { x: Math.cos(angolo), y: Math.sin(angolo) };
      n.stato = 'prepara';
      n.fineStato = t + d.preparazioneMs;
    }
  } else if (n.stato === 'prepara') {
    n.body.setVelocity(0, 0);
    // Lampeggio bianco: è l'avviso per il giocatore
    n.setFillStyle(Math.floor(t / 80) % 2 === 0 ? 0xffffff : d.colore);
    if (t >= n.fineStato) {
      n.setFillStyle(d.colore);
      n.stato = 'carica';
      n.fineStato = t + d.durataCaricaMs;
    }
  } else if (n.stato === 'carica') {
    n.body.setVelocity(n.dirCarica.x * d.velocitaCarica, n.dirCarica.y * d.velocitaCarica);
    // Lo scatto finisce col tempo o se sbatte contro qualcosa
    const haSbattuto = !n.body.blocked.none || !n.body.touching.none;
    if (t >= n.fineStato || haSbattuto) {
      n.stato = 'recupero';
      n.fineStato = t + d.recuperoMs;
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

  if (n.stato === 'mira') {
    // Fermo e lampeggiante: tra poco spara
    n.body.setVelocity(0, 0);
    n.setFillStyle(Math.floor(t / 70) % 2 === 0 ? 0xffffff : d.colore);
    if (t >= n.fineStato) {
      n.setFillStyle(d.colore);
      sparaProiettile(scena, n);
      n.stato = 'muove';
      n.prossimoTiro = t + d.cadenzaMs;
    }
    return;
  }

  // Cerca di stare alla sua distanza preferita
  if (distanza > d.distanzaIdeale + 40) {
    insegui(scena, n, d.velocita);
  } else if (distanza < d.distanzaIdeale - 40) {
    const angolo = Phaser.Math.Angle.Between(g.x, g.y, n.x, n.y); // dal giocatore verso il nemico = scappa
    n.body.setVelocity(Math.cos(angolo) * d.velocita, Math.sin(angolo) * d.velocita);
  } else {
    n.body.setVelocity(0, 0);
  }

  // Spara solo se non è troppo lontano
  if (t >= n.prossimoTiro && distanza < d.distanzaIdeale + 150) {
    n.stato = 'mira';
    n.fineStato = t + d.preparazioneTiroMs;
  }
}

// Proiettili dei nemici: come le frecce, si riusano invece di distruggerli
function sparaProiettile(scena, n) {
  const d = n.dati;
  let p = scena.proiettiliNemici.getFirstDead(false);
  if (!p) {
    p = scena.add.circle(0, 0, 6, 0xd9a8ff);
    scena.proiettiliNemici.add(p);
  }
  const angolo = Phaser.Math.Angle.Between(n.x, n.y, scena.giocatore.x, scena.giocatore.y);
  p.danno = d.dannoProiettile;
  p.setActive(true).setVisible(true);
  p.body.enable = true;
  p.body.reset(n.x, n.y);
  p.body.setVelocity(Math.cos(angolo) * d.velocitaProiettile, Math.sin(angolo) * d.velocitaProiettile);
}

function disattivaProiettile(p) {
  p.setActive(false).setVisible(false);
  p.body.stop();
  p.body.enable = false;
}

// Una freccia ha colpito il nemico
function colpisciNemico(scena, n, danno) {
  if (!n.active) return;
  n.vita -= danno;

  if (n.vita <= 0) {
    scena.guadagnaExp(n.exp);
    effettoScomparsa(scena, n);
    n.destroy();
    return;
  }

  // Breve lampo bianco per far capire che il colpo è andato a segno
  n.setFillStyle(0xffffff);
  scena.time.delayedCall(60, () => {
    if (n.active) n.setFillStyle(n.dati.colore);
  });
}

// Fine round: i nemici rimasti spariscono senza dare esperienza
function dissolviNemico(scena, n) {
  effettoScomparsa(scena, n);
  n.destroy();
}

// Un cerchio del colore del nemico che si allarga e svanisce
function effettoScomparsa(scena, n) {
  const c = scena.add.circle(n.x, n.y, n.dati.lato / 2, n.dati.colore, 0.8);
  scena.tweens.add({ targets: c, scale: 2.2, alpha: 0, duration: 220, onComplete: () => c.destroy() });
}
