// ============================================================
// PROVA AUTOMATICA DEL GIOCO
//
// Apre il gioco in un browser senza finestra (Playwright), simula
// la partita fotogramma per fotogramma e controlla che:
//  - ogni abilità e benedizione funzioni senza errori
//  - tutte insieme non rompano niente (niente NaN, niente errori)
//  - chi resta fermo muoia nel round 1 (regola anti-fermo)
//  - il round del boss si giochi senza errori
//  - ogni scritta abbia la versione italiana e inglese
//
// Non fa parte del gioco: index.html non lo carica.
// Come si usa: vedi test/LEGGIMI.md
// ============================================================

const path = require('path');
const http = require('http');
const fs = require('fs');

// Playwright: quello installato normalmente, oppure quello del container cloud
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/npm-tools/node_modules/playwright'); }

const CARTELLA_GIOCO = path.join(__dirname, '..');
const PORTA = 8799;
// Copia locale di Phaser (facoltativa): serve dove cdnjs non è raggiungibile
const PHASER_LOCALE = process.env.PHASER_LOCALE || '/home/claude/phaserjs/phaser/dist/phaser.min.js';

// Piccolo server per i file del gioco (come aprire index.html, ma via http)
function avviaServer() {
  const tipi = { '.html': 'text/html', '.js': 'application/javascript', '.md': 'text/plain' };
  const server = http.createServer((req, res) => {
    const nome = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(CARTELLA_GIOCO, nome === '/' ? 'index.html' : nome);
    if (!file.startsWith(CARTELLA_GIOCO) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': tipi[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(PORTA, () => ok(server)));
}

// --- Funzioni che girano DENTRO la pagina del gioco ---
// (vengono passate al browser come testo, quindi non possono usare variabili di questo file)
function preparaAiuti() {
  const g = window.gioco;
  // Si ferma il ciclo vero del browser: il tempo lo fa avanzare solo il test
  g.loop.sleep();
  let orologio = performance.now();
  // Un passo = un fotogramma da 16.67 ms, senza disegnare (molto più veloce).
  // Le scelte aperte si chiudono da sole (prima carta).
  window.passi = (quanti) => {
    for (let i = 0; i < quanti; i++) {
      orologio += 16.67;
      g.headlessStep(orologio, 16.67);
      const sc = g.scene.getScene('scelta');
      if (sc && sc.scene.isActive() && sc.dati && !sc.scelto) {
        sc.scegli(sc.dati.opzioni[0] ? sc.dati.opzioni[0].id : 'riposo');
      }
    }
  };
  // Nuova partita pulita, con i comandi finti decisi dal test
  window.nuovaPartita = (comandi) => {
    const s = g.scene.getScene('partita');
    s.scene.restart();
    window.passi(3);
    const n = g.scene.getScene('partita');
    let k = 0;
    let angolo = 0;
    n.controlli.direzione = () => {
      if (comandi === 'fermo') return { x: 0, y: 0 };
      angolo += 0.02; // gira in cerchio: un modo semplice per non stare mai fermo
      return { x: Math.cos(angolo), y: Math.sin(angolo) };
    };
    n.controlli.schivata = () => comandi !== 'fermo' && (++k % 90 === 0);
    n.controlli.caricaPremuta = () => comandi !== 'fermo' && (k % 400) > 340;
    window.passi(5);
    return n;
  };
  // Cerca valori rotti nelle statistiche e nella vita
  window.valoriRotti = (s) => {
    const rotti = [];
    // Nessuna voce oltre il suo livello massimo
    for (const [id, liv] of Object.entries(s.livelliAbilita)) {
      const voce = trovaVoce(id);
      if (liv > voce.max) rotti.push(id + ' al livello ' + liv + ' (massimo ' + voce.max + ')');
    }
    for (const [chiave, valore] of Object.entries(s.stats)) {
      if (typeof valore === 'number' && !Number.isFinite(valore)) rotti.push('stats.' + chiave + '=' + valore);
    }
    if (!Number.isFinite(s.vita)) rotti.push('vita=' + s.vita);
    if (!Number.isFinite(s.arco.frecceRimaste)) rotti.push('frecce=' + s.arco.frecceRimaste);
    return rotti;
  };
}

// Ogni prova restituisce un elenco di problemi (vuoto = tutto bene)
const PROVE = {
  // Ogni voce presa da sola, al massimo livello (i premi 3 volte), 8 secondi di gioco
  ognunaDaSola: () => {
    const problemi = [];
    const voci = [...ABILITA, ...COMBINAZIONI, ...MALEDETTE, ...DIVINE, ...PREMI];
    for (const v of voci) {
      try {
        const s = window.nuovaPartita('muove');
        s.invincibileDebug = true;
        for (let i = 0; i < Math.min(v.max, 3); i++) s.prendiAbilita(v.id);
        window.passi(480);
        const rotti = window.valoriRotti(s);
        if (rotti.length) problemi.push(v.id + ': ' + rotti.join(', '));
      } catch (e) {
        problemi.push(v.id + ': ' + e.message);
      }
    }
    return problemi;
  },

  // Tutto insieme per 60 secondi, senza invincibilità
  tutteInsieme: () => {
    const s = window.nuovaPartita('muove');
    for (const v of [...ABILITA, ...COMBINAZIONI, ...MALEDETTE, ...DIVINE, ...PREMI]) {
      for (let i = 0; i < Math.min(v.max, 3); i++) s.prendiAbilita(v.id);
    }
    window.passi(3600);
    console.log('tutte insieme: ' + Math.round(s.tempo / 1000) + ' s di gioco, round ' + s.round.numero + ', uccisioni ' + s.uccisioni + ', morto ' + s.morto);
    return window.valoriRotti(s);
  },

  // Regola fondamentale: chi resta fermo muore nel round 1
  fermoMuore: () => {
    const s = window.nuovaPartita('fermo');
    for (let i = 0; i < 1800 && !s.morto; i++) window.passi(1);
    console.log('fermo: morto dopo ' + Math.round(s.tempo / 1000) + ' s di gioco, round ' + s.round.numero);
    if (!s.morto) return ['fermo per 30 s e ancora vivo (vita ' + Math.round(s.vita) + ')'];
    if (s.round.numero > 1) return ['fermo: morto solo al round ' + s.round.numero];
    return [];
  },

  // Regola anti-fermo: da fermo arrivano gruppi sempre più vicini; muovendosi no
  antiFermo: () => {
    const problemi = [];
    const s = window.nuovaPartita('fermo');
    s.invincibileDebug = true;
    // si aspetta che il round sia cominciato
    for (let i = 0; i < 300 && s.round.fase === 'pausa'; i++) window.passi(1);
    const vicini = () => s.nemici.getChildren().filter(n => Phaser.Math.Distance.Between(n.x, n.y, s.giocatore.x, s.giocatore.y) < 450).length;
    // Si conta il tempo di gioco, non i fotogrammi: durante le scelte di livello la partita è ferma
    const aspetta = (ms) => { const fine = s.tempo + ms; for (let i = 0; i < 5000 && s.tempo < fine; i++) window.passi(1); };
    aspetta(ANTI_FERMO.intervalloMs + 100);
    if (s.antiFermo.arrivi < 1) problemi.push('dopo ' + ANTI_FERMO.intervalloMs + ' ms fermo non è arrivato nessun gruppo');
    if (vicini() < ANTI_FERMO.nemici) problemi.push('il gruppo non è comparso vicino al giocatore');
    aspetta(3 * ANTI_FERMO.intervalloMs);
    if (s.antiFermo.arrivi < 4) problemi.push('da fermo per 4 attese sono arrivati solo ' + s.antiFermo.arrivi + ' gruppi');
    return problemi;
  },

  // Capobranco: l'élite accelera i nemici vicini, e la sua aura sparisce con lui
  capobranco: () => {
    const problemi = [];
    const s = window.nuovaPartita('muove');
    s.invincibileDebug = true;
    const g = s.giocatore;
    const capo = generaNemico(s, 'inseguitore', g.x + 300, g.y, true);
    const vicino = generaNemico(s, 'inseguitore', g.x + 340, g.y);
    const lontano = generaNemico(s, 'inseguitore', g.x - 300, g.y);
    window.passi(1);
    const vVicino = velocitaNemico(s, vicino, 100, s.tempo);
    const vLontano = velocitaNemico(s, lontano, 100, s.tempo);
    if (Math.abs(vVicino / vLontano - ELITE.aura.velocita) > 0.01) problemi.push('aura: il nemico vicino non accelera (' + (vVicino / vLontano).toFixed(2) + ')');
    const aura = capo.aura;
    colpisciNemico(s, capo, 999999);
    window.passi(1);
    if (aura.active) problemi.push("l'aura resta dopo la morte del capobranco");
    return problemi;
  },

  // Scala dei round perfetti: a 7 arriva UN boss con più vita
  bossForte: () => {
    const s = window.nuovaPartita('muove');
    s.invincibileDebug = true;
    s.round.eventoProssimo = 'bossforte';
    for (let i = 0; i < 600 && s.round.tipo !== 'evento'; i++) window.passi(1);
    const boss = s.nemici.getChildren().filter(n => n.tipoNemico === 'boss');
    if (boss.length !== 1) return ['boss forte: ' + boss.length + ' boss invece di 1'];
    const normale = Math.round(BOSS.vita * s.round.moltiplicatore());
    if (boss[0].vitaMax < normale * SCALA_PERFETTI.vitaBossForte - 2) return ['boss forte senza vita in più'];
    return [];
  },

  // Il round del boss parte e si gioca senza errori
  roundBoss: () => {
    const s = window.nuovaPartita('muove');
    s.invincibileDebug = true;
    s.round.numero = OGNI_QUANTI_ROUND_BOSS - 1;
    for (let i = 0; i < 600 && s.round.tipo !== 'boss'; i++) window.passi(1);
    if (s.round.tipo !== 'boss') return ['il round del boss non è partito'];
    const boss = s.nemici.getChildren().find(n => n.tipoNemico === 'boss');
    if (!boss) return ['round del boss senza boss'];
    window.passi(1800);
    return window.valoriRotti(s);
  },

  // Menu pausa con tutto preso, in italiano e in inglese: niente errori,
  // nessuna scritta che esce dallo schermo o finisce sotto i pulsanti
  menuPausa: () => {
    const problemi = [];
    const s = window.nuovaPartita('muove');
    for (const v of [...ABILITA, ...COMBINAZIONI, ...MALEDETTE, ...DIVINE, ...PREMI]) {
      for (let i = 0; i < Math.min(v.max, 3); i++) s.prendiAbilita(v.id);
    }
    window.passi(60);
    const linguaPrima = LINGUA;
    for (const lingua of ['it', 'en']) {
      impostaLingua(lingua);
      s.apriPausa();
      window.passi(2);
      const pausa = window.gioco.scene.getScene('pausa');
      if (!pausa.scene.isActive()) { problemi.push('la pausa non si apre (' + lingua + ')'); continue; }
      // Ogni pagina della pausa, una alla volta
      for (const pagina of PAGINE_PAUSA) {
        pausa.vaiA(pagina);
        window.passi(2);
        if (pausa.pagina !== pagina) problemi.push(lingua + ': la pagina ' + pagina + ' non si apre');
        for (const o of pausa.children.list) {
          if (o.type !== 'Text') continue;
          const b = o.getBounds();
          const pulsante = o.y >= ALTEZZA - 70; // le scritte dei pulsanti stanno lì apposta
          if (b.right > LARGHEZZA + 1 || (!pulsante && b.bottom > ALTEZZA - 85)) {
            problemi.push(lingua + ': scritta fuori posto "' + o.text.split('\n')[0] + '..." (fino a y=' + Math.round(b.bottom) + ')');
          }
          if (o.text.includes('undefined') || o.text.includes('NaN')) problemi.push(lingua + ': scritta rotta "' + o.text.slice(0, 40) + '"');
        }
        // Nessuna scritta sopra un'altra
        const scritte = pausa.children.list.filter(o => o.type === 'Text' && o.active);
        for (let i = 0; i < scritte.length; i++) {
          for (let j = i + 1; j < scritte.length; j++) {
            const a = scritte[i].getBounds();
            const b = scritte[j].getBounds();
            if (Phaser.Geom.Rectangle.Intersection(a, b).width > 2 && Phaser.Geom.Rectangle.Intersection(a, b).height > 2) {
              problemi.push(lingua + ': scritte sovrapposte "' + scritte[i].text.split('\n')[0] + '" e "' + scritte[j].text.split('\n')[0] + '"');
            }
          }
        }
        // Il testo non deve diventare troppo piccolo da leggere
        for (const o of scritte) if (parseInt(o.style.fontSize, 10) < 14) problemi.push(lingua + ', ' + pagina + ': testo piccolo (' + o.style.fontSize + ')');
      }
      pausa.riprendi();
      window.passi(2);
    }
    impostaLingua(linguaPrima);
    return problemi;
  },

  // Seconda vita: salva una volta sola
  secondaVita: () => {
    const s = window.nuovaPartita('muove');
    s.prendiAbilita('secondavita');
    // (si tolgono le difese che potrebbero esserci per caso: la prima abilità è scelta a caso)
    const colpoMortale = () => { s.ultimoColpo = -1e9; s.fineSchivata = 0; s.scudiOverheal = 0; s.scudoPronto = false; s.subisciDanno(99999); };
    colpoMortale();
    if (s.morto || s.vita <= 0) return ['Seconda vita non ha salvato il giocatore'];
    colpoMortale();
    if (!s.morto) return ['Seconda vita ha salvato due volte'];
    return [];
  },

  // Ogni scritta e ogni voce ha italiano e inglese
  traduzioni: () => {
    const problemi = [];
    for (const [chiave, voce] of Object.entries(TESTI)) {
      if (!voce.it || !voce.en) problemi.push('TESTI manca una lingua: ' + chiave);
    }
    for (const v of [...ABILITA, ...COMBINAZIONI, ...MALEDETTE, ...DIVINE, ...PREMI]) {
      const en = VOCI_EN[v.id];
      if (!en) { problemi.push('VOCI_EN manca: ' + v.id); continue; }
      for (let liv = 1; liv <= Math.min(v.max, 3); liv++) {
        if (typeof v.descrizione(liv) !== 'string' || typeof en.descrizione(liv) !== 'string') problemi.push('descrizione rotta: ' + v.id);
      }
    }
    return problemi;
  },
};

// Tutte le chiavi usate con tr('...') nel codice devono esistere in TESTI
function chiaviUsate() {
  const chiavi = new Set();
  for (const file of fs.readdirSync(CARTELLA_GIOCO).filter(f => f.endsWith('.js'))) {
    // Le righe di commento non contano (lì "tr('chiave')" è solo un esempio)
    const testo = fs.readFileSync(path.join(CARTELLA_GIOCO, file), 'utf8')
      .split('\n').filter(riga => !riga.trim().startsWith('//')).join('\n');
    for (const m of testo.matchAll(/\btr\('([^']+)'\s*[,)]/g)) chiavi.add(m[1]);
  }
  return [...chiavi];
}

async function main() {
  const server = await avviaServer();
  const browser = await playwright.chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const pagina = await browser.newPage();
  const errori = [];
  pagina.on('pageerror', e => errori.push(e.message));
  pagina.on('console', m => {
    if (m.type() === 'error') errori.push(m.text());
    else if (m.type() === 'log' && !m.text().includes('Phaser')) console.log('        · ' + m.text());
  });
  if (fs.existsSync(PHASER_LOCALE)) {
    await pagina.route('**/cdnjs.cloudflare.com/**', r => r.fulfill({ path: PHASER_LOCALE, contentType: 'application/javascript' }));
  }

  await pagina.goto('http://localhost:' + PORTA + '/?debug=1');
  await pagina.waitForFunction(() => window.gioco && window.gioco.scene.getScene('partita') && window.gioco.scene.getScene('partita').stats, null, { timeout: 20000 });
  await pagina.evaluate(preparaAiuti);

  let falliti = 0;
  for (const [nome, prova] of Object.entries(PROVE)) {
    const inizio = Date.now();
    const prima = errori.length;
    let problemi;
    try {
      problemi = await pagina.evaluate(prova);
    } catch (e) {
      problemi = ['eccezione: ' + e.message];
    }
    problemi = problemi.concat(errori.slice(prima).map(e => 'errore in console: ' + e));
    const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
    if (problemi.length === 0) {
      console.log('OK      ' + nome + '  (' + secondi + ' s)');
    } else {
      falliti++;
      console.log('FALLITA ' + nome + '  (' + secondi + ' s)');
      for (const p of problemi.slice(0, 15)) console.log('        - ' + p);
    }
  }

  // Controllo delle chiavi tr('...'): si fa qui, leggendo i file
  const mancanti = await pagina.evaluate((chiavi) => chiavi.filter(c => !TESTI[c]), chiaviUsate());
  if (mancanti.length) {
    falliti++;
    console.log('FALLITA chiavi tr() mancanti in TESTI: ' + mancanti.join(', '));
  } else {
    console.log('OK      chiavi tr()');
  }

  await browser.close();
  server.close();
  console.log(falliti === 0 ? '\nTutto a posto.' : '\n' + falliti + ' prove fallite.');
  process.exit(falliti === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
