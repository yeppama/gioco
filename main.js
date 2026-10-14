// ============================================================
// MAIN - avvia il gioco. I numeri sono in config.js,
// la logica della partita in partita.js
// ============================================================

// Salvato in window.gioco per poterlo ispezionare dalla console del browser
window.gioco = new Phaser.Game({
  type: Phaser.AUTO,         // Phaser sceglie da solo il modo migliore di disegnare
  width: LARGHEZZA,
  height: ALTEZZA,
  backgroundColor: '#1d1d24',
  scale: {
    mode: Phaser.Scale.FIT,               // si adatta allo schermo mantenendo le proporzioni
    autoCenter: Phaser.Scale.CENTER_BOTH, // e resta al centro
  },
  physics: {
    default: 'arcade',       // fisica semplice: velocità e collisioni tra rettangoli
    arcade: { debug: false }, // metti true per vedere i bordi dei corpi fisici
  },
  scene: [ScenaPartita],
});
