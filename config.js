// ============================================================
// CONFIG - tutti i numeri del gioco in un posto solo
// Cambia questi valori per bilanciare il gioco senza toccare la logica
// ============================================================

// Lo SCHERMO (quello che vedi) è più piccolo dell'ARENA: la telecamera ti segue
const LARGHEZZA = 800;      // larghezza dello schermo, in pixel
const ALTEZZA = 600;        // altezza dello schermo, in pixel

// Arena: dopo ogni boss se ne genera una nuova, più grande
const ARENA = {
  larghezzaIniziale: 1200,
  altezzaIniziale: 900,
  crescitaPerCiclo: 300,    // pixel in più in larghezza e altezza dopo ogni boss
  areaPerOstacolo: 110000,  // un ostacolo ogni tanti pixel quadrati (più arena = più ostacoli)
  latoOstacoloMin: 50,
  latoOstacoloMax: 100,
  distanzaTraOstacoli: 110, // spazio minimo tra due ostacoli, così si passa sempre
  zonaLiberaCentro: 180,    // niente ostacoli vicino al punto di partenza
  margineBordo: 150,        // niente ostacoli troppo vicino ai bordi
  muroLunghezzaMin: 160,    // muri lunghi (dal ciclo TERRENI.muriDalCiclo)
  muroLunghezzaMax: 260,
  muroSpessore: 36,
};

// Giocatore (valori di partenza: le abilità li modificano, vedi statistiche.js)
const VELOCITA = 300;       // pixel al secondo (era 250: più svelto fin dall'inizio)
const LATO_GIOCATORE = 32;  // grandezza del quadrato
const VITA_MAX = 100;       // punti vita iniziali
const INVULNERABILITA_MS = 800; // dopo un colpo, per quanto non si subisce altro danno

// Arco: spara sempre da solo, alle spalle del giocatore (al contrario di dove cammina).
// Dopo un certo numero di frecce la faretra è vuota e si ricarica.
const CADENZA_MS = 320;          // un colpo ogni 0,32 secondi (era 0,4)
const FRECCE_FARETRA = 30;       // frecce prima di dover ricaricare
const RICARICA_MS = 2000;        // durata della ricarica
const VELOCITA_FRECCIA = 600;    // pixel al secondo
const DANNO_FRECCIA = 10;
const LATO_FRECCIA = 8;
// Distanza dal centro del giocatore da cui parte la freccia: piccola, così colpisce
// anche un nemico appiccicato addosso
const PARTENZA_FRECCIA = 6;
const ANGOLO_VENTAGLIO = 20;     // gradi tra una freccia del ventaglio e la successiva
const DISTANZA_PARALLELE = 12;   // pixel tra frecce parallele (Freccia doppia)

// Terreni di disturbo: dal secondo ciclo l'arena ha chiazze di lava e rovi,
// sempre di più a ogni ciclo. Anche la forma degli ostacoli cambia (muri lunghi).
const TERRENI = {
  perCiclo: 4,              // chiazze in più per ogni ciclo
  raggioMin: 45,
  raggioMax: 90,
  lavaDanno: 6,             // danno della lava (a ogni colpo, come un nemico)
  roviRallentamento: 0.5,   // nei rovi ti muovi a metà velocità
  muriDalCiclo: 1,          // da questo ciclo una parte degli ostacoli diventa muri lunghi
  quotaMuri: 0.35,
};

// Scala dei round senza danni: chi è bravo viene messo alla prova (e premiato)
const SCALA_PERFETTI = {
  minibossA: 3,         // a 3 round senza danni: un mini boss compare nel round dopo
  difficileA: 5,        // a 5: il round dopo è più duro
  moltDifficile: 1.5,   // quanto più duro (vita e danno dei nemici)
  bossForteA: 7,        // a 7: un boss più forte (era il doppio boss)
  vitaBossForte: 1.5,   // quanta vita in più ha
  bossFurboA: 9,        // a 9: un boss che legge i movimenti e schiva, poi doppio mini boss
  premioA: 10,          // a 10: due benedizioni divine e salto in avanti
  salto: 20,            // round saltati
  minibossDopoMinMs: 4000,  // il mini boss "a sorpresa" arriva tra 4 e 12 s dall'inizio del round
  minibossDopoMaxMs: 12000,
};

