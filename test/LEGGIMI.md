# Prova automatica

`prova.js` apre il gioco in un browser senza finestra, lo fa avanzare fotogramma per fotogramma
(senza disegnare, quindi in pochi secondi) e controlla che:

- ogni abilità, combinazione, benedizione e premio, preso da solo, giri 8 secondi senza errori;
- tutto preso insieme giri 60 secondi senza errori e senza valori rotti (NaN);
- chi resta fermo muoia nel round 1, e da fermo arrivino gruppi di nemici sempre più vicini;
- il round del boss parta e si giochi;
- il menu pausa, con tutto preso, non abbia scritte sovrapposte o fuori schermo (italiano e inglese);
- Seconda vita salvi una volta sola;
- ogni scritta e ogni carta abbia l'italiano e l'inglese, e ogni `tr('...')` del codice esista in `lingua.js`.

Non fa parte del gioco: `index.html` non la carica, e il gioco resta senza npm.

## Come si lancia

Serve Node.js con Playwright (`npm install playwright` in una cartella a parte, oppure quello già
presente nel container di Claude). Dalla cartella del gioco:

```
node test/prova.js
```

Finisce con "Tutto a posto." (codice 0) oppure con l'elenco delle prove fallite (codice 1).

Dove cdnjs non è raggiungibile (il container cloud di Claude), lo script usa una copia locale di Phaser 4.1.0:
di default `/home/claude/phaserjs/phaser/dist/phaser.min.js`, oppure il percorso nella variabile
`PHASER_LOCALE`. La copia si ottiene con
`git clone --depth 1 --branch v4.1.0 https://github.com/phaserjs/phaser /home/claude/phaserjs/phaser`.

## Cosa NON dice

Se il gioco è divertente o equilibrato. I "giocatori finti" girano in cerchio e schivano a intervalli fissi:
servono solo a scoprire errori. La difficoltà la giudica Stefano giocando.

## Quando lanciarla

Prima di ogni push. Quando aggiungi un'abilità o una benedizione, la prova la include da sola.
