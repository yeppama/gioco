// ============================================================
// ARENA - il campo di gioco, più grande dello schermo
//
// La telecamera segue il giocatore. Gli ostacoli vengono generati
// a caso (lontani tra loro, così si passa sempre). Dopo ogni boss
// si genera una nuova arena, più grande.
// ============================================================

class Arena {
  constructor(scena) {
    this.scena = scena;
    // Il gruppo resta sempre lo stesso: così le collisioni impostate in partita.js
    // continuano a funzionare anche dopo aver rigenerato l'arena
    this.ostacoli = scena.physics.add.staticGroup();
    this.pavimento = null;
    this.l = 0;
    this.a = 0;
  }

  // Crea (o ricrea) l'arena per il ciclo indicato (0 = il primo)
  genera(ciclo) {
    const scena = this.scena;
    this.l = ARENA.larghezzaIniziale + ARENA.crescitaPerCiclo * ciclo;
    this.a = ARENA.altezzaIniziale + ARENA.crescitaPerCiclo * ciclo;

    // Pavimento con un bordo, così si vede dove finisce l'arena
    if (this.pavimento) this.pavimento.destroy();
    this.pavimento = scena.add.rectangle(this.l / 2, this.a / 2, this.l, this.a, 0x1d1d24)
      .setStrokeStyle(4, 0x3a3a48).setDepth(-10);

    scena.physics.world.setBounds(0, 0, this.l, this.a);
    scena.cameras.main.setBounds(0, 0, this.l, this.a);

    // Ostacoli a caso, con dei tentativi limitati (mai un ciclo infinito).
    // Dai cicli avanzati una parte diventa muri lunghi: la mappa cambia forma.
    this.ostacoli.clear(true, true);
    this.datiOstacoli = [];
    const quanti = Math.round((this.l * this.a) / ARENA.areaPerOstacolo);
    for (let tentativo = 0; tentativo < quanti * 30 && this.datiOstacoli.length < quanti; tentativo++) {
      const muro = ciclo >= TERRENI.muriDalCiclo && Math.random() < TERRENI.quotaMuri;
      const lungo = Phaser.Math.Between(ARENA.muroLunghezzaMin, ARENA.muroLunghezzaMax);
      const orizzontale = Math.random() < 0.5;
      const o = {
        l: muro ? (orizzontale ? lungo : ARENA.muroSpessore) : Phaser.Math.Between(ARENA.latoOstacoloMin, ARENA.latoOstacoloMax),
        a: muro ? (orizzontale ? ARENA.muroSpessore : lungo) : Phaser.Math.Between(ARENA.latoOstacoloMin, ARENA.latoOstacoloMax),
        x: Phaser.Math.Between(ARENA.margineBordo, this.l - ARENA.margineBordo),
        y: Phaser.Math.Between(ARENA.margineBordo, this.a - ARENA.margineBordo),
      };
      if (Phaser.Math.Distance.Between(o.x, o.y, this.l / 2, this.a / 2) < ARENA.zonaLiberaCentro) continue;
      const troppoVicino = this.datiOstacoli.some(altro =>
        Math.abs(altro.x - o.x) < (altro.l + o.l) / 2 + ARENA.distanzaTraOstacoli &&
        Math.abs(altro.y - o.y) < (altro.a + o.a) / 2 + ARENA.distanzaTraOstacoli);
      if (!troppoVicino) this.datiOstacoli.push(o);
    }
    for (const o of this.datiOstacoli) {
      const blocco = scena.add.rectangle(o.x, o.y, o.l, o.a, 0x55555f);
      scena.physics.add.existing(blocco, true); // true = fermo, non viene spinto
      this.ostacoli.add(blocco);
    }

    // Mappa dei percorsi per i nemici, grande quanto la nuova arena
    this.flowField = new FlowField(this.l, this.a, CELLA_FLOW, this.datiOstacoli, MARGINE_FLOW);

    // Terreni di disturbo (dal secondo ciclo): lava che brucia e rovi che rallentano
    for (const tr of this.terreni || []) tr.grafica.destroy();
    this.terreni = [];
    const chiazze = TERRENI.perCiclo * ciclo;
    for (let tentativo = 0; tentativo < chiazze * 20 && this.terreni.length < chiazze; tentativo++) {
      const r = Phaser.Math.Between(TERRENI.raggioMin, TERRENI.raggioMax);
      const x = Phaser.Math.Between(r + 20, this.l - r - 20);
      const y = Phaser.Math.Between(r + 20, this.a - r - 20);
      if (Phaser.Math.Distance.Between(x, y, this.l / 2, this.a / 2) < ARENA.zonaLiberaCentro + r) continue;
      const tipo = Math.random() < 0.5 ? 'lava' : 'rovi';
      const grafica = scena.add.circle(x, y, r, tipo === 'lava' ? 0xd35400 : 0x2e7d32, 0.35)
        .setStrokeStyle(2, tipo === 'lava' ? 0xff7a1a : 0x66bb6a, 0.6).setDepth(-9);
      this.terreni.push({ x, y, r, tipo, grafica });
    }
  }

  // Su che terreno si trova un punto: 'lava', 'rovi' oppure null
  terrenoIn(x, y) {
    for (const tr of this.terreni) {
      if (Phaser.Math.Distance.Between(x, y, tr.x, tr.y) < tr.r) return tr.tipo;
    }
    return null;
  }

  // true se nel punto non c'è un ostacolo
  libero(x, y) {
    const ff = this.flowField;
    return !ff.bloccata[ff.indice(ff.colonnaDi(x), ff.rigaDi(y))];
  }

  // Riporta un punto dentro l'arena (con un margine dal bordo)
  limita(x, y, margine = 30) {
    return {
      x: Phaser.Math.Clamp(x, margine, this.l - margine),
      y: Phaser.Math.Clamp(y, margine, this.a - margine),
    };
  }

  // Un punto libero a una certa distanza da (cx, cy), in una direzione a caso
  puntoComparsa(cx, cy, distanzaMin, distanzaMax) {
    for (let tentativo = 0; tentativo < 40; tentativo++) {
      const angolo = Math.random() * Math.PI * 2;
      const distanza = Phaser.Math.Between(distanzaMin, distanzaMax);
      const x = cx + Math.cos(angolo) * distanza;
      const y = cy + Math.sin(angolo) * distanza;
      if (x < 40 || y < 40 || x > this.l - 40 || y > this.a - 40) continue;
      if (this.libero(x, y)) return { x, y };
    }
    // Se proprio non trova posto: l'angolo dell'arena più lontano dal punto
    const angoli = [{ x: 50, y: 50 }, { x: this.l - 50, y: 50 }, { x: 50, y: this.a - 50 }, { x: this.l - 50, y: this.a - 50 }];
    angoli.sort((p, q) => Phaser.Math.Distance.Between(q.x, q.y, cx, cy) - Phaser.Math.Distance.Between(p.x, p.y, cx, cy));
    return angoli[0];
  }
}
