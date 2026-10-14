# Istruzioni per Claude

- Progetto di Stefano, principiante: un gioco roguelite per browser fatto per imparare.
- Commenti nel codice in italiano, semplici, che spiegano il perché.
- JavaScript puro + Phaser 4 da cdnjs, niente bundler né npm: il gioco si apre con index.html.
- Tutti i numeri di bilanciamento stanno in `config.js`, mai sparsi nella logica.
- Una funzionalità alla volta: piccola, provata, poi la successiva.
- Comandi solo in `controlli.js`. Per ora solo tastiera: il mobile è sospeso finché Stefano non decide l'interfaccia.
- File piccoli e separati per argomento (giocatore, nemici, abilità, interfaccia).
- Ogni scritta visibile passa da `tr('chiave')` (non `t`: è il nome usato per il tempo) in `lingua.js`, con versione italiana e inglese. Nuove abilità/benedizioni: aggiungere anche la traduzione in `VOCI_EN`.
- Personaggi, nomi e storia originali: solo l'atmosfera è ispirata a Elden Ring.
- Il gioco è pubblicato con GitHub Pages dal ramo `main`.
- GitHub Pages tiene i file in cache 10 minuti: a ogni modifica di un .js aumenta il `?v=` di TUTTI gli script in `index.html`.
- Dopo ogni push, aprire https://yeppama.github.io/gioco/ e controllare la console prima di dire a Stefano di giocare.
- Per sapere quando GitHub Pages ha finito: `gh run list -R yeppama/gioco -L 1` e `gh run watch <id> -R yeppama/gioco`.
- Test nel browser: con il pannello nascosto il gioco va a scatti; per simulare il tempo si chiama `window.gioco.step(t, 16.67)` in un ciclo (i tween però non avanzano). `?debug=1` attiva i tasti L, I, N, B, M.
- Per giudicare la difficoltà i bot simulati non bastano (scappano male): l'ultima parola è di Stefano che gioca. Test verificato: chi resta fermo muore nel round 1.
- Mai cicli `while` che dipendono da `getChildren()`: in Phaser 4 restituisce una copia e il ciclo non finisce.
