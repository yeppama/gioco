// ============================================================
// SCIA DEL VENTO - benedizione divina
//
// Durante la schivata il giocatore lascia dietro di sé dei cerchi chiari.
// Per un po' restano a terra: i nemici che ci passano sopra si feriscono.
// Così la schivata diventa anche un attacco: conviene passare TRA i nemici.
// ============================================================

class SciaVento {
  constructor(scena) {
    this.scena = scena;
    this.punti = [];
  }

  aggiorna(t) {
    const scena = this.scena;
    const S = BENEDIZIONI.sciavento;

    // Mentre si schiva: un nuovo punto della scia a ogni fotogramma
    if (scena.stats.sciaSchivata && t < scena.fineSchivata) {
      const g = scena.giocatore;
      const grafica = scena.add.circle(g.x, g.y, S.raggio, 0xbfefff, 0.45).setDepth(-3);
      this.punti.push({ x: g.x, y: g.y, fine: t + S.durataMs, grafica });
    }
    if (this.punti.length === 0) return;

    // Danno ai nemici che toccano la scia (ognuno al massimo ogni intervalloMs)
    const danno = scena.dannoFreccia() * S.moltDanno;
    for (const n of scena.nemici.getChildren().slice()) {
      if (t - n.ultimoColpoScia < S.intervalloMs) continue;
      const tocca = this.punti.some(p => Phaser.Math.Distance.Between(p.x, p.y, n.x, n.y) < S.raggio + n.width / 2);
      if (tocca) {
        n.ultimoColpoScia = t;
        colpisciNemico(scena, n, danno, 'Scia del vento');
      }
    }

    // La scia svanisce piano; i punti finiti si tolgono (nuovo elenco, non durante il giro)
    for (const p of this.punti) {
      const rimasto = (p.fine - t) / S.durataMs;
      if (rimasto <= 0) p.grafica.destroy();
      else p.grafica.setAlpha(0.45 * rimasto);
    }
    this.punti = this.punti.filter(p => p.fine > t);
  }

  svuota() {
    for (const p of this.punti) p.grafica.destroy();
    this.punti = [];
  }
}