// Colpo caricato (Spazio o pulsante sul telefono): tenendo premuto l'arco smette
// di sparare e mette da parte frecce dalla faretra; al rilascio partono tutte insieme
const COLPO_CARICATO = {
  sogliaMs: 200,           // bisogna tenere premuto almeno così prima che inizi a caricare
  intervalloMs: 300,       // ogni quanto si aggiunge una freccia alla carica
  massimo: 10,             // frecce al massimo in un colpo caricato
  apertura: 3,             // gradi tra una freccia e l'altra del colpo
  moltDanno: 1.5,          // ogni freccia del colpo fa il 50% in più
  perforazioniExtra: 99,   // attraversano tutti i nemici
  rallentamento: 0.6,      // mentre carichi ti muovi al 60%
};

// Due pressioni di Spazio entro questo tempo = colpo onda
const DOPPIO_SPAZIO_MS = 300;

// Colpo onda: si sblocca con una faretra da almeno 50 frecce.
// Un muro di frecce che attraversa tutto, nella direzione del mirino.
const COLPO_ONDA = {
  faretraMinima: 50,
  costo: 10,           // frecce consumate
  ricaricaMs: 2000,    // tempo minimo tra due onde
  frecce: 9,           // frecce affiancate che formano l'onda
  spaziatura: 9,       // pixel tra una e l'altra
  moltDanno: 2,
};

// Tiro circolare (combinazione Vento della fortuna): frecce in tutte le direzioni.
// Più grande la faretra, più spesso parte: [frecce nella faretra, secondi tra un tiro e l'altro]
const TIRO_CIRCOLARE = {
  frecce: 16,
  tempi: [[30, 7], [40, 6], [50, 5], [60, 4], [100, 1.5]],
};

// Regola anti-fermo: chi resta fermo viene raggiunto dai nemici.
// "Fermo" = resti dentro un cerchio di raggio px dal punto in cui ti sei fermato.
// Ogni intervalloMs da fermo compare un gruppo di nemici, ogni volta più vicino
// (distanze in pixel, poi resta sull'ultima). Uscendo dal cerchio tutto riparte.
const ANTI_FERMO = {
  raggio: 80,
  intervalloMs: 4000,
  nemici: 3,
  distanze: [400, 300, 200, 120],
  avvisoDa: 0.5,   // il cerchio d'avviso compare a metà attesa
};

// Overheal: a vita piena, le cure in più si accumulano; quando arrivano a una
// vita intera (senza prendere danni nel frattempo) si guadagna uno scudo da un colpo.
const OVERHEAL_SCUDI_MASSIMI = 5;

// Schivata (tasto Shift): uno scatto veloce che si paga in frecce
const COSTO_SCHIVATA = 6;          // frecce consumate; con meno frecce non si schiva
const VELOCITA_SCHIVATA = 700;     // pixel al secondo durante lo scatto
const DURATA_SCHIVATA_MS = 180;    // durata dello scatto; in questo tempo non si subiscono danni

// Rarità: quanto spesso esce una carta (peso più alto = più frequente)
const PESI_RARITA = { comune: 10, rara: 4, leggendaria: 1 };

// Benedizioni divine: solo dopo aver sconfitto un boss.
// Round senza danni: premio a scelta tra vita, frecce e velocità.
const RIPOSO_CURA = 0.2;   // la quarta opzione delle maledette: cura il 20% della vita
const PREMIO = { cura: 0.4, vitaMax: 0.15, frecce: 6, velocita: 0.1, danno: 0.1 };
const PREMI_SALTATI_PER_MALEDETTA = 2; // saltando 2 premi si ottiene un potere maledetto

