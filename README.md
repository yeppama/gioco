# Gioco

Roguelite dark fantasy per browser, in stile Archero. Progetto hobby in sviluppo.

**Gioca:** https://yeppama.github.io/gioco/

## Comandi

- WASD o frecce: muoversi (l'arco spara da solo alle tue spalle)
- Shift: schivata (costa frecce)
- 1, 2, 3 o clic: scegliere un'abilità
- R: ricominciare dopo la morte
- Telefono: joystick nella metà destra, tocco nella metà sinistra per schivare

Modalità prova: https://yeppama.github.io/gioco/?debug=1 (L livello, I invincibile, N chiudi round, B vai al boss, M vai al mini boss)

## File

- `index.html` — la pagina che carica il gioco
- `config.js` — tutti i numeri del gioco (vita, velocità, danni, round, nemici, ostacoli)
- `abilita.js` — la tabella delle abilità
- `benedizioni.js` — benedizioni maledette e divine
- `statistiche.js` — la formula che calcola le statistiche dalle abilità
- `controlli.js` — tastiera e touch
- `flowfield.js` — come i nemici aggirano gli ostacoli
- `nemici.js` — comportamento dei nemici
- `boss.js` — boss e mini boss
- `lame.js` — lame orbitanti
- `round.js` — round, ondate, furia, difficoltà e round dei boss
- `interfaccia.js` — testi e barre sullo schermo
- `scelta.js` — la schermata "scegli 1 tra 3"
- `partita.js` — mette insieme tutti i pezzi
- `main.js` — l'avvio del gioco
