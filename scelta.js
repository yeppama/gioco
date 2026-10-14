// ============================================================
// SCENA SCELTA - la schermata "scegli 1 tra 3"
//
// Si apre sopra la partita, che nel frattempo è in pausa.
// La usano l'abilità iniziale e ogni level up (e, più avanti,
// le benedizioni). Riceve:
//  - titolo: la scritta in alto
//  - opzioni: [{ id, nome, livello, descrizione }]
//  - alScegliere: funzione chiamata con l'id scelto
// Si sceglie con il mouse, con il dito o con i tasti 1, 2, 3.
// ============================================================

class ScenaScelta extends Phaser.Scene {
  constructor() {
    super('scelta');
  }

  init(dati) {
    this.dati = dati;
    this.scelto = false;
  }

  create() {
    const { titolo, opzioni } = this.dati;

    // Sfondo scuro semitrasparente: la partita si intravede sotto
    this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LARGHEZZA, ALTEZZA, 0x000000, 0.7);
    this.add.text(LARGHEZZA / 2, 110, titolo, { fontSize: '32px', color: '#f2e6b8', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(LARGHEZZA / 2, 150, 'Scegli un\'abilità', { fontSize: '18px', color: '#8a8a99' }).setOrigin(0.5);

    // Tre carte una accanto all'altra, centrate
    const largh = 220;
    const alt = 250;
    const spazio = 26;
    const totale = opzioni.length * largh + (opzioni.length - 1) * spazio;
    const primoX = (LARGHEZZA - totale) / 2 + largh / 2;
    const y = 340;

    opzioni.forEach((o, i) => {
      const x = primoX + i * (largh + spazio);
      const carta = this.add.rectangle(x, y, largh, alt, 0x23232d)
        .setStrokeStyle(2, 0x5a5a6a)
        .setInteractive({ useHandCursor: true });

      this.add.text(x - largh / 2 + 14, y - alt / 2 + 10, String(i + 1), { fontSize: '16px', color: '#5a5a6a' });
      this.add.text(x, y - 80, o.nome, {
        fontSize: '21px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: largh - 24 },
      }).setOrigin(0.5);
      this.add.text(x, y - 42, o.livello > 1 ? 'Livello ' + o.livello : 'Nuova', {
        fontSize: '15px', color: o.livello > 1 ? '#6fd36f' : '#f2e6b8',
      }).setOrigin(0.5);
      this.add.text(x, y - 10, o.descrizione, {
        fontSize: '16px', color: '#cfcfd8', align: 'center', wordWrap: { width: largh - 30 },
      }).setOrigin(0.5, 0);

      // Bordo chiaro quando ci passi sopra
      carta.on('pointerover', () => carta.setStrokeStyle(3, 0xf2e6b8));
      carta.on('pointerout', () => carta.setStrokeStyle(2, 0x5a5a6a));
      carta.on('pointerdown', () => this.scegli(o.id));
    });

    // Tasti 1, 2, 3
    this.input.keyboard.on('keydown', (evento) => {
      const numero = parseInt(evento.key, 10);
      if (numero >= 1 && numero <= opzioni.length) this.scegli(opzioni[numero - 1].id);
    });
  }

  scegli(id) {
    if (this.scelto) return; // evita doppie scelte con un doppio clic
    this.scelto = true;
    this.dati.alScegliere(id);
    this.scene.stop();
  }
}