// Carte proposte a ogni scelta (abilità, benedizioni, premi)
const CARTE_PER_SCELTA = 3;

// Numeri delle abilità (usati sia dall'effetto sia dalla descrizione sulla carta)
const NUMERI_ABILITA = {
  corda: { cadenza: 0.85 },               // a ogni livello spari il 15% più spesso
  casino: { gratis: [0.15, 0.4, 0.6] },   // probabilità di colpo gratis per livello
  manirapide: { ricarica: 0.85 },         // a ogni livello la ricarica dura il 15% in meno
  fuoco: { dannoPerLivello: 3 },
  gelo: { base: 0.2, perLivello: 0.1 },   // rallentamento: 30%, 40%, 50%
  vigore: { vita: 20 },
  rigenerazione: { vitaPerLivello: 1 },   // vita ogni INTERVALLO_RIGENERAZIONE_MS
  scudo: { baseS: 12, menoPerLivelloS: 3 }, // ricarica dello scudo: 9, 6, 3 secondi
  passo: { frecce: 2 },                   // frecce in meno per schivata, a livello
  ventofortuna: { gratis: 0.75 },
  faretracapiente: { frecce: 10 },         // frecce in più nella faretra, a livello
  recupero: { probabilita: [0.5, 1] },     // probabilità di riavere 1 freccia a uccisione, per livello
  tripla: { frecce: 3, costo: 2, distanza: 16 }, // 3 frecce in fila (16 px l'una dall'altra), la raffica costa 2
};

// Numeri delle benedizioni (maledette e divine), una voce per benedizione
const BENEDIZIONI = {
  // --- Maledette ---
  patto: { danno: 1.5, vitaPerUccisione: 1 },                 // ogni uccisione costa 1 vita (non uccide mai)
  furiacieca: { cadenza: 0.75, colpiACaso: 0.5 },             // metà delle frecce parte in una direzione a caso
  faretrapesante: { frecce: 15, velocitaSePiena: 0.8 },       // lento solo con più di metà faretra
  occhidibrace: { exp: 1.35, velocitaNemici: 1.2, vitaNemici: 1.2 },
  miraossessiva: { raggio: 300, cadenza: 1.25, vitaMax: 0.85 }, // cadenza 1.25 = spari il 25% più piano
  ultimorespiro: { soglia: 0.3, danno: 2, cure: 0.5 },        // cure dimezzate; sotto la soglia si ferma Rigenerazione
  radici: { danno: 1.5, intervalloMs: 2000 },                 // da fermo +50% danno, ma i nemici arrivano ogni 2 s
  ombralenta: { costoSchivata: 2, invisibileMs: 1000 },       // dopo la schivata i nemici ti perdono di vista
  setebattaglia: { dannoPerUccisione: 0.02, dannoMassimo: 0.4, intervalloOndate: 0.75 },
  corpocenere: { vitaPerSchivata: 0.03 },                     // la schivata costa vita invece di frecce
  // --- Divine ---
  luce: { scudi: 1 },                                         // cura completa + scudi overheal
  vento: { velocita: 0.15 },
  faretrabenedetta: { frecce: 15 },                          // e ricarica istantanea uccidendo élite, mini boss o boss
  giudizio: { danno: 0.2, dannoBoss: 0.2 },                   // contro boss ed élite: +20% e poi altri +20%
  mira: { raggio: 350 },
  ricaricasacra: { ricarica: 0.7, raggioSpinta: 160, forzaSpinta: 520, durataSpintaMs: 220 },
  secondavita: { vita: 0.5, invulnerabileMs: 2000 },          // una volta per partita
  sciavento: { durataMs: 1500, raggio: 14, moltDanno: 0.6, intervalloMs: 300 },
  calice: { velocitaPerScudo: 0.08 },                         // +8% velocità per ogni scudo overheal attivo
};

