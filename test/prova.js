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
