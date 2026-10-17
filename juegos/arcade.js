/* Arcade: reglas y datos compartidos de «Axo y los 12 mundos» (plataformas) y «Karts Turbo» (karts).
   Lo cargan juegos.html (partidas en sala: mapa, tiempos de bots y puntos por lugar) y los dos juegos.
   Sin DOM ni dependencias. Ver openspec: juegos-plataformas-karts. */
(function (raiz) {
  'use strict';

  // ---------- Azar con semilla (igual que las salas de juegos.html) ----------
  function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
  const rng = (seed, etiqueta) => mulberry(fnv(seed + '|' + etiqueta));

  // ---------- Plataformas ----------
  const TILE = 16, TRAMO = 16, FILAS = 15; // tile en px lógicos, ancho de cada tramo (tiles) y alto del nivel
  const VEL_AXO = 120; // velocidad máxima de Axo (px/s)
  const NIVELES_POR_MUNDO = 3; // el 3.º es el castillo con jefe
  // 12 mundos (estructura del diseño del profe); los 4 primeros son jugables y tienen física propia.
  // fisica: acel y freno en el piso (px/s²), aire = control en el aire (0–1), viento = fuerza máxima de las ráfagas.
  const MUNDOS = [
    { n: 1, clave: 'pradera', nombre: 'Pradera Verde', emoji: '🌱', jugable: true, aviso: 'Física base: control equilibrado.',
      fisica: { acel: 900, freno: 1300, aire: 0.85, viento: 0 },
      color: { cielo: '#8fd3ff', cielo2: '#e3f6ff', lejos: '#7cc47a', cerca: '#4fa64d', suelo: '#8a5a2b', borde: '#43b649', bloque: '#d98a3a', enemigo: '#6a3fb5', jefe: '#7b2f9e' } },
    { n: 2, clave: 'desierto', nombre: 'Desierto Árido', emoji: '🌵', jugable: true, aviso: 'Viento cruzado: las ráfagas te empujan. Mira la flecha 💨.',
      fisica: { acel: 850, freno: 1000, aire: 0.8, viento: 190 },
      color: { cielo: '#ffcf8a', cielo2: '#fff3d6', lejos: '#e8b26a', cerca: '#d1934a', suelo: '#c98b3f', borde: '#f0c56b', bloque: '#b8642b', enemigo: '#c0392b', jefe: '#8e2a1e' } },
    { n: 3, clave: 'hielo', nombre: 'Tundra de Hielo', emoji: '❄️', jugable: true, aviso: 'El piso resbala: frena con tiempo.',
      fisica: { acel: 380, freno: 150, aire: 0.75, viento: 0 },
      color: { cielo: '#b9dcf5', cielo2: '#eef8ff', lejos: '#d6ecfa', cerca: '#a9d2ee', suelo: '#7fb3d9', borde: '#ffffff', bloque: '#5d8fc2', enemigo: '#2c5d8f', jefe: '#1d3f6e' } },
    { n: 4, clave: 'volcan', nombre: 'Volcán Activo', emoji: '🌋', jugable: true, aviso: 'Las plataformas sobre la lava caen al pisarlas.',
      fisica: { acel: 900, freno: 1300, aire: 0.85, viento: 0 },
      color: { cielo: '#3a1b2e', cielo2: '#8a2f2a', lejos: '#4d2433', cerca: '#2b1622', suelo: '#4a3434', borde: '#ff7a2f', bloque: '#7a4b3a', enemigo: '#ff9f1c', jefe: '#d62828' } },
    { n: 5, clave: 'arrecife', nombre: 'Arrecife', emoji: '🐠', jugable: false },
    { n: 6, clave: 'cavernas', nombre: 'Cavernas', emoji: '🦇', jugable: false },
    { n: 7, clave: 'gigante', nombre: 'Arquitectura Gigante', emoji: '🏛️', jugable: false },
    { n: 8, clave: 'cielo', nombre: 'Altitudes del Cielo', emoji: '☁️', jugable: false },
    { n: 9, clave: 'tuberias', nombre: 'Laberinto de Tuberías', emoji: '⚙️', jugable: false },
    { n: 10, clave: 'jungla', nombre: 'Jungla Salvaje', emoji: '🌴', jugable: false },
    { n: 11, clave: 'ruinas', nombre: 'Ruinas Nocturnas', emoji: '🌙', jugable: false },
    { n: 12, clave: 'fortaleza', nombre: 'Fortaleza Final', emoji: '🏰', jugable: false },
  ];
  const MUNDOS_JUGABLES = MUNDOS.filter(m => m.jugable).length;
  // Tramos intermedios de un nivel (más por mundo y por nivel).
  const tramosDe = (m, n) => 4 + m + n;
  const esCastillo = n => n === NIVELES_POR_MUNDO;
  // Ancho en tiles: inicio + tramos + checkpoint + meta (o la arena del jefe, de 2 tramos, en el castillo).
  const anchoNivel = (m, n) => (tramosDe(m, n) + 2 + (esCastillo(n) ? 2 : 1)) * TRAMO;
  // Tiempo de referencia (ms): recorrer el nivel a la velocidad máxima, con margen por saltos y enemigos.
  const refPlataformas = (m, n) => Math.round(anchoNivel(m, n) * TILE / VEL_AXO * 1.6 * 1000);

  // ---------- Karts ----------
  const VEL_KART = 250; // velocidad punta base (px/s)
  const VUELTAS = 2; // karts-pistas-grandes: por omisión; cada pista define las suyas (`vueltas`, ver vueltasDe)
  // Pistas (openspec: karts-pistas-mesoamericanas): las definiciones viven en juegos/karts-pistas.js, que se carga
  // antes que este archivo. PISTAS = las de sala (las 8 desde juegos-en-vivo, igual que MAPAS_SALA de server/carreras.ts);
  // pistaPorId encuentra todas (también las de la Copa Mesoamericana).
  const TODAS_PISTAS = (raiz.KartsPistas && raiz.KartsPistas.PISTAS) || [];
  const PISTAS = TODAS_PISTAS.filter(p => p.sala);
  const pistaPorId = id => TODAS_PISTAS.find(p => p.id === id) || null;

  // Catmull-Rom cerrada muestreada cada `paso` px. Devuelve { pts:[{x,y,a}], largo } (a = ángulo de la tangente).
  const cacheMuestras = {};
  function muestrearPista(pista, paso = 8) {
    const clave = pista.id + '|' + paso;
    if (cacheMuestras[clave]) return cacheMuestras[clave];
    const P = pista.puntos, n = P.length, densos = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 40; k++) {
        const t = k / 40, t2 = t * t, t3 = t2 * t;
        densos.push({
          x: 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          y: 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        });
      }
    }
    // Remuestreo a distancia constante.
    const pts = [{ x: densos[0].x, y: densos[0].y }];
    let acumulado = 0, largo = 0;
    for (let i = 1; i <= densos.length; i++) {
      const a = densos[i - 1], b = densos[i % densos.length];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      largo += d; acumulado += d;
      while (acumulado >= paso) {
        acumulado -= paso;
        const f = 1 - acumulado / d;
        pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      }
    }
    if (Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y) < paso / 2) pts.pop();
    for (let i = 0; i < pts.length; i++) {
      const s = pts[(i + 1) % pts.length], r = pts[(i - 1 + pts.length) % pts.length];
      pts[i].a = Math.atan2(s.y - r.y, s.x - r.x);
    }
    return (cacheMuestras[clave] = { pts, largo, paso });
  }
  // Vueltas de una carrera en la pista (karts-pistas-grandes: 2 en las 8; sin pista, VUELTAS).
  const vueltasDe = id => { const p = pistaPorId(id); return p && Number.isInteger(p.vueltas) && p.vueltas > 0 ? p.vueltas : VUELTAS; };
  // Tiempo de referencia (ms) de una carrera completa (sus vueltas a 200 px/s).
  const refKarts = id => { const p = pistaPorId(id); return p ? Math.round(muestrearPista(p).largo * vueltasDe(id) / (VEL_KART * 0.8) * 1000) : 0; };
  // Mínimo y límite de una carrera de sala en la pista (karts-pistas-grandes): 25 % y 2.5 veces la referencia (el
  // límite en decenas de segundo). Los usa también el servidor (server/carreras.ts importa este archivo). null sin pista.
  function limitesKarts(id) {
    if (!pistaPorId(id)) return null;
    const ref = refKarts(id);
    return { minMs: Math.round(ref * 0.25), limiteMs: Math.ceil(ref * 2.5 / 10000) * 10000 };
  }
  const LIM_KARTS = PISTAS.map(p => limitesKarts(p.id));

  // ---------- Partidas (salas) ----------
  // karts: el mayor límite y el menor mínimo de las pistas (cada sala usa los de su pista: limitesKarts).
  const LIMITE_SALA = { plataformas: 240000, karts: LIM_KARTS.length ? Math.max(...LIM_KARTS.map(l => l.limiteMs)) : 340000 }; // igual que server/carreras.ts (sin karts-pistas.js, como en Axo: un valor fijo)
  const MIN_SALA = { plataformas: 6000, karts: LIM_KARTS.length ? Math.min(...LIM_KARTS.map(l => l.minMs)) : 30000 };
  // Límite de la carrera de sala de este juego y mapa (karts: el de la pista).
  const limiteSala = (juego, mapa) => (juego === 'karts' && limitesKarts(mapa) ? limitesKarts(mapa).limiteMs : LIMITE_SALA[juego]);
  const GRACIA_SALA = 10000; // tras el límite, el podio se cierra aunque falte alguien
  // Bots de las salas (mismos ids y nombres que en juegos.html): su tiempo es la referencia por un factor de la semilla.
  const BOTS_SALA = [
    { id: 'bot-vachira', nombre: 'BOT-VACHIRA', factor: [1.0, 1.1], color: '#f59e0b' },
    { id: 'bot-isagii', nombre: 'BOT-ISAGII', factor: [1.08, 1.25], color: '#0ea5e9' },
  ];
  // Nivel normal (m-1 o m-2 de los mundos jugables) o pista, igual para todos a partir de la semilla de la sala.
  function mapaDeSala(juego, seed) {
    const r = rng(seed, 'mapa');
    if (juego === 'plataformas') return (1 + Math.floor(r() * MUNDOS_JUGABLES)) + '-' + (1 + Math.floor(r() * 2));
    return PISTAS[Math.floor(r() * PISTAS.length)].id;
  }
  function refDe(juego, mapa) {
    if (juego === 'plataformas') { const [m, n] = String(mapa).split('-').map(Number); return refPlataformas(m, n); }
    return refKarts(mapa);
  }
  // karts-copa-espacio: ritmo de los bots en la pista (1 en las de siempre; > 1 en las espaciales, las más rápidas).
  const ritmoBots = id => { const p = pistaPorId(id); return p && p.ritmoBots > 0 ? p.ritmoBots : 1; };
  function tiempoBot(juego, mapa, seed, botId) {
    const bot = BOTS_SALA.find(b => b.id === botId) || BOTS_SALA[0];
    const r = rng(seed, botId + '|carrera|' + mapa);
    const f = bot.factor[0] + r() * (bot.factor[1] - bot.factor[0]);
    const ritmo = juego === 'karts' ? ritmoBots(mapa) : 1;
    return Math.round(refDe(juego, mapa) * f / ritmo / 10) * 10;
  }
  // Puntos de partida por lugar en una carrera de sala (karts-salida-y-puntos): estrictamente decrecientes en los 8
  // lugares posibles (500, 440, 380, 320, 260, 200, 140, 80); no terminar = 0 (lo decide podioCarrera).
  const puntosLugar = lugar => Math.max(20, 500 - 60 * (lugar - 1));
  // Podio de una carrera suelta de sala (karts y Axo), igual en la página y en el servidor (server/carreras.ts).
  // filas: [{ id, ms (null = no terminó), t? (hora del servidor al recibirlo), avance? (‰, solo si no terminó) }].
  // Con el reloj común (juegos/reloj-sala.js), ms = hora en que cruzó la meta − salida común: el orden es el de
  // llegada. Empate: quien lo reportó antes y luego el id. Quien no terminó va después, por su avance (sin dato, al
  // final) y el id. Devuelve copias con `lugar` y `total` (puntos de partida; las monedas no cuentan en la sala).
  function podioCarrera(filas) {
    const termino = f => f.ms !== null && f.ms !== undefined;
    const porId = (a, b) => (String(a.id) < String(b.id) ? -1 : Number(String(a.id) > String(b.id)));
    const t = f => (Number.isFinite(f.t) ? f.t : 0);
    const av = f => (Number.isInteger(f.avance) ? f.avance : -1);
    const llegaron = filas.filter(termino).sort((a, b) => a.ms - b.ms || t(a) - t(b) || porId(a, b));
    const no = filas.filter(f => !termino(f)).sort((a, b) => av(b) - av(a) || porId(a, b));
    return llegaron.concat(no).map((f, i) => ({ ...f, lugar: i + 1, total: termino(f) ? puntosLugar(i + 1) : 0 }));
  }
  // Parrilla de salida de Karts (karts-salida-y-puntos): casilla `slot` a `atras` px detrás de la meta (filas de 2 a
  // 48 px, ≈ 1.7 karts; la 1.ª a 32 px) y a `lado` px del centro del camino (±24). Fija en píxeles: no depende del
  // tamaño de la pista ni de su muestreo; karts.html la convierte a muestras con el paso de la pista.
  const PARRILLA = { delante: 32, fila: 48, lado: 24 };
  const parrilla = slot => {
    const fila = Math.floor(slot / 2);
    return { fila, atras: PARRILLA.delante + fila * PARRILLA.fila, lado: slot % 2 ? PARRILLA.lado : -PARRILLA.lado };
  };
  function nombreMapa(juego, mapa) {
    if (juego === 'plataformas') { const [m] = String(mapa).split('-').map(Number); const mu = MUNDOS[m - 1]; return mu ? mu.emoji + ' ' + mu.nombre + ' · nivel ' + mapa : mapa; }
    const p = pistaPorId(mapa); return p ? p.emoji + ' ' + p.nombre : mapa;
  }
  // m:ss.d
  function formatoTiempo(ms) {
    if (ms === null || ms === undefined) return '—';
    const d = Math.floor(ms / 100), s = Math.floor(d / 10), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0') + '.' + (d % 10);
  }

  // Copa de karts: puntos por lugar (8 corredores).
  const PUNTOS_COPA = [15, 12, 10, 8, 6, 4, 2, 1];

  raiz.Arcade = {
    fnv, mulberry, rng,
    TILE, TRAMO, FILAS, VEL_AXO, NIVELES_POR_MUNDO, MUNDOS, MUNDOS_JUGABLES, tramosDe, esCastillo, anchoNivel, refPlataformas,
    VEL_KART, VUELTAS, PISTAS, pistaPorId, muestrearPista, vueltasDe, refKarts, limitesKarts, PUNTOS_COPA,
    LIMITE_SALA, MIN_SALA, limiteSala, GRACIA_SALA, BOTS_SALA, mapaDeSala, refDe, tiempoBot, puntosLugar, nombreMapa, formatoTiempo,
    podioCarrera, PARRILLA, parrilla, // karts-salida-y-puntos
    ritmoBots, // karts-copa-espacio
  };
})(typeof window !== 'undefined' ? window : globalThis);
