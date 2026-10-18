// Mesas de las partidas (openspec: mesas-con-bots). Una sola regla para todos los juegos de sala:
//   max      cupo de personas (el servidor rechaza a la que sigue con «sala_llena»).
//   asientos lugares de la mesa: si la sala lleva bots, los que falten se completan con bots y cada persona que
//            entra quita un bot (ej. Dominó de 4: 3 personas + 1 bot). Sin asientos, los bots se suman aparte (quiz).
//   min      mínimo para empezar contando personas y bots.
//   bots     "siempre" (no se pueden quitar), "nunca" (solo personas) u omitido (lo decide quien crea la sala).
//   formatos mesa distinta según `opciones.formato` (futbolito-equipos: Futbolito 2v2).
// La misma tabla vive en server/salas.ts (MESAS); server/mesas_test.ts comprueba que coincidan.
(function (g) {
  'use strict';
  const MESAS = {
    ajedrez: { max: 2, min: 2, bots: 'nunca' },
    brisca: { max: 4, asientos: 4, min: 4, bots: 'siempre' },
    // clasicos-rapidos (misma tabla que server/salas.ts)
    gato: { max: 2, asientos: 2, min: 2 },
    conecta4: { max: 2, asientos: 2, min: 2 },
    ppt: { max: 8, asientos: 4, min: 2 },
    ahorcado: { max: 8, min: 1 },
    serpientes: { max: 4, asientos: 4, min: 2 },
    // juegos-tablero: Batalla naval sin bots (su flota la guarda el servidor); los demás se completan con bots.
    damas: { max: 2, asientos: 2, min: 2 },
    domino: { max: 4, asientos: 4, min: 2 },
    parchis: { max: 4, asientos: 4, min: 2 },
    naval: { max: 2, min: 2, bots: 'nunca' },
    // juegos-salas-grandes
    bingo: { max: 30, min: 1 },
    blackjack: { max: 6, asientos: 3, min: 1 }, // la banca no ocupa asiento
    dibuja: { max: 12, min: 3, bots: 'nunca' }, // los bots no dibujan
    'en-memorama': { max: 30, min: 1 },
    'mente-sopa': { max: 30, min: 1 },
    'cultura-linea': { max: 30, min: 1 }, // cultura-conocimiento: bots aparte, como el quiz
    // futbolito-billar: 1 vs 1 (con bots, 1 persona + 1 bot); futbolito-equipos: formato 2v2 de hasta 4
    futbolito: { max: 2, asientos: 2, min: 2, formatos: { '2v2': { max: 4, asientos: 4, min: 2 } } },
    billar: { max: 2, asientos: 2, min: 2 },
    golf: { max: 4, min: 2, bots: 'nunca' }, // golf: de 2 a 4 personas por turnos, sin bots
    karts: { max: 8, asientos: 3, min: 1 }, // juegos-en-vivo: hasta 8 en vivo; con bots, 1 persona + 2 bots como antes
    futbol: { max: 2, min: 2, bots: 'nunca' }, // futbol-en-linea: 1 vs 1 en vivo, solo personas
    // futbolito-arena: 2 vs 2 por omisión; cada persona que entra quita un bot
    'futbolito-arena': { max: 4, asientos: 4, min: 2, formatos: { '1v1': { max: 2, asientos: 2, min: 2 }, '1v2': { max: 3, asientos: 3, min: 2 }, '2v2': { max: 4, asientos: 4, min: 2 }, '3v3': { max: 6, asientos: 6, min: 2 } } },
    brigada: { max: 8, asientos: 4, min: 1 }, // brigada: de 1 a 8 personas; con bots, compañeros IA hasta 4 asientos
  };
  // futbolito-equipos: con `opciones.formato` la mesa puede cambiar (igual que mesaDe en server/salas.ts).
  const de = (juego, opciones) => {
    const m = MESAS[juego] || null, f = m && opciones && opciones.formato && m.formatos ? m.formatos[opciones.formato] : null;
    return f ? ({ ...m, ...f }) : m;
  };
  // Lugares que ocupan los bots con `humanos` personas: solo en mesas con asientos y si la sala lleva bots.
  const botsEnMesa = (juego, humanos, conBots, opciones) => {
    const m = de(juego, opciones);
    if (!m || !m.asientos || !conBots || m.bots === 'nunca') return null; // null: regla de siempre (bots aparte)
    return Math.max(0, m.asientos - Math.min(humanos, m.max));
  };
  // Texto corto para la sala de espera: «Mesa de 4 · 3 personas + 1 bot».
  const textoMesa = (juego, humanos, bots, opciones) => {
    const m = de(juego, opciones);
    if (!m) return '';
    const p = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
    const lugar = m.asientos ? 'Mesa de ' + m.asientos : 'Hasta ' + m.max + ' personas';
    return lugar + ' · ' + p(humanos, 'persona', 'personas') + (bots ? ' + ' + p(bots, 'bot', 'bots') : '');
  };
  g.Mesas = { MESAS, de, botsEnMesa, textoMesa };
})(typeof globalThis !== 'undefined' ? globalThis : this);
