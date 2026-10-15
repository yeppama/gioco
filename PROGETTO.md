# PROGETTO — riepilogo completo per chi lavora sul codice

Documento di riferimento per Claude Code (e per Stefano). Spiega cosa è il gioco, com'è fatto
il codice, quali regole seguire, cosa è stato deciso e cosa resta da fare.
Le regole di lavoro obbligatorie sono in `CLAUDE.md`; questo file le dà per lette.
**Aggiornalo quando cambi un sistema o prendi una decisione di design.**

Stato: ottobre 2026, versione script `?v=26`, ~3600 righe di JavaScript in 24 file più la prova automatica.

---

## 1. Cos'è il gioco

- Roguelite d'azione top-down per browser, stile **Archero**, atmosfera dark fantasy ispirata a
  Elden Ring. **Nomi, personaggi e storia sono originali** (rischio diritti: si prende solo l'atmosfera).
- Progetto hobby di Stefano, **principiante**, che lo usa per imparare: il codice deve restare
  leggibile da un principiante, commentato in italiano, senza strumenti di build.
- Ora c'è solo la **modalità endless**. Modalità storia a livelli: più avanti.
- Grafica provvisoria: rettangoli e cerchi colorati. La pixel art arriverà dopo.
- Giocabile su https://yeppama.github.io/gioco/ (GitHub Pages dal ramo `main`).
- Solo tastiera e mouse. La versione per telefono è **sospesa** finché Stefano non decide l'interfaccia.

## 2. Come gira una partita

1. All'inizio si sceglie 1 abilità su 3.
2. **Round** (`round.js`): per 20 s (+4 s a round, massimo 56 s) arrivano **gruppi** di nemici da
   punti fuori dallo schermo. Poi smettono di arrivare, ma il round finisce solo quando sono tutti
   morti. Intanto quelli rimasti vanno in **furia** (sempre più veloci, e chi spara da lontano ti viene addosso).
3. **Ciclo** = 10 round. Il round 7 ha il **mini boss** (La Sentinella Spezzata), il round 10 ha il
   **boss** (Il Custode Cinereo) con un'orda. Dopo il boss l'arena si rigenera più grande, con più
   ostacoli e terreni, e tutto diventa più forte.
4. **Esperienza** dai nemici → level up → 1 abilità su 3. Ogni livello chiede il 30% in più.
5. **Benedizioni**:
   - *Maledette*: le lascia il mini boss. Forti ma con un prezzo. Al loro posto c'è **Riposo** (cura il 20%).
   - *Divine*: solo dopo aver sconfitto un boss. Nessun prezzo.
   - *Premi*: dopo ogni round senza danni (cura, vita max, frecce, velocità). Si possono **saltare**:
     2 premi saltati = 1 maledetta.
6. **Scala dei round senza danni** (`scalaPerfetti` in `partita.js`): 3 di fila → mini boss a sorpresa;
   5 → round più duro (×1.5); 7 → doppio boss; 9 → boss "furbo" che schiva, poi due mini boss;
   10 → due divine e salto di 20 round in avanti.
7. Alla morte: riepilogo con tempo, round, uccisioni e danni per fonte. R ricomincia.

### Regole anti-giocatore-fermo (fondamentali per il design)
- L'arco **spara da solo alle spalle** del giocatore (direzione opposta al movimento; da fermo resta l'ultima).
- **Fulmine punitivo** (`fulmine.js`): dopo 1 s da fermo cade un fulmine ogni secondo, con danno base 6
  che cresce ×1.75 a ogni colpo. Il contatore scende muovendosi, più in fretta se vai veloce.
- Mortai e pioggia del boss mettono zone a terra dove sei tu.
- Test verificato: chi resta fermo muore nel round 1.

### Comandi (solo in `controlli.js`)
WASD/frecce muoversi · Shift schivata (costa 6 frecce, intoccabile per 180 ms) · Spazio tenuto premuto
colpo caricato · Spazio due volte colpo onda (serve una faretra da 50) · Ctrl ricarica manuale ·
Esc/P pausa · 1-4 o clic per scegliere · R ricomincia.
Debug (`?debug=1`): L livello, I invincibile, N chiudi round, B vai al boss, M vai al mini boss.