// Orda che accompagna il boss: gruppi di nemici che arrivano insieme a lui
const ORDA_BOSS = { gruppi: 2, nemiciPerGruppo: 4, extraPerCiclo: 1 };

// Abilità difensive
const INTERVALLO_RIGENERAZIONE_MS = 2000; // ogni quanto agisce Rigenerazione

// Abilità elementali ed evocazioni
const DURATA_FUOCO_MS = 3000;     // per quanto brucia un nemico colpito
const INTERVALLO_FUOCO_MS = 500;  // ogni quanto il fuoco fa danno
const DURATA_GELO_MS = 2000;      // per quanto resta rallentato
const LAME = {
  raggio: 64,              // distanza dal giocatore
  giriAlSecondo: 0.5,      // velocità di rotazione
  lato: 14,
  danno: 8,
  intervalloColpoMs: 400,  // ogni quanto una lama può colpire lo stesso nemico
};

// Limiti: qualunque combinazione di abilità non può superarli
// (servono a evitare personaggi invincibili o rotti)
const LIMITI = {
  cadenzaMinMs: 150,      // non si spara più spesso di così
  costoSchivataMin: 2,    // la schivata costa almeno 2 frecce
  vitaMaxMassima: 300,
  faretraMassima: 200,    // mai più di 200 frecce nella faretra
};

// Esperienza: per salire dal livello 1 al 2 servono EXP_PRIMO_LIVELLO punti,
// poi ogni livello ne chiede di più (vedi CRESCITA_EXP)
const EXP_PRIMO_LIVELLO = 40;
const CRESCITA_EXP = 1.3;   // ogni livello chiede il 30% in più del precedente
// Primi livelli più rapidi: il livello 1 costa il 30% del normale, poi lo sconto
// cala piano piano fino a sparire al livello 9 (da lì valgono solo i numeri sopra)
const EXP_INIZIALE = { scontoPrimo: 0.3, finoAlLivello: 9 };

// Round: per un certo tempo (DURATA_ROUND) arrivano nemici sempre più spesso.
// Poi smettono di arrivare, ma il round finisce solo quando li hai uccisi tutti:
// nel frattempo quelli rimasti si infuriano e diventano sempre più veloci.
// Durata delle comparse: 20 s nel primo round del ciclo, poi +4 s a ogni round
const DURATA_ROUND = { primoS: 20, aumentoS: 4, massimoS: 56 };
const PAUSA_TRA_ROUND_MS = 2500;
const FURIA_PER_SECONDO = 0.08;  // dopo il tempo: +8% di velocità ogni secondo
const FURIA_MASSIMA = 2.5;       // al massimo 2,5 volte più veloci
// I nemici arrivano a GRUPPI, ognuno da una direzione diversa
const ONDATE = {
  intervalloInizialeMs: 4000, // nel primo round di ogni ciclo un gruppo ogni 4 secondi
  riduzionePerRoundMs: 200,   // ogni round i gruppi arrivano un po' più spesso
  intervalloMinimoMs: 1800,
  riduzioneMinimoPerCicloMs: 200, // dopo ogni boss i gruppi possono arrivare ancora più spesso
  intervalloMinimoAssolutoMs: 900,
  gruppoMinimo: 2,            // nemici per gruppo all'inizio del ciclo
  gruppoMassimo: 5,
  maxNemiciInsieme: 20,       // mai più di così in campo
  distanzaComparsaMin: 420,   // i gruppi compaiono fuori dallo schermo...
  distanzaComparsaMax: 650,   // ...ma non troppo lontano
  spargimentoGruppo: 50,      // quanto sono sparsi i nemici di un gruppo attorno al suo centro
  primoGruppoMs: 500,         // il primo gruppo arriva poco dopo l'inizio del round
};
// Da quale round compare ogni tipo, e quanto è frequente (peso più alto = più frequente)
const COMPARSA_TIPI = [
  { tipo: 'inseguitore', daRound: 1, peso: 5 },
  { tipo: 'caricatore', daRound: 2, peso: 2 },
  { tipo: 'mortaio', daRound: 2, peso: 2 },
  { tipo: 'tiratore', daRound: 3, peso: 2 },
];

