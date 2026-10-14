// ============================================================
// LINGUA - italiano e inglese
//
// Ogni scritta del gioco passa da tr('chiave', valori...): la funzione
// sceglie la versione nella lingua attuale. Le abilità e le benedizioni
// restano scritte in italiano nei loro file; qui c'è la loro traduzione
// inglese (VOCI_EN), cercata per id.
//
// La lingua si cambia dal menu pausa e viene ricordata dal browser.
// ============================================================

let LINGUA = (() => {
  try {
    return localStorage.getItem('gioco.lingua') || 'it';
  } catch (e) {
    return 'it'; // se il browser non permette di salvare, si parte in italiano
  }
})();

function impostaLingua(lingua) {
  LINGUA = lingua;
  try { localStorage.setItem('gioco.lingua', lingua); } catch (e) { /* niente: vale solo per questa partita */ }
}

// Sceglie la versione giusta di un testo scritto come { it: ..., en: ... }
function tl(testo) {
  if (typeof testo === 'string') return testo;
  return testo[LINGUA] || testo.it;
}

// Tutte le scritte dell'interfaccia. Le funzioni ricevono i numeri da inserire.
const TESTI = {
  // Schermate di scelta
  'scelta.prima': { it: 'Scegli la tua prima abilità', en: 'Choose your first ability' },
  'scelta.livello': { it: (n) => 'Livello ' + n + '!', en: (n) => 'Level ' + n + '!' },
  'scelta.divinaBoss': { it: 'Il boss è caduto: benedizione divina', en: 'The boss has fallen: divine blessing' },
  'scelta.premio': { it: 'Round senza danni!', en: 'Flawless round!' },
  'scelta.perfetti1': { it: '10 round perfetti: benedizione divina', en: '10 flawless rounds: divine blessing' },
  'scelta.perfetti2': { it: '10 round perfetti: seconda benedizione', en: '10 flawless rounds: second blessing' },
  'scelta.sentinella': { it: 'La Sentinella lascia un potere maledetto', en: 'The Sentinel leaves a cursed power' },
  'scelta.saltati': { it: 'Hai rinunciato ai premi: potere maledetto', en: 'You gave up your rewards: cursed power' },
  'sotto.abilita': { it: 'Scegli un\'abilità', en: 'Choose an ability' },
  'sotto.maledetta': { it: 'Potere con un prezzo. Oppure riposa.', en: 'Power with a price. Or rest.' },
  'sotto.divina': { it: 'Un dono senza prezzo', en: 'A gift with no price' },
  'sotto.premio': { it: 'Scegli il tuo premio', en: 'Choose your reward' },
  'carta.nuova': { it: 'Nuova', en: 'New' },
  'carta.livello': { it: (n) => 'Livello ' + n, en: (n) => 'Level ' + n },
  'carta.rara': { it: 'Rara', en: 'Rare' },
  'carta.combinazione': { it: 'Combinazione', en: 'Combination' },
  'carta.riposo': { it: (p) => '4 · Riposo: recuperi il ' + p + '% della vita', en: (p) => '4 · Rest: recover ' + p + '% of your health' },
  'carta.salta': {
    it: (a, b) => '4 · Salta (' + a + '/' + b + ' per un potere maledetto)',
    en: (a, b) => '4 · Skip (' + a + '/' + b + ' for a cursed power)',
  },

  // Interfaccia in partita
  'hud.vita': { it: (a, b) => 'Vita: ' + a + ' / ' + b, en: (a, b) => 'Health: ' + a + ' / ' + b },
  'hud.invincibile': { it: '  (invincibile)', en: '  (invincible)' },
  'hud.livello': { it: (n) => 'Livello ' + n, en: (n) => 'Level ' + n },
  'hud.overheal': { it: (a, b) => 'Overheal ' + a + '/' + b, en: (a, b) => 'Overheal ' + a + '/' + b },
  'hud.scudi': { it: (n) => '  ·  Scudi ' + n, en: (n) => '  ·  Shields ' + n },
  'hud.perfetti': { it: (n) => 'Round senza danni: ' + n, en: (n) => 'Flawless rounds: ' + n },
  'hud.round': { it: (n) => 'Round ' + n, en: (n) => 'Round ' + n },
  'hud.ciclo': { it: (n) => '  ·  Ciclo ' + n, en: (n) => '  ·  Cycle ' + n },
  'hud.ricarica': { it: 'Ricarica...', en: 'Reloading...' },
  'hud.frecce': { it: (a, b) => 'Frecce: ' + a + ' / ' + b, en: (a, b) => 'Arrows: ' + a + ' / ' + b },
  'hud.carica': { it: (n) => '   Carica: ' + n, en: (n) => '   Charge: ' + n },
  'hud.rimasti': { it: (n) => 'Rimasti: ' + n, en: (n) => 'Remaining: ' + n },
  'hud.aiuto': {
    it: 'WASD muoviti · Shift schivata · Spazio carica (2 volte: onda) · Ctrl ricarica · Esc pausa',
    en: 'WASD move · Shift dodge · Space charge (twice: wave) · Ctrl reload · Esc pause',
  },
  'hud.debug': {
    it: 'DEBUG\nL: livello\nI: invincibile\nN: chiudi round\nB: boss  M: mini boss',
    en: 'DEBUG\nL: level\nI: invincible\nN: end round\nB: boss  M: mini boss',
  },

  // Scritte grandi al centro
  'b.elite': { it: 'Un nemico d\'élite!', en: 'An elite enemy!' },
  'b.dueSentinelle': { it: 'E ora due Sentinelle!', en: 'And now two Sentinels!' },
  'b.sentinellaTrova': { it: 'Una Sentinella ti ha trovato!', en: 'A Sentinel has found you!' },
  'b.eliminaRimasti': { it: 'Elimina i rimasti!', en: 'Finish them off!' },
  'b.doppioBoss': { it: 'Doppio boss!', en: 'Double boss!' },
  'b.custodeStudia': { it: 'Il Custode ti studia...', en: 'The Warden is studying you...' },
  'b.custodeInfuria': { it: 'Il Custode si infuria!', en: 'The Warden is enraged!' },
  'b.round': { it: (n) => 'Round ' + n, en: (n) => 'Round ' + n },
  'b.piuDuro': { it: ': più duro!', en: ': harder!' },
  'b.bossSconfitto': { it: 'Boss sconfitto! L\'arena si allarga', en: 'Boss defeated! The arena grows' },
  'b.superato': { it: (n) => 'Round ' + n + ' superato!', en: (n) => 'Round ' + n + ' cleared!' },
  'b.scaraventato': { it: (n) => 'Scaraventato avanti di ' + n + ' round!', en: (n) => 'Hurled ' + n + ' rounds ahead!' },
  'b.onda': { it: (n) => 'Onda: servono ' + n + ' frecce nella faretra', en: (n) => 'Wave: you need a ' + n + '-arrow quiver' },
  'b.scudoOverheal': { it: 'Scudo di overheal!', en: 'Overheal shield!' },
  'b.secondaVita': { it: 'Seconda vita!', en: 'Second life!' },

  // Menu pausa
  'p.titolo': { it: 'Pausa', en: 'Paused' },
  'p.info': {
    it: (r, c, l) => 'Round ' + r + '  ·  Ciclo ' + c + '  ·  Livello ' + l,
    en: (r, c, l) => 'Round ' + r + '  ·  Cycle ' + c + '  ·  Level ' + l,
  },
  'p.abilita': { it: 'Abilità', en: 'Abilities' },
  'p.divine': { it: 'Benedizioni divine', en: 'Divine blessings' },
  'p.maledette': { it: 'Benedizioni maledette', en: 'Cursed blessings' },
  'p.premi': { it: 'Premi', en: 'Rewards' },
  'p.combinazioni': { it: 'Combinazioni', en: 'Combinations' },
  'p.statistiche': { it: 'Statistiche', en: 'Stats' },
  'p.riprendi': { it: 'Riprendi (Esc)', en: 'Resume (Esc)' },
  'p.ricomincia': { it: 'Ricomincia', en: 'Restart' },
  'p.lingua': { it: 'Lingua: Italiano', en: 'Language: English' },
  'st.vita': { it: (a, b) => 'Vita: ' + a + ' / ' + b, en: (a, b) => 'Health: ' + a + ' / ' + b },
  'st.danno': { it: (x) => 'Danno freccia: ' + x, en: (x) => 'Arrow damage: ' + x },
  'st.raffiche': { it: (x) => 'Raffiche al secondo: ' + x, en: (x) => 'Volleys per second: ' + x },
  'st.perRaffica': { it: (n) => 'Frecce per raffica: ' + n, en: (n) => 'Arrows per volley: ' + n },
  'st.faretra': { it: (n) => 'Faretra: ' + n, en: (n) => 'Quiver: ' + n },
  'st.ricarica': { it: (x) => 'Ricarica: ' + x + ' s', en: (x) => 'Reload: ' + x + ' s' },
  'st.schivata': { it: (n) => 'Schivata: ' + n + ' frecce', en: (n) => 'Dodge: ' + n + ' arrows' },
  'st.velocita': { it: (n) => 'Velocità: ' + n, en: (n) => 'Speed: ' + n },
  'st.rimbalzi': { it: (n) => 'Rimbalzi: ' + n, en: (n) => 'Bounces: ' + n },
  'st.perforazioni': { it: (n) => 'Perforazioni: ' + n, en: (n) => 'Pierces: ' + n },
  'st.mira': { it: (n) => 'Mira automatica: ' + n + ' px', en: (n) => 'Auto-aim: ' + n + ' px' },
  'st.esperienza': { it: (x) => 'Esperienza: x' + x, en: (x) => 'Experience: x' + x },
  'st.gratis': { it: (n) => 'Colpi gratis: ' + n + '%', en: (n) => 'Free shots: ' + n + '%' },

  // Fine run
  'm.morto': { it: 'SEI MORTO', en: 'YOU DIED' },
  'm.info': {
    it: (r, l, d) => 'Round ' + r + '  ·  Livello ' + l + '  ·  ' + d,
    en: (r, l, d) => 'Round ' + r + '  ·  Level ' + l + '  ·  ' + d,
  },
  'm.uccisi': { it: (n) => 'Nemici uccisi: ' + n, en: (n) => 'Enemies killed: ' + n },
  'm.fonti': { it: 'Danni per fonte', en: 'Damage by source' },
  'm.ricomincia': { it: 'Premi R per ricominciare', en: 'Press R to restart' },

  // Fonti di danno (riepilogo)
  'fonte.Frecce': { it: 'Frecce', en: 'Arrows' },
  'fonte.Fuoco': { it: 'Fuoco', en: 'Fire' },
  'fonte.Lame orbitanti': { it: 'Lame orbitanti', en: 'Orbiting blades' },
  'fonte.Colpo caricato': { it: 'Colpo caricato', en: 'Charged shot' },
  'fonte.Colpo onda': { it: 'Colpo onda', en: 'Wave shot' },
  'fonte.Tiro circolare': { it: 'Tiro circolare', en: 'Circular shot' },
  'fonte.Fulmine': { it: 'Fulmine', en: 'Lightning' },
  'fonte.Scia del vento': { it: 'Scia del vento', en: 'Wind trail' },
};