## 3. Architettura

JavaScript puro con script classici (niente moduli, niente npm). **Phaser 4.1.0** da cdnjs.
Tutto è globale: l'ordine dei `<script>` in `index.html` conta.

| File | Cosa contiene |
|---|---|
| `index.html` | carica Phaser e gli script nell'ordine giusto, con `?v=N` anti-cache |
| `config.js` | **tutti** i numeri di bilanciamento (vedi §5) |
| `lingua.js` | `LINGUA`, `TESTI` (chiavi → {it, en}), `tr(chiave, ...valori)`, `VOCI_EN` (nomi/descrizioni inglesi di abilità e benedizioni), `nomeDi`, `descrizioneDi`, `tl({it,en})` |
| `abilita.js` | `ABILITA`, `COMBINAZIONI`, `combinazioniPronte`, `estraiOpzioni` (estrazione pesata per rarità) |
| `benedizioni.js` | `MALEDETTE`, `DIVINE`, `PREMI`, `trovaVoce` |
| `statistiche.js` | `calcolaStatistiche(livelli)`: la formula centrale |
| `controlli.js` | classe `Controlli`: l'unico posto che legge la tastiera |
| `flowfield.js` | `FlowField`: BFS su griglia (celle da 40 px) per far aggirare gli ostacoli ai nemici |
| `arena.js` | `Arena`: arena più grande dello schermo, ostacoli, muri, lava e rovi per ciclo, punti di comparsa |
| `nemici.js` | generazione, comportamento (inseguitore, caricatore, tiratore, mortaio), zone a terra, proiettili, `colpisciNemico` |
| `boss.js` | boss e mini boss: attacchi (carica, pioggia, anello, ventaglio, evocazione), fase extra, boss furbo |
| `arco.js` | `Arco`: faretra, ricarica, tiro automatico, colpo caricato, colpo onda, tiro circolare, mira automatica |
| `lame.js` | `LameOrbitanti` |
| `scia.js` | `SciaVento` (benedizione divina Scia del vento) |
| `consumabili.js` | sfere di vita nell'arena |
| `fulmine.js` | `Fulmine` punitivo |
| `round.js` | `GestoreRound`: ritmo, difficoltà, eventi, élite, boss |
| `interfaccia.js` | HUD (vita, frecce, livello, round, scudi, contatori, barra del boss, banner, riepilogo) |
| `scelta.js` | scena `scelta`: "scegli 1 tra 3" (stile per tipo: abilita, maledetta, divina, premio) |
| `pausa.js` | scena `pausa`: elenco abilità e benedizioni, statistiche, Riprendi, Ricomincia, Lingua |
| `vita.js` | `METODI_VITA`: `cura`, `subisciDanno`, difese, `vitaCritica` (overheal, scudi, Seconda vita) |
| `combattimento.js` | `METODI_COMBATTIMENTO`: `dannoFreccia`, `applicaEffetti`, `nemicoPiuVicino`, `vista`, `alUccidere`, `respingiNemici`, `registraDanno` |
| `progressi.js` | `METODI_PROGRESSI`: esperienza, `fineRound`, `scalaPerfetti`, `apriScelta`, `apriPausa`, `prendiAbilita` |
| `partita.js` | scena `partita`: create, update, movimento, schivata, arena, debug, morte. In fondo `Object.assign(ScenaPartita.prototype, ...)` aggiunge i metodi dei tre file sopra |
| `test/prova.js` | prova automatica con Playwright (non caricata dal gioco) |
| `main.js` | crea `window.gioco = new Phaser.Game(...)` (800×600, Scale FIT, Arcade physics) |

### Flusso di un fotogramma (`ScenaPartita.update`)
1. Se c'è una scelta in `codaScelte` → apre la scena `scelta` e mette in pausa la partita.
2. Pausa richiesta → apre la scena `pausa`.
3. `this.tempo += min(delta, 50)`: **orologio proprio della partita**, si ferma in pausa.
   Tutta la logica usa `this.tempo`, mai `time` di Phaser.
4. Schivata o movimento → mirino → ricarica, onda, `arco.aggiorna` → difese (rigenerazione, scudo) →
   fulmine → lava → lame → scia → consumabili → round → zone →
   flow field (verso `vista()`) → ogni nemico → bordi delle frecce → trasparenza del giocatore → HUD.

