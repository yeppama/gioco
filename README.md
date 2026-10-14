# Gioco

Roguelite dark fantasy per browser, in stile Archero. Progetto hobby in sviluppo.

**Gioca:** https://yeppama.github.io/gioco/

## Comandi

- WASD o frecce: muoversi (l'arco spara da solo alle tue spalle)
- Shift: schivata (costa frecce)
- Spazio (tieni premuto): colpo caricato
- Spazio due volte di fila: colpo onda (serve una faretra da 50 frecce)
- Ctrl: ricarica manuale
- Esc o P: pausa, con abilità, benedizioni e statistiche
- 1, 2, 3 o clic: scegliere (4: Riposo al posto di una maledetta, Salta al posto di un premio)
- R: ricominciare dopo la morte
- Per ora solo tastiera: la versione per telefono è sospesa

Modalità prova: https://yeppama.github.io/gioco/?debug=1 (L livello, I invincibile, N chiudi round, B vai al boss, M vai al mini boss)

## File

- `index.html` — la pagina che carica il gioco
- `lingua.js` — tutte le scritte in italiano e inglese (la lingua si cambia dal menu pausa)
- `config.js` — tutti i numeri del gioco (vita, velocità, danni, round, nemici, ostacoli)
- `abilita.js` — la tabella delle abilità
- `benedizioni.js` — benedizioni maledette e divine
- `statistiche.js` — la formula che calcola le statistiche dalle abilità
- `controlli.js` — tastiera
- `flowfield.js` — come i nemici aggirano gli ostacoli
- `arena.js` — arena più grande dello schermo, ostacoli generati, espansione dopo il boss
- `nemici.js` — comportamento dei nemici
- `boss.js` — boss e mini boss
- `arco.js` — frecce, faretra, ricarica e colpo caricato
- `lame.js` — lame orbitanti
- `scia.js` — scia del vento (benedizione divina)
- `consumabili.js` — sfere di vita nell'arena
- `fulmine.js` — fulmini su chi resta fermo
- `round.js` — round, ondate, furia, difficoltà e round dei boss
- `interfaccia.js` — testi e barre sullo schermo
- `scelta.js` — la schermata "scegli 1 tra 3"
- `pausa.js` — il menu pausa
- `partita.js` — mette insieme tutti i pezzi
- `main.js` — l'avvio del gioco