function tr(chiave, ...valori) {
  const voce = TESTI[chiave];
  if (!voce) return chiave; // chiave mancante: si vede subito sullo schermo
  const testo = voce[LINGUA] || voce.it;
  return typeof testo === 'function' ? testo(...valori) : testo;
}

// Traduzione inglese di abilità, combinazioni, benedizioni e premi, cercata per id
const VOCI_EN = {
  doppia: { nome: 'Double arrow', descrizione: (liv) => '+1 parallel arrow per shot (total ' + (liv + 1) + ')' },
  ventaglio: { nome: 'Fan', descrizione: () => '+2 diagonal arrows per shot' },
  rimbalzo: { nome: 'Ricochet', descrizione: (liv) => 'Arrows bounce off walls and obstacles (' + liv + (liv === 1 ? ' time)' : ' times)') },
  perforazione: { nome: 'Piercing', descrizione: (liv) => 'Arrows go through ' + liv + (liv === 1 ? ' enemy' : ' enemies') },
  corda: { nome: 'Taut string', descrizione: () => 'Shoot ' + percentuale(1 - NA.corda.cadenza) + '% faster' },
  casino: { nome: 'Casino', descrizione: (liv) => percentuale(NA.casino.gratis[liv - 1]) + '% chance that a shot uses no arrows' },
  manirapide: { nome: 'Quick hands', descrizione: () => 'Reload takes ' + percentuale(1 - NA.manirapide.ricarica) + '% less time' },
  fuoco: { nome: 'Fire arrows', descrizione: (liv) => 'Hit enemies burn: ' + NA.fuoco.dannoPerLivello * liv + ' damage every ' + secondi(INTERVALLO_FUOCO_MS) + ' s for ' + secondi(DURATA_FUOCO_MS) + ' s' },
  gelo: { nome: 'Frost arrows', descrizione: (liv) => 'Hit enemies slow down by ' + percentuale(rallentamentoGelo(liv)) + '% for ' + secondi(DURATA_GELO_MS) + ' s (half on bosses)' },
  lame: { nome: 'Orbiting blades', descrizione: (liv) => (liv === 1 ? 'A blade spins' : liv + ' blades spin') + ' around you and cut whatever they touch' },
  vigore: { nome: 'Vigor', descrizione: () => '+' + NA.vigore.vita + ' max health, and heals you for ' + NA.vigore.vita },
  rigenerazione: { nome: 'Regeneration', descrizione: (liv) => 'Recover ' + NA.rigenerazione.vitaPerLivello * liv + ' health every ' + secondi(INTERVALLO_RIGENERAZIONE_MS) + ' s' },
  scudo: { nome: 'Spirit shield', descrizione: (liv) => 'Blocks one hit; recharges in ' + ricaricaScudoS(liv) + ' seconds' },
  passo: { nome: 'Light step', descrizione: () => 'Dodging costs ' + NA.passo.frecce + ' fewer arrows' },
  ventofortuna: { nome: 'Wind of fortune', descrizione: () => percentuale(NA.ventofortuna.gratis) + '% free shots and a circular shot every ' + TIRO_CIRCOLARE.tempi[0][1] + ' s (more often with a bigger quiver)' },
  // Le benedizioni leggono i numeri da BENEDIZIONI (config.js), come in italiano
  patto: { nome: 'Blood pact', descrizione: () => 'Damage +' + percentuale(BENEDIZIONI.patto.danno - 1) + '%\nbut every kill costs you ' + BENEDIZIONI.patto.vitaPerUccisione + ' health' },
  furiacieca: { nome: 'Blind fury', descrizione: () => 'Shoot ' + percentuale(1 - BENEDIZIONI.furiacieca.cadenza) + '% faster\nbut half your arrows fly anywhere' },
  faretrapesante: { nome: 'Heavy quiver', descrizione: () => '+' + BENEDIZIONI.faretrapesante.frecce + ' arrows in the quiver\nbut above half a quiver you move ' + percentuale(1 - BENEDIZIONI.faretrapesante.velocitaSePiena) + '% slower' },
  occhidibrace: { nome: 'Ember eyes', descrizione: () => '+' + percentuale(BENEDIZIONI.occhidibrace.exp - 1) + '% experience\nbut enemies get +' + percentuale(BENEDIZIONI.occhidibrace.velocitaNemici - 1) + '% speed and +' + percentuale(BENEDIZIONI.occhidibrace.vitaNemici - 1) + '% health' },
  miraossessiva: { nome: 'Obsessive aim', descrizione: () => 'Arrows seek the nearest enemy (' + BENEDIZIONI.miraossessiva.raggio + ' px)\nbut you shoot ' + percentuale(BENEDIZIONI.miraossessiva.cadenza - 1) + '% slower and -' + percentuale(1 - BENEDIZIONI.miraossessiva.vitaMax) + '% max health' },
  ultimorespiro: { nome: 'Last breath', descrizione: () => 'Double damage below ' + percentuale(BENEDIZIONI.ultimorespiro.soglia) + '% health\nbut healing is halved and Regeneration stops down there' },
  pattofulmine: { nome: 'Lightning pact', descrizione: () => 'The punishing lightning also strikes nearby enemies\nbut falls after only ' + (BENEDIZIONI.pattofulmine.graziaMs / 1000) + ' s standing still' },
  ombralenta: { nome: 'Slow shadow', descrizione: () => 'After a dodge enemies lose you for ' + (BENEDIZIONI.ombralenta.invisibileMs / 1000) + ' s\nbut dodging costs double' },
  setebattaglia: { nome: 'Battle thirst', descrizione: () => 'Each kill +' + percentuale(BENEDIZIONI.setebattaglia.dannoPerUccisione) + '% damage until the round ends (max +' + percentuale(BENEDIZIONI.setebattaglia.dannoMassimo) + '%)\nbut enemies arrive more often' },
  corpocenere: { nome: 'Body of ash', descrizione: () => 'Dodging costs no arrows\nbut each dodge takes ' + percentuale(BENEDIZIONI.corpocenere.vitaPerSchivata) + '% of your health' },
  luce: { nome: 'Restoring light', descrizione: () => 'Heals you completely\nand grants ' + BENEDIZIONI.luce.scudi + ' overheal shield' },
  vento: { nome: 'Grace of the wind', descrizione: () => 'Move ' + percentuale(BENEDIZIONI.vento.velocita) + '% faster' },
  faretrabenedetta: { nome: 'Blessed quiver', descrizione: () => '+' + BENEDIZIONI.faretrabenedetta.frecce + ' arrows in the quiver\nand every kill gives an arrow back' },
  giudizio: { nome: 'Blade of judgement', descrizione: () => 'Damage +' + percentuale(BENEDIZIONI.giudizio.danno) + '%\nand about +' + percentuale((1 + BENEDIZIONI.giudizio.danno) * (1 + BENEDIZIONI.giudizio.dannoBoss) - 1) + '% against bosses and elites' },
  mira: { nome: 'Hunter\'s eye', descrizione: () => 'Arrows seek the nearest enemy within ' + BENEDIZIONI.mira.raggio + ' pixels' },
  ricaricasacra: { nome: 'Sacred reload', descrizione: () => 'Reload takes ' + percentuale(1 - BENEDIZIONI.ricaricasacra.ricarica) + '% less time\nand reloading pushes nearby enemies away' },
  secondavita: { nome: 'Second life', descrizione: () => 'Once per run, when you die\nyou come back with ' + percentuale(BENEDIZIONI.secondavita.vita) + '% health' },
  sciavento: { nome: 'Wind trail', descrizione: () => 'Dodging leaves a trail\nthat hurts enemies who touch it' },
  calice: { nome: 'Chalice', descrizione: () => 'Each active overheal shield\nmakes you move ' + percentuale(BENEDIZIONI.calice.velocitaPerScudo) + '% faster' },
  premiocura: { nome: 'Breath', descrizione: () => 'Recover ' + Math.round(PREMIO.cura * 100) + '% of your health' },
  premiovita: { nome: 'Fortitude', descrizione: () => '+' + Math.round(PREMIO.vitaMax * 100) + '% max health' },
  premiofrecce: { nome: 'Wide quiver', descrizione: () => '+' + PREMIO.frecce + ' arrows in the quiver' },
  premiovelocita: { nome: 'Swift step', descrizione: () => 'Move ' + Math.round(PREMIO.velocita * 100) + '% faster' },
};

// Nome e descrizione di una voce (abilità, benedizione...) nella lingua attuale
function nomeDi(voce) {
  return LINGUA === 'en' && VOCI_EN[voce.id] ? VOCI_EN[voce.id].nome : voce.nome;
}

function descrizioneDi(voce, livello) {
  return LINGUA === 'en' && VOCI_EN[voce.id] ? VOCI_EN[voce.id].descrizione(livello) : voce.descrizione(livello);
}