// Round speciali e difficoltà.
// Un "ciclo" = i round fino al boss. Dentro un ciclo ogni round i nemici
// hanno il 10% in più di vita e danno e il 7% di velocità; dopo ogni boss si sale del 33%
// e il ritmo delle comparse NON riparte da capo: continua ad aumentare.
const OGNI_QUANTI_ROUND_BOSS = 10;
const OGNI_QUANTI_ROUND_MINIBOSS = 7;  // se coincide con il boss, vince il boss
const CRESCITA_PER_ROUND = 0.10;      // vita e danno: +10% a ogni round (non riparte dopo il boss)
const VELOCITA_PER_ROUND = 0.07;      // velocità: +7% a ogni round del ciclo
// Primo ciclo (round 1-10) più dolce, per imparare: valgono questi al posto dei due sopra
const PRIMO_CICLO = { crescitaPerRound: 0.06, velocitaPerRound: 0.04 };
const CRESCITA_PER_CICLO = 0.33;      // vita e danno: +33% dopo ogni boss
const AGGRESSIVITA_PER_CICLO = 0.15;  // dopo ogni boss: +15% velocità, attacchi più frequenti e annunci più brevi

// Boss (round 10, 20, 30...): 3 attacchi annunciati, a turno
const BOSS = {
  nome: { it: 'Il Custode Cinereo', en: 'The Ashen Warden' },
  vita: 2500, velocita: 70, danno: 25, lato: 72, colore: 0x7a6a58, exp: 150,
  pausaTraAttacchiMs: 1400,
  carica: { preparazioneMs: 800, velocita: 480, durataMs: 700 },
  anello: { preparazioneMs: 700, proiettili: 14, velocita: 200, danno: 15 },
  evocazione: { preparazioneMs: 900, quanti: 3, distanza: 70, exp: 2 }, // gli evocati danno poca esperienza
  // Pioggia: cerchi rossi attorno a te che esplodono poco dopo (chi resta fermo li prende)
  pioggia: { preparazioneMs: 500, zone: 5, raggio: 60, spargimento: 140, ritardoMs: 1000, danno: 20 },
  // Dal secondo ciclo, sotto metà vita: attacca più spesso e gli anelli sono doppi
  faseExtra: { sogliaVita: 0.5, pausaTraAttacchiMs: 900, colore: 0x9a4a3a, ritardoSecondoAnelloMs: 300 },
};

// Valori comuni a boss e mini boss
const BOSS_COMUNI = {
  comparsaMin: 300, comparsaMax: 380, // distanza dal giocatore a cui compaiono
  primoAttaccoMs: 1500,               // il primo attacco arriva dopo questo tempo
};

// Boss "furbo" (9 round senza danni): più vita, e schiva le frecce che gli arrivano addosso
const BOSS_FURBO = {
  vita: 1.5,
  distanzaAllarme: 160,   // reagisce alle frecce più vicine di così
  velocitaSchivata: 520,
  durataSchivataMs: 220,
  pausaSchivateMs: 1100,  // tra una schivata e l'altra: è il momento per colpirlo
};

// Mini boss (round 7, 14, 21...): in futuro lascerà anche amuleti e strumenti
// Quando muore lascia una benedizione maledetta
const MINIBOSS = {
  nome: { it: 'La Sentinella Spezzata', en: 'The Broken Sentinel' },
  vita: 700, velocita: 95, danno: 20, lato: 48, colore: 0x5f8f7a, exp: 60,
  pausaTraAttacchiMs: 1600,
  ventaglio: { preparazioneMs: 600, proiettili: 5, apertura: 50, velocita: 240, danno: 12 },
  carica: { preparazioneMs: 600, velocita: 450, durataMs: 500 },
};

