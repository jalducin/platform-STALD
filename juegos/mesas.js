// Mesas de las partidas (openspec: mesas-con-bots). Una sola regla para todos los juegos de sala:
//   max      cupo de personas (el servidor rechaza a la que sigue con «sala_llena»).
//   asientos lugares de la mesa: si la sala lleva bots, los que falten se completan con bots y cada persona que
//            entra quita un bot (ej. Dominó de 4: 3 personas + 1 bot). Sin asientos, los bots se suman aparte (quiz).
//   min      mínimo para empezar contando personas y bots.
//   bots     "siempre" (no se pueden quitar), "nunca" (solo personas) u omitido (lo decide quien crea la sala).
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
    futbolito: { max: 2, asientos: 2, min: 2 }, // futbolito-billar: 1 vs 1 (con bots, 1 persona + 1 bot)
    billar: { max: 2, asientos: 2, min: 2 },
    golf: { max: 4, min: 2, bots: 'nunca' }, // golf: de 2 a 4 personas por turnos, sin bots
  };
  const de = juego => MESAS[juego] || null;
  // Lugares que ocupan los bots con `humanos` personas: solo en mesas con asientos y si la sala lleva bots.
  const botsEnMesa = (juego, humanos, conBots) => {
    const m = de(juego);
    if (!m || !m.asientos || !conBots || m.bots === 'nunca') return null; // null: regla de siempre (bots aparte)
    return Math.max(0, m.asientos - Math.min(humanos, m.max));
  };
  // Texto corto para la sala de espera: «Mesa de 4 · 3 personas + 1 bot».
  const textoMesa = (juego, humanos, bots) => {
    const m = de(juego);
    if (!m) return '';
    const p = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
    const lugar = m.asientos ? 'Mesa de ' + m.asientos : 'Hasta ' + m.max + ' personas';
    return lugar + ' · ' + p(humanos, 'persona', 'personas') + (bots ? ' + ' + p(bots, 'bot', 'bots') : '');
  };
  g.Mesas = { MESAS, de, botsEnMesa, textoMesa };
})(typeof globalThis !== 'undefined' ? globalThis : this);
