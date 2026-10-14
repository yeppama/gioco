// ============================================================
// NEMICI - come nascono, come si muovono, come muoiono
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
  n.vita = dati.vita;
  n.stato = 'insegue';  // per il caricatore: insegue, prepara, carica, recupero
  n.fineStato = 0;      // quando finisce lo stato attuale
  n.dirCarica = null;   // direzione dello scatto, decisa all'inizio della preparazione
  return n;
}

// Chiamata ogni fotogramma per ogni nemico vivo
function aggiornaNemico(scena, n, time) {
  if (n.tipoNemico === 'caricatore') {
    aggiornaCaricatore(scena, n, time);
  } else {
    insegui(scena, n, n.dati.velocita);
  }
}

// Segue il flow field; quando è vicino punta dritto al giocatore
function insegui(scena, n, velocita) {
  const passo = scena.flowField.prossimoPasso(n.x, n.y);
  const bersaglio = passo || scena.giocatore;
  scena.physics.moveTo(n, bersaglio.x, bersaglio.y, velocita);
}

function aggiornaCaricatore(scena, n, time) {
  const d = n.dati;
  const g = scena.giocatore;

  if (n.stato === 'insegue') {
    insegui(scena, n, d.velocita);
    if (Phaser.Math.Distance.Between(n.x, n.y, g.x, g.y) < d.distanzaCarica) {
      // La direzione si decide ADESSO: se ti sposti mentre lampeggia, lo scatto ti manca
      const angolo = Phaser.Math.Angle.Between(n.x, n.y, g.x, g.y);
      n.dirCarica = { x: Math.cos(angolo), y: Math.sin(angolo) };
      n.stato = 'prepara';
      n.fineStato = time + d.preparazioneMs;
    }
  } else if (n.stato === 'prepara') {
    n.body.setVelocity(0, 0);
    // Lampeggio bianco: è l'avviso per il giocatore
    n.setFillStyle(Math.floor(time / 80) % 2 === 0 ? 0xffffff : d.colore);
    if (time >= n.fineStato) {
      n.setFillStyle(d.colore);
      n.stato = 'carica';
      n.fineStato = time + d.durataCaricaMs;
    }
  } else if (n.stato === 'carica') {
    n.body.setVelocity(n.dirCarica.x * d.velocitaCarica, n.dirCarica.y * d.velocitaCarica);
    // Lo scatto finisce col tempo o se sbatte contro qualcosa
    const haSbattuto = !n.body.blocked.none || !n.body.touching.none;
    if (time >= n.fineStato || haSbattuto) {
      n.stato = 'recupero';
      n.fineStato = time + d.recuperoMs;
      n.setAlpha(0.6); // un po' trasparente: è stordito, è il momento di colpirlo
    }
  } else if (n.stato === 'recupero') {
    n.body.setVelocity(0, 0);
    if (time >= n.fineStato) {
      n.setAlpha(1);
      n.stato = 'insegue';
    }
  }
}

// Una freccia ha colpito il nemico
function colpisciNemico(scena, n, danno) {
  n.vita -= danno;

  if (n.vita <= 0) {
    const tipo = n.tipoNemico;
    n.destroy();
    // Dopo un po' ne arriva un altro dello stesso tipo
    scena.time.delayedCall(RICOMPARSA_MS, () => {
      if (!scena.morto) generaNemico(scena, tipo);
    });
    return;
  }

  // Breve lampo bianco per far capire che il colpo è andato a segno
  n.setFillStyle(0xffffff);
  scena.time.delayedCall(60, () => {
    if (n.active) n.setFillStyle(n.dati.colore);
  });
}
