// ============================================================
// SCENA SCELTA - la schermata "scegli 1 tra 3"
//
// Si apre sopra la partita, che nel frattempo è in pausa.
// La usano l'abilità iniziale, ogni level up e le benedizioni
// (maledette e divine). Riceve:
//  - titolo: la scritta in alto
//  - tipo: 'abilita', 'maledetta' o 'divina' (cambia i colori)
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
    // Colori e sottotitolo a seconda del tipo di scelta
    const stili = {
      abilita: { titolo: '#f2e6b8', bordo: 0x5a5a6a, sotto: 'Scegli un\'abilità' },
      maledetta: { titolo: '#ff6b6b', bordo: 0xc0392b, sotto: 'Potere con un prezzo. Oppure riposa.' },
      divina: { titolo: '#f7d774', bordo: 0xf1c40f, sotto: 'Un dono senza prezzo' },
    };
    const stile = stili[this.dati.tipo] || stili.abilita;

    // Sfondo scuro semitrasparente: la partita si intravede sotto
    this.add.rectangle(LARGHEZZA / 2, ALTEZZA / 2, LARGHEZZA, ALTEZZA, 0x000000, 0.7);
    this.add.text(LARGHEZZA / 2, 110, titolo, { fontSize: '32px', color: stile.titolo, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(LARGHEZZA / 2, 150, stile.sotto, { fontSize: '18px', color: '#8a8a99' }).setOrigin(0.5);

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
        .setStrokeStyle(2, stile.bordo)
        .setInteractive({ useHandCursor: true });

      this.add.text(x - largh / 2 + 14, y - alt / 2 + 10, String(i + 1), { fontSize: '16px', color: '#5a5a6a' });
      this.add.text(x, y - 80, o.nome, {
        fontSize: '21px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: largh - 24 },
      }).setOrigin(0.5);
      const etichetta = (o.livello > 1 ? 'Livello ' + o.livello : 'Nuova') + (o.rarita === 'rara' ? '  ·  Rara' : '');
      this.add.text(x, y - 42, etichetta, {
        fontSize: '15px', color: o.rarita === 'rara' ? '#5dade2' : (o.livello > 1 ? '#6fd36f' : '#f2e6b8'),
      }).setOrigin(0.5);
      this.add.text(x, y - 10, o.descrizione, {
        fontSize: '16px', color: '#cfcfd8', align: 'center', wordWrap: { width: largh - 30 },
      }).setOrigin(0.5, 0);

      // Bordo chiaro quando ci passi sopra
      carta.on('pointerover', () => carta.setStrokeStyle(3, 0xf2e6b8));
      carta.on('pointerout', () => carta.setStrokeStyle(2, stile.bordo));
      carta.on('pointerdown', () => this.scegli(o.id));
    });

    // Al posto di una maledetta si può riposare: cura una parte della vita (tasto 4)
    if (this.dati.tipo === 'maledetta') {
      this.add.text(LARGHEZZA / 2, 500, '4 · Riposo: recuperi il ' + Math.round(RIPOSO_CURA * 100) + '% della vita', {
        fontSize: '20px', color: '#6fd36f',
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scegli('riposo'));
    }

    // Tasti 1, 2, 3 (e 4 per riposare)
    this.input.keyboard.on('keydown', (evento) => {
      const numero = parseInt(evento.key, 10);
      if (numero >= 1 && numero <= opzioni.length) this.scegli(opzioni[numero - 1].id);
      if (numero === 4 && this.dati.tipo === 'maledetta') this.scegli('riposo');
    });
  }

  scegli(id) {
    if (this.scelto) return; // evita doppie scelte con un doppio clic
    this.scelto = true;
    this.dati.alScegliere(id);
    this.scene.stop();
  }
}
