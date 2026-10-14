// ============================================================
// VITA - cure, danni subiti e difese del giocatore
//
// Ogni cura passa da cura(), ogni colpo da subisciDanno().
// Qui ci sono overheal, scudi, Rigenerazione, Ultimo respiro e Seconda vita.
//
// Sono "pezzi" della scena partita, messi in un file a parte per
// non avere un unico file enorme. In fondo a partita.js una riga li
// aggiunge alla scena (Object.assign): dentro, "this" è sempre la scena.
// ============================================================

const METODI_VITA = {
  // Ultimo respiro attivo e vita sotto la soglia
  vitaCritica() {
    return this.stats.ultimoRespiro && this.vita < this.stats.vitaMax * BENEDIZIONI.ultimorespiro.soglia;
  },

  gestisciDifese(t) {
    // Rigenerazione
    if (t >= this.prossimaRigenerazione) {
      this.prossimaRigenerazione = t + INTERVALLO_RIGENERAZIONE_MS;
      // Ultimo respiro: a vita critica l'abilità Rigenerazione si ferma (le altre cure no)
      if (this.stats.rigenerazione > 0 && !this.vitaCritica()) this.cura(this.stats.rigenerazione);
    }
    // Scudo spirituale: torna pronto dopo il suo tempo di ricarica
    if (this.stats.scudoMs > 0 && !this.scudoPronto && t >= this.prossimoScudo) this.scudoPronto = true;
    this.aloneScudo.setVisible(this.stats.scudoMs > 0 && this.scudoPronto);
    this.aloneScudo.setPosition(this.giocatore.x, this.giocatore.y);
  },

  // Ogni cura passa da qui: quello che supera la vita massima va nell'overheal
  cura(quantita) {
    // Ultimo respiro: tutte le cure valgono meno
    quantita *= this.stats.cureMolt;
    const spazio = this.stats.vitaMax - this.vita;
    this.vita = Math.min(this.stats.vitaMax, this.vita + quantita);
    const avanzo = quantita - Math.max(0, spazio);
    if (avanzo <= 0) return;
    this.overheal += avanzo;
    // Una vita intera di cure in più (senza danni nel mezzo) = uno scudo da un colpo
    while (this.overheal >= this.stats.vitaMax && this.scudiOverheal < OVERHEAL_SCUDI_MASSIMI) {
      this.overheal -= this.stats.vitaMax;
      this.scudiOverheal++;
      this.interfaccia.mostraBanner(tr('b.scudoOverheal'));
    }
    if (this.scudiOverheal >= OVERHEAL_SCUDI_MASSIMI) this.overheal = Math.min(this.overheal, this.stats.vitaMax);
  },

  subisciDanno(danno) {
    const t = this.tempo;
    if (this.morto || this.invincibileDebug) return;
    if (t - this.ultimoColpo < INVULNERABILITA_MS) return;
    if (t < this.fineSchivata) return; // durante la schivata si è intoccabili

    // Lo scudo assorbe il colpo intero
    if (this.stats.scudoMs > 0 && this.scudoPronto) {
      this.scudoPronto = false;
      this.prossimoScudo = t + this.stats.scudoMs;
      this.ultimoColpo = t;
      this.cameras.main.flash(120, 127, 214, 255);
      return;
    }

    // Poi gli scudi dell'overheal, uno per colpo
    if (this.scudiOverheal > 0) {
      this.scudiOverheal--;
      this.ultimoColpo = t;
      this.cameras.main.flash(120, 111, 211, 111);
      return;
    }

    this.ultimoColpo = t;
    this.dannoNelRound = true;
    this.overheal = 0; // un danno vero azzera l'accumulo dell'overheal
    this.vita = Math.max(0, this.vita - danno);
    this.cameras.main.shake(100, 0.005); // piccolo scossone dello schermo
    if (this.vita === 0 && this.stats.secondaVita && !this.secondaVitaUsata) {
      // Seconda vita: una volta per partita si torna in piedi
      this.secondaVitaUsata = true;
      this.vita = Math.round(this.stats.vitaMax * BENEDIZIONI.secondavita.vita);
      this.ultimoColpo = t + BENEDIZIONI.secondavita.invulnerabileMs - INVULNERABILITA_MS; // un attimo per scappare
      this.cameras.main.flash(300, 247, 215, 116);
      this.interfaccia.mostraBanner(tr('b.secondaVita'));
      return;
    }
    if (this.vita === 0) this.muori();
  },
};