### Statistiche (pattern centrale)
- Ogni abilità e benedizione ha `applica(s, livello)`; alcune hanno `alPrendere(scena)` per effetti immediati.
- `calcolaStatistiche(livelliAbilita)` parte dai valori di `config.js`, applica nell'ordine
  ABILITA → COMBINAZIONI → MALEDETTE → DIVINE → PREMI, poi i moltiplicatori (`dannoMolt`, `vitaMaxMolt`)
  e infine i `LIMITI`.
- La partita legge **solo** `scena.stats`. Si ricalcola in `prendiAbilita`.
- Le regole speciali delle benedizioni sono campi di `s` (es. `colpiACaso`, `vitaPerUccisione`,
  `secondaVita`) che la logica controlla nel punto giusto.

### Punti di aggancio da conoscere
- `scena.cura(q)`: ogni cura passa da qui. Moltiplica per `cureMolt` e manda l'eccesso nell'**overheal**:
  una vita intera di eccesso, senza danni nel mezzo, diventa uno **scudo da un colpo** (massimo 5).
- `scena.subisciDanno(d)`: invulnerabilità (800 ms), schivata, Scudo spirituale, scudi overheal,
  Seconda vita, morte.
- `colpisciNemico(scena, n, danno, fonte)`: ogni danno ai nemici. Applica `dannoBossMolt`, registra il
  danno per il riepilogo e a ogni uccisione chiama `scena.alUccidere()`.
- `scena.vista()`: dove i nemici credono che sia il giocatore (Ombra lenta). Tutte le IA mirano lì.
- `scena.dannoFreccia()`: danno attuale di una freccia (Ultimo respiro, Sete di battaglia).
- `arco.iniziaRicarica()` → `scena.respingiNemici()` con Ricarica sacra.

## 4. Contenuti attuali

### Nemici (`TIPI_NEMICO`, `COMPARSA_TIPI`)
inseguitore (dal round 1) · caricatore (dal 2, lampeggia e poi scatta in linea retta) · mortaio (dal 2,
zone a terra) · tiratore (dal 3, sta a distanza e spara).
**Élite** dal round 8 di ogni ciclo: ×6 vita, mira dove stai andando, resiste agli elementi.
Dopo ogni boss: +15% di resistenza agli elementi (massimo 60%).

### Difficoltà
- Vita e danno ×(1 + 0.10·(round−1)) × (1 + 0.33·ciclo), senza mai ripartire da capo.
- Velocità +7% a round dentro il ciclo, più +15% di aggressività per ciclo.
- Il tempo tra un gruppo e l'altro scende col round assoluto, con un minimo che si abbassa a ogni ciclo.

### Abilità (`abilita.js`)
Freccia doppia (rara), Ventaglio (rara), Rimbalzo, Perforazione, Corda tesa, Casinò (15/40/60% di colpi
gratis), Mani rapide, Frecce infuocate, Frecce di brina, Lame orbitanti (rara), Vigore, Rigenerazione,
Scudo spirituale, Passo leggero.
Combinazione: **Vento della fortuna** (Casinò 3 + Passo leggero 2) → 75% di colpi gratis e un tiro
circolare tanto più frequente quanto è grande la faretra.

### Benedizioni (numeri in `BENEDIZIONI` di `config.js`, riviste con Stefano il 14/10/2026)
Maledette (massimo 1 ciascuna):
- Patto di sangue: danno ×1.5, ogni uccisione −1 vita (mai letale).
- Furia cieca: si spara il 25% più spesso, il 50% delle frecce va in una direzione a caso.
- Faretra pesante: +15 frecce, −20% velocità solo con più di metà faretra.
- Occhi di brace: esperienza +35%, nemici +20% velocità e +20% vita.
- Mira ossessiva: mira automatica entro 300 px, si spara il 25% più piano, −15% vita massima.
- Ultimo respiro: danno ×2 sotto il 30% di vita; **tutte le cure dimezzate**; sotto il 30% si ferma
  **solo l'abilità Rigenerazione** (le altre cure funzionano).
