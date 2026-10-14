# Istruzioni per Claude

- Progetto di Stefano, principiante: un gioco roguelite per browser fatto per imparare.
- Commenti nel codice in italiano, semplici, che spiegano il perché.
- JavaScript puro + Phaser 4 da cdnjs, niente bundler né npm: il gioco si apre con index.html.
- Tutti i numeri di bilanciamento stanno in `config.js`, mai sparsi nella logica.
- Una funzionalità alla volta: piccola, provata, poi la successiva.
- Comandi (tastiera e touch) solo in `controlli.js`.
- File piccoli e separati per argomento (giocatore, nemici, abilità, interfaccia).
- Personaggi, nomi e storia originali: solo l'atmosfera è ispirata a Elden Ring.
- Il gioco è pubblicato con GitHub Pages dal ramo `main`.
- GitHub Pages tiene i file in cache 10 minuti: a ogni modifica di un .js aumenta il `?v=` di TUTTI gli script in `index.html`.
- Dopo ogni push, aprire https://yeppama.github.io/gioco/ e controllare la console prima di dire a Stefano di giocare.
