# Gioco

Roguelite dark fantasy per browser, in stile Archero. Progetto hobby in sviluppo.

**Gioca:** https://yeppama.github.io/gioco/

## Comandi

- WASD o frecce: muoversi (l'arco spara da solo alle tue spalle)
- Shift: schivata (costa frecce)
- 1, 2, 3 o clic: scegliere un'abilità
- R: ricominciare dopo la morte
- Telefono: joystick nella metà destra, tocco nella metà sinistra per schivare

Modalità prova: https://yeppama.github.io/gioco/?debug=1 (L livello, I invincibile, N round successivo)

## File

- `index.html` — la pagina che carica il gioco
- `config.js` — tutti i numeri del gioco (vita, velocità, danni, round, nemici, ostacoli)
- `abilita.js` — la tabella delle abilità
- `statistiche.js` — la formula che calcola le statistiche dalle abilità
- `controlli.js` — tastiera e touch
- `flowfield.js` — come i nemici aggirano gli ostacoli
- `nemici.js` — comportamento dei nemici
- `round.js` — round a tempo e ondate
- `interfaccia.js` — testi e barre sullo schermo
- `scelta.js` — la schermata "scegli 1 tra 3"
- `partita.js` — mette insieme tutti i pezzi
- `main.js` — l'avvio del gioco