- Patto del fulmine: il fulmine punitivo colpisce anche i nemici entro 130 px (danno ×4), ma cade dopo 0.5 s.
- Ombra lenta: dopo la schivata i nemici mirano per 1 s al punto da cui sei partito; la schivata costa il doppio.
- Sete di battaglia: +2% danno a uccisione fino a fine round (massimo +40%); i gruppi arrivano il 25% più spesso.
- Corpo di cenere: la schivata non costa frecce (anche in ricarica) ma toglie il 3% della vita.

Divine: Luce ristoratrice (cura completa + 1 scudo overheal) · Grazia del vento (+15% velocità, ×3) ·
Faretra benedetta (+8 frecce, 1 freccia restituita a uccisione, ×3) · Lama del giudizio (+20% danno,
+20% in più contro boss ed élite, ×3) · Occhio del cacciatore (mira entro 350 px, ×1) · Ricarica sacra
(−30% ricarica e i nemici vicini vengono respinti, ×2) · Seconda vita (una volta per partita al 50%) ·
Scia del vento (la schivata lascia una scia che ferisce) · Calice (+8% velocità per ogni scudo overheal attivo).

Premi: Respiro (cura 30%) · Tempra (+10% vita max) · Faretra ampia (+4) · Passo svelto (+10% velocità).

## 5. Regole del codice (riassunto di `CLAUDE.md` più quelle emerse col lavoro)

- **Numeri solo in `config.js`.** Nuove meccaniche → nuova voce in config, con un commento. La descrizione
  della carta deve leggere lo stesso numero (mai scriverlo a mano nel testo), sia in italiano sia in `VOCI_EN`.
- **Scritte visibili solo con `tr('chiave')`** (`tr`, non `t`: `t` è il tempo). Nuove abilità o benedizioni:
  descrizione italiana nel file dati **e** voce inglese in `VOCI_EN`. Nuove fonti di danno: chiave `fonte.<Nome>`.
- Comandi solo in `controlli.js`.
- File piccoli per argomento; commenti in italiano che spiegano il **perché**.
- **Mai `while` che dipende da `getChildren()`**: in Phaser 4 restituisce una copia e il ciclo non finisce.
  Per eliminare mentre si scorre: `getChildren().slice()` oppure segnare e filtrare dopo.
- Oggetti riusati invece che distrutti per frecce e proiettili (`getFirstDead`).
- A ogni modifica di un `.js` aumentare `?v=` di **tutti** gli script in `index.html` (cache di Pages: 10 minuti).
- Una funzionalità alla volta: piccola, provata, poi la successiva.

## 6. Pubblicare e provare

- Commit come `yeppama` e push su `main`; poi `gh run list -R yeppama/gioco -L 1` e
  `gh run watch <id> -R yeppama/gioco --exit-status`; poi aprire il sito e controllare la console.
- **Prova automatica**: `node test/prova.js` (dettagli in `test/LEGGIMI.md`). Ferma il ciclo vero di Phaser
  (`game.loop.sleep()`) e avanza con `game.headlessStep(t, 16.67)` senza disegnare: tutte le prove durano
  pochi secondi. Va lanciata prima di ogni push. Le nuove abilità e benedizioni vengono provate da sole.
- **Prova a mano nel browser**: nel browser integrato il gioco va a scatti se il pannello è nascosto. Si simula il
  tempo con `window.gioco.step(t, 16.67)` in un ciclo (i tween però non avanzano), e si chiudono le scelte
  aperte con `game.scene.getScene('scelta').scegli(id)`.
- Nel container cloud **cdnjs e github.io sono bloccati**: per i test con Playwright si clona
  `phaserjs/phaser` al tag `v4.1.0` (contiene `dist/phaser.min.js`), si serve il repo con
  `python3 -m http.server` e si reindirizza l'URL di cdnjs con `page.route`.
- Per la difficoltà **conta Stefano che gioca**: i bot scappano male e non sono affidabili.

## 7. Debito tecnico e ottimizzazioni consigliate (in ordine di utilità)

1. ~~Test automatici~~ fatto (`test/prova.js`), con prove del menu pausa e di Seconda vita. Possibile
   aggiunta: una prova per ognuna delle altre benedizioni con regola speciale.