// Consumabili: sfere di vita che compaiono nell'arena ogni tanto
const CONSUMABILI = {
  intervalloMs: 12000,  // ogni quanto ne compare una
  massimo: 3,           // mai più di così nell'arena
  cura: 0.15,           // recupera il 15% della vita massima
  raggio: 9,
  durataMs: 20000,      // dopo 20 s sparisce
  distanzaMin: 150,     // compare a questa distanza dal giocatore
  distanzaMax: 500,
};

// Nemici d'élite ("capobranco"): dopo il round 7 di ogni ciclo, uno per round fino al boss.
// Più grandi e "furbi" (mirano dove stai andando). Finché sono vivi, i nemici
// attorno a loro corrono di più: conviene ucciderli per primi.
const ELITE = {
  dopoRound: 7,
  vita: 3, velocita: 1.15, danno: 1.3, lato: 1.3, exp: 5,   // vita: era 6
  aura: { raggio: 160, velocita: 1.2 },  // nemici entro 160 px: +20% velocità
  previsioneS: 0.45,    // quanto in avanti prevedono i tuoi movimenti, in secondi
  colore: 0xf1c40f,     // bordo dorato
};

// Resistenze elementali: fuoco e gelo fanno meno effetto.
// Gli élite ce l'hanno da subito; dopo ogni boss sconfitto tutti i nemici ne guadagnano.
const RESISTENZA = { perBossSconfitto: 0.15, elite: 0.15, massima: 0.6 };

// Nemici: ogni tipo ha i suoi valori (exp = esperienza data quando muore)
const TIPI_NEMICO = {
  // Ti insegue e basta
  inseguitore: { vita: 30, velocita: 120, danno: 10, lato: 28, colore: 0xe0453a, exp: 6 },
  // Ti insegue piano; quando è vicino si ferma, lampeggia e scatta in linea retta
  caricatore: {
    vita: 40, velocita: 80, danno: 20, lato: 30, colore: 0xe08a3a, exp: 10,
    distanzaCarica: 220,   // da quanto vicino decide di caricare
    preparazioneMs: 500,   // quanto lampeggia prima dello scatto (il tuo tempo per spostarti)
    velocitaCarica: 520,   // velocità dello scatto
    durataCaricaMs: 450,   // quanto dura lo scatto
    recuperoMs: 900,       // dopo lo scatto resta fermo: è il momento per colpirlo
  },
  // Resta a distanza e lancia proiettili lenti; gli ostacoli ti fanno da riparo
  tiratore: {
    vita: 25, velocita: 90, danno: 10, lato: 26, colore: 0x9b59d0, exp: 10,
    distanzaIdeale: 260,      // la distanza a cui cerca di stare
    tolleranza: 40,           // entro ±40 px dalla distanza ideale resta fermo
    distanzaTiro: 150,        // spara solo se sei entro distanzaIdeale + questo
    cadenzaMs: 2200,          // ogni quanto spara
    preparazioneTiroMs: 350,  // lampeggia prima di sparare
    velocitaProiettile: 220,
    dannoProiettile: 10,
  },
  // Lento e lontano: bombarda il punto dove sei. Chi resta fermo viene colpito
  mortaio: {
    vita: 30, velocita: 60, danno: 10, lato: 30, colore: 0x8a6d3b, exp: 10,
    distanzaIdeale: 340,
    tolleranza: 60,
    distanzaTiro: 250,
    cadenzaMs: 3000,      // ogni quanto bombarda
    raggio: 55,           // grandezza del cerchio
    ritardoMs: 1100,      // tempo tra il cerchio rosso e l'esplosione: il tuo tempo per spostarti
    dannoEsplosione: 15,
  },
};

// Percorsi dei nemici (flow field): l'arena è divisa in caselle
const CELLA_FLOW = 40;       // grandezza di una casella, in pixel
const MARGINE_FLOW = 17;     // spazio lasciato attorno agli ostacoli (metà del nemico più grande)