2. ~~`partita.js` troppo grande~~ fatto: diviso in `vita.js`, `combattimento.js`, `progressi.js`.
   `prendiAbilita` ora ignora le voci già al massimo (la prova aveva trovato Casinò al livello 4 = NaN).
3. ~~Numeri sparsi~~ fatto: abilità (`NUMERI_ABILITA`), boss (`BOSS_COMUNI`, `BOSS_FURBO`, evocazione e
   secondo anello in `BOSS`), muri e margini dell'arena (`ARENA`), gruppi (`ONDATE`), distanze di tiro di
   tiratore e mortaio (`TIPI_NEMICO`), mini boss a sorpresa (`SCALA_PERFETTI`), carte per scelta
   (`CARTE_PER_SCELTA`). Le descrizioni delle carte leggono gli stessi numeri, in italiano e in inglese.
   Restano nel codice, di proposito, solo i numeri **grafici** (durata di lampi e tween, colori, posizioni
   dell'HUD): non cambiano il bilanciamento.
4. **Testi duplicati**: le descrizioni italiane stanno nei file dati, quelle inglesi in `VOCI_EN`.
   Meglio mettere entrambe in `lingua.js` (o tutte e due nei dati) per non dimenticarne una.
5. **Effetti grafici che creano e distruggono oggetti** a ogni colpo (lampo bianco con `delayedCall` in
   `colpisciNemico`, cerchi della scia a ogni fotogramma, esplosioni, saette). Con tanti nemici conviene un
   piccolo riuso (pool) o meno oggetti (es. un punto di scia ogni 2–3 fotogrammi).
6. ~~Variabili globali dai nomi corti~~ fatto: `B` e `perc` tolti. In `abilita.js` ci sono gli aiuti
   globali `percentuale`, `secondi`, `NA` (= `NUMERI_ABILITA`), `ricaricaScudoS`, `rallentamentoGelo`.
   Attenzione: due `const` globali con lo stesso nome in due file diversi bloccano tutto il gioco.
7. Le **chiavi delle fonti di danno** sono in italiano (`'Frecce'`, `'Fuoco'`…) e servono anche da chiave di
   traduzione: funziona, ma un id neutro (`'frecce'`) sarebbe più pulito.
8. ~~Menu pausa senza regole speciali~~ fatto: mostra scudi overheal, Sete di battaglia, Ultimo respiro
   attivo o no, Seconda vita pronta o usata, cure e danno contro i boss. Le colonne si impilano da sole e
   rimpiccioliscono il testo se serve (`colonna()` in `pausa.js`); la prova controlla che nessuna scritta
   si sovrapponga o esca dallo schermo, in italiano e in inglese.
9. `vitaNemiciMolt` (Occhi di brace) vale solo per i nemici nati **dopo** averla presa. Voluto, ma non scritto.

## 8. Da fare (rimandato, in ordine indicativo)

- Prova delle benedizioni rivedute da parte di Stefano, poi ribilanciamento.
- Dal round 20: pericoli casuali che cambiano la mappa (muri che crollano, lava, veleno, sabbie mobili,
  bombe che lasciano terra bruciata).
- Dal round 30: nemici che schivano e si proteggono.
- **Mercante** (una volta ogni 15 round, 4 scelte, tra cui una maledetta casuale a penalità doppia;
  vendendo una maledetta si toglie il suo debuff).
- **Sacerdote** (da definire).
- Dal round 50 l'arena torna a restringersi.
- Altre combinazioni di abilità.
- **Fase 4**: ceneri e potenziamenti permanenti tra una run e l'altra (oggi una run persa non lascia nulla).
- Pixel art, suoni, modalità storia, interfaccia per telefono.

## 9. Decisioni prese (per non rimetterle in discussione senza motivo)

- Tiro automatico alle spalle (scelto dopo diverse prove). Mira automatica solo da benedizioni.
- Schivata pagata in frecce; faretra base 30 frecce, ricarica 2 s, massimo 200 frecce.
- Il round finisce solo quando i nemici sono tutti morti.
- Le divine arrivano **solo** dopo un boss.
- Il fulmine è la contromisura principale contro il gioco statico.
- Lingua italiana e inglese, scelta dal menu pausa e ricordata dal browser (`localStorage`, con try/catch).
