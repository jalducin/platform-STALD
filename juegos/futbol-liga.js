/* Reglas de liga y universo de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar). Sin DOM; requiere
   juegos/futbol-motor.js (azar con semilla, cartas y formaciones). Lo cargan juegos/futbol.html, las pruebas de Deno
   (server/futbol_liga_test.ts) y el script del universo (herramientas/generar-futbol.ts → juegos/datos/futbol.json).
   Todo es ficticio: clubes, ciudades, estadios y jugadores y jugadoras con nombres inventados (sin licencias).
   Carrera (Liga Master simplificada): solo se guardan tus resultados y referencias; la tabla se reconstruye con la
   semilla (design.md §9). */
(function (raiz) {
  'use strict';
  const M = raiz.FutbolMotor;
  const { rngDe, CARTAS, FORMACIONES } = M;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ================= Catálogos =================
  const FORMAS = ['escudo', 'circulo', 'diamante', 'hexagono'];
  const SIMBOLOS = ['estrella', 'rayo', 'corona', 'balon', 'montana', 'ola', 'sol', 'llama', 'ave', 'arbol'];
  const PATRONES = ['liso', 'rayas', 'aros', 'mitades', 'banda'];
  const COLORES = ['#b91c1c', '#ea580c', '#facc15', '#15803d', '#0d9488', '#0ea5e9', '#1d4ed8', '#6d28d9', '#db2777', '#111827', '#6b7280', '#f8fafc', '#7c2d12', '#a3e635', '#fbbf24', '#0c4a6e'];
  const POSICIONES = ['POR', 'DEF', 'MED', 'DEL'];
  const NOMBRE_POS = { POR: 'Portero', DEF: 'Defensa', MED: 'Medio', DEL: 'Delantero' };
  const LIGAS = [
    { id: 'volcan', nombre: 'Liga Volcán', division: 1, emoji: '🌋', d: 'Primera División' },
    { id: 'pacifico', nombre: 'Liga del Pacífico', division: 2, emoji: '🌊', d: 'Segunda División' },
    { id: 'norte', nombre: 'Liga Norte', division: 3, emoji: '🌵', d: 'Tercera División' },
  ];
  const COPA = { id: 'continental', nombre: 'Copa Continental de Clubes', trofeo: 'Sol de Oro', emoji: '🏆' };
  const NIVEL_DIV = [[72, 80], [64, 72], [56, 64]];
  // [nombre, siglas, ciudad, estadio, color 1, color 2, patrón, forma del escudo, símbolo]: todo inventado.
  const CLUBES_BASE = [
    ['Deportivo Tizal', 'TIZ', 'Tizal', 'Estadio Piedra Negra', '#b91c1c', '#111827', 'rayas', 'escudo', 'llama'],
    ['Atlético Brasa Roja', 'BRA', 'Brasa Roja', 'Coloso de Ceniza', '#ea580c', '#fff7ed', 'banda', 'circulo', 'sol'],
    ['Club Obsidiana', 'OBS', 'Obsidiana', 'Estadio Cristal Oscuro', '#111827', '#a78bfa', 'liso', 'diamante', 'estrella'],
    ['Unión Ceniza', 'CEN', 'Ceniza', 'Parque Gris', '#6b7280', '#f9fafb', 'aros', 'hexagono', 'montana'],
    ['Cráter Alto FC', 'CRA', 'Cráter Alto', 'Estadio del Cráter', '#7c2d12', '#fbbf24', 'mitades', 'escudo', 'montana'],
    ['Lava Norte SC', 'LAV', 'Lava Norte', 'Arena Magmática', '#dc2626', '#fde047', 'rayas', 'circulo', 'rayo'],
    ['Real Fumarola', 'FUM', 'Fumarola', 'Estadio Humo Blanco', '#f8fafc', '#0f172a', 'liso', 'escudo', 'corona'],
    ['Magma Club', 'MAG', 'Magma', 'La Caldera', '#9a3412', '#1c1917', 'banda', 'diamante', 'llama'],
    ['Marea Azul FC', 'MAR', 'Marea Azul', 'Estadio Malecón', '#1d4ed8', '#ffffff', 'rayas', 'circulo', 'ola'],
    ['Club Coral', 'COR', 'Coral', 'Arrecife Park', '#fb7185', '#0f766e', 'liso', 'hexagono', 'estrella'],
    ['Deportivo Bahía Clara', 'BAH', 'Bahía Clara', 'Estadio La Bahía', '#0ea5e9', '#fef3c7', 'mitades', 'escudo', 'sol'],
    ['Atlético Puerto Sal', 'PSA', 'Puerto Sal', 'Muelle Grande', '#f1f5f9', '#1e3a8a', 'aros', 'escudo', 'ave'],
    ['Playa Honda SC', 'PHO', 'Playa Honda', 'Estadio Arena Fina', '#facc15', '#1e40af', 'liso', 'circulo', 'sol'],
    ['Unión Arrecife', 'ARR', 'Arrecife', 'Parque Coralino', '#0d9488', '#f0fdfa', 'rayas', 'diamante', 'estrella'],
    ['Cabo Brisa FC', 'CAB', 'Cabo Brisa', 'Estadio Viento Sur', '#7dd3fc', '#0c4a6e', 'banda', 'escudo', 'ave'],
    ['Faro del Sur', 'FAR', 'Faro del Sur', 'El Faro', '#ef4444', '#ffffff', 'aros', 'hexagono', 'estrella'],
    ['Club Nopalera', 'NOP', 'Nopalera', 'Campo Nopal', '#15803d', '#fef9c3', 'liso', 'escudo', 'arbol'],
    ['Atlético Sierra Fría', 'SFR', 'Sierra Fría', 'Estadio Nevado', '#e0f2fe', '#1e3a8a', 'mitades', 'escudo', 'montana'],
    ['Deportivo Mezquite', 'MEZ', 'Mezquite', 'Unidad Mezquite', '#854d0e', '#fef3c7', 'rayas', 'circulo', 'arbol'],
    ['Unión Cantera', 'CAN', 'Cantera', 'Estadio La Cantera', '#a8a29e', '#1c1917', 'aros', 'hexagono', 'balon'],
    ['Llano Seco FC', 'LLS', 'Llano Seco', 'Campo del Llano', '#d97706', '#ffffff', 'liso', 'escudo', 'sol'],
    ['Barranca Azul', 'BAZ', 'Barranca', 'Estadio Barranca', '#1e40af', '#fbbf24', 'banda', 'circulo', 'rayo'],
    ['Cerro Pardo SC', 'CPA', 'Cerro Pardo', 'Parque del Cerro', '#78350f', '#a3e635', 'mitades', 'diamante', 'montana'],
    ['Desierto Dorado', 'DDO', 'Desierto Dorado', 'Estadio Duna', '#eab308', '#14532d', 'rayas', 'escudo', 'estrella'],
  ];
  const PORTEROS = [['#111827', '#22c55e'], ['#a3e635', '#111827'], ['#f97316', '#111827'], ['#7c3aed', '#fde047'], ['#0f172a', '#38bdf8'], ['#facc15', '#1f2937']];
  // Nombres de pila comunes y apellidos inventados por sílabas (ninguno es una persona real a propósito).
  const NOMBRES_F = ['Itzel', 'Ximena', 'Valeria', 'Camila', 'Renata', 'Sofía', 'Mariana', 'Fernanda', 'Daniela', 'Regina', 'Paola', 'Andrea', 'Lucía', 'Jimena', 'Natalia', 'Abril', 'Citlali', 'Yaretzi', 'Aitana', 'Amara', 'Noemí', 'Zoe', 'Elena', 'Inés', 'Brisa', 'Maya', 'Sara', 'Lía', 'Nayeli', 'Karina'];
  const NOMBRES_M = ['Diego', 'Mateo', 'Santiago', 'Emiliano', 'Leonardo', 'Sebastián', 'Iker', 'Joaquín', 'Rodrigo', 'Tadeo', 'Gael', 'Bruno', 'Julián', 'Andrés', 'Ángel', 'Martín', 'Óscar', 'Hugo', 'Nicolás', 'Pablo', 'Rafael', 'Tomás', 'Uriel', 'Elías', 'Iván', 'Axel', 'Omar', 'Kenji', 'Malik', 'Dante'];
  const SILABA_A = ['Al', 'Bar', 'Cor', 'Dur', 'Es', 'Fal', 'Gal', 'Har', 'Ib', 'Jar', 'Lan', 'Mar', 'Nor', 'Ol', 'Par', 'Quin', 'Ros', 'San', 'Tor', 'Ur', 'Val', 'Zam', 'Bel', 'Cal', 'Mon', 'Riv', 'Sol', 'Ver'];
  const SILABA_B = ['ado', 'eda', 'ino', 'ola', 'ura', 'ente', 'oza', 'illo', 'era', 'uz', 'ano', 'eño', 'iel', 'ar', 'és', 'ona', 'ate', 'ín'];
  const PLANTILLA = ['POR', 'POR', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL'];
  const NUMEROS = [1, 12, 2, 3, 4, 5, 6, 15, 8, 10, 14, 16, 18, 7, 9, 11];
  const CARTAS_POR_POS = { POR: ['felino'], DEF: ['muro', 'cabeza', 'pulmon'], MED: ['hueco', 'pulmon', 'regate', 'lejano'], DEL: ['lejano', 'regate', 'veloz', 'cabeza'] };
  const PERFILES = {
    POR: { por: 6, def: -22, vel: -12, pas: -16, tir: -32, reg: -26, fis: 0 },
    DEF: { def: 6, fis: 3, vel: -2, pas: -6, reg: -10, tir: -18, por: -45 },
    MED: { pas: 6, reg: 3, vel: 0, def: -8, tir: -4, fis: -1, por: -48 },
    DEL: { tir: 7, vel: 4, reg: 3, pas: -5, def: -22, fis: 0, por: -50 },
  };
  const PESOS = {
    POR: { por: 0.8, fis: 0.1, pas: 0.1 },
    DEF: { def: 0.45, fis: 0.2, vel: 0.15, pas: 0.1, reg: 0.1 },
    MED: { pas: 0.35, reg: 0.2, def: 0.1, vel: 0.15, tir: 0.1, fis: 0.1 },
    DEL: { tir: 0.4, vel: 0.2, reg: 0.2, pas: 0.1, fis: 0.1 },
  };
  const STATS = ['vel', 'pas', 'tir', 'def', 'fis', 'por', 'reg'];
  const PRECIO_OJEADOR = 300, PRECIO_CARTA = 800, MAX_PLANTILLA = 20, MIN_PLANTILLA = 14;
  const TU_CLUB = 24;

  // ================= Jugadores =================
  const elegir = (r, lista) => lista[Math.floor(r() * lista.length)];
  const apellido = r => elegir(r, SILABA_A) + elegir(r, SILABA_B);
  function jugador(r, pos, media) {
    const g = r() < 0.5 ? 'f' : 'm';
    const j = { nombre: elegir(r, g === 'f' ? NOMBRES_F : NOMBRES_M) + ' ' + apellido(r), pos, g, piel: Math.floor(r() * 4), pelo: Math.floor(r() * 4) };
    for (const k of STATS) j[k] = clamp(Math.round(media + (PERFILES[pos][k] || 0) + (r() - 0.5) * 8), 20, 99);
    return j;
  }
  function mediaJugador(j) {
    let m = 0;
    for (const [k, w] of Object.entries(PESOS[j.pos] || PESOS.MED)) m += j[k] * w;
    return Math.round(m);
  }
  // Mejor once para una formación: por puesto, el de más media de esa posición (si falta, el mejor que quede).
  function alinear(jugadores, formacion) {
    const libres = jugadores.map((j, i) => i), slots = FORMACIONES[formacion] || FORMACIONES['4-4-2'];
    const orden = (a, b) => mediaJugador(jugadores[b]) - mediaJugador(jugadores[a]) || a - b;
    const titulares = slots.map(([rol]) => {
      const mismos = libres.filter(i => jugadores[i].pos === rol).sort(orden);
      const elegido = mismos.length ? mismos[0] : libres.slice().sort(orden)[0];
      libres.splice(libres.indexOf(elegido), 1);
      return elegido;
    });
    return { titulares, banca: libres };
  }
  const fuerza = (jugadores, formacion) => { const t = alinear(jugadores, formacion || '4-4-2').titulares; return Math.round(t.reduce((a, i) => a + mediaJugador(jugadores[i]), 0) / t.length); };

  // ---- Jugadores generados de la carrera: id «g<n>», n = k·10000 + media·10 + posición ----
  const idGenerado = (k, media, pos) => 'g' + (k * 10000 + clamp(media, 30, 99) * 10 + POSICIONES.indexOf(pos));
  function jugadorGenerado(id) {
    const n = Number(id.slice(1)), k = Math.floor(n / 10000), media = Math.floor((n % 10000) / 10), pos = POSICIONES[n % 10] || 'MED';
    const j = jugador(rngDe('generado', k), pos, media);
    j.edad = 17 + (k % 16);
    j.carta = null; j.num = 0;
    return j;
  }
  function jugadorPorId(U, id) {
    if (id[0] === 'g') return jugadorGenerado(id);
    const [c, n] = id.slice(1).split('-').map(Number);
    return { ...U.clubes[c].jugadores[n] };
  }

  // ================= Universo (lo escribe herramientas/generar-futbol.ts) =================
  function generarClub(b, i) {
    const [nombre, corto, ciudad, estadio, c1, c2, patron, forma, simbolo] = b;
    const d = Math.floor(i / 8), r = rngDe('universo', corto);
    const [lo, hi] = NIVEL_DIV[d], nivel = lo + r() * (hi - lo);
    const usados = new Set(), jugadores = PLANTILLA.map((pos, k) => {
      const suplente = k === 1 || k === 7 || k === 12 || k === 15;
      let j;
      do { j = jugador(r, pos, nivel + (suplente ? -5 : 0) + (r() - 0.5) * 4); } while (usados.has(j.nombre));
      usados.add(j.nombre);
      return { num: NUMEROS[k], ...j, edad: 18 + Math.floor(r() * 17), carta: null };
    });
    darCartas(r, jugadores, 3 - d);
    const formacion = elegir(r, ['4-4-2', '4-4-2', '4-3-3', '4-3-3', '3-5-2', '5-3-2']);
    const gk = PORTEROS[i % PORTEROS.length];
    return {
      id: i, nombre, corto, ciudad, estadio, liga: LIGAS[d].id, formacion, fuerza: fuerza(jugadores, formacion),
      escudo: { forma, c1, c2, simbolo }, uniforme: { c1, c2, patron }, uniforme2: { c1: c2, c2: c1, patron: 'liso' }, portero: { c1: gk[0], c2: gk[1] },
      jugadores,
    };
  }
  function darCartas(r, jugadores, n) {
    const titulares = [0, 2, 3, 4, 5, 8, 9, 10, 11, 13, 14];
    for (let k = 0; k < n; k++) {
      const libres = titulares.filter(i => !jugadores[i].carta);
      const j = jugadores[elegir(r, libres)];
      j.carta = elegir(r, CARTAS_POR_POS[j.pos]);
    }
  }
  function generarUniverso() {
    const clubes = CLUBES_BASE.map(generarClub);
    return {
      version: 1, juego: 'Fútbol Estelar 2010',
      ligas: LIGAS.map((l, d) => ({ ...l, clubes: [0, 1, 2, 3, 4, 5, 6, 7].map(k => d * 8 + k) })),
      copa: COPA, clubes,
    };
  }

  // ================= Equipos para el motor =================
  // Colores parecidos (distancia RGB): el visitante usa su segundo uniforme.
  function chocan(a, b) {
    const n = h => [1, 3, 5].map(i => Number.parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [n(a), n(b)];
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 110;
  }
  function clubDe(U, idx, carrera) {
    if (idx !== TU_CLUB) return U.clubes[idx];
    const c = carrera.club;
    return {
      id: TU_CLUB, nombre: c.nombre, corto: c.corto, ciudad: '', estadio: c.estadio, liga: '', formacion: (carrera.tactica && carrera.tactica.formacion) || '4-4-2',
      escudo: c.escudo, uniforme: c.uniforme, uniforme2: { c1: c.uniforme.c2, c2: c.uniforme.c1, patron: 'liso' }, portero: { c1: '#111827', c2: '#22c55e' },
      jugadores: plantillaCompleta(U, carrera), propio: true,
    };
  }
  // opciones: { formacion, visitante } → { nombre, corto, uniforme, portero, escudo, formacion, jugadores (11 por puesto), banca }.
  function equipoMotor(U, idx, carrera, opciones = {}) {
    const club = clubDe(U, idx, carrera), formacion = opciones.formacion || club.formacion;
    const a = alinear(club.jugadores, formacion);
    return {
      id: idx, nombre: club.nombre, corto: club.corto, escudo: club.escudo, estadio: club.estadio, formacion,
      uniforme: opciones.visitante ? club.uniforme2 : club.uniforme, portero: club.portero,
      jugadores: a.titulares.map(i => ({ ...club.jugadores[i] })), banca: a.banca.map(i => ({ ...club.jugadores[i] })),
    };
  }
  const fuerzaClub = (U, idx, carrera) => (idx === TU_CLUB ? fuerza(plantillaCompleta(U, carrera)) : U.clubes[idx].fuerza);

  // ================= Calendario, resultados y tabla =================
  // Doble vuelta por el método del círculo: 2(n − 1) jornadas; en la vuelta se invierten local y visita.
  function calendario(n) {
    const eq = [...new Array(n).keys()], ida = [];
    for (let r = 0; r < n - 1; r++) {
      const jornada = [];
      for (let i = 0; i < n / 2; i++) { const a = eq[i], b = eq[n - 1 - i]; jornada.push(r % 2 === 0 ? [a, b] : [b, a]); }
      ida.push(jornada);
      eq.splice(1, 0, eq.pop());
    }
    return ida.concat(ida.map(j => j.map(([a, b]) => [b, a])));
  }
  function poisson(l, r) {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L && k < 9);
    return k - 1;
  }
  // Partido de la IA contra la IA sin jugarlo: goles con Poisson según la diferencia de fuerza (local con ventaja).
  function resultadoRapido(fa, fb, r) {
    const la = 1.1 * Math.exp((fa - fb) / 22) * 1.08, lb = 1.1 * Math.exp((fb - fa) / 22) * 0.95;
    return [Math.min(7, poisson(la, r)), Math.min(7, poisson(lb, r))];
  }
  const divisionDe = c => c.divisiones.findIndex(d => d.includes(TU_CLUB));
  function resultadoDe(U, c, d, j, a, b, fuerzas) {
    const clubes = c.divisiones[d];
    if (clubes[a] === TU_CLUB) return c.resultados[j].slice();
    if (clubes[b] === TU_CLUB) return c.resultados[j].slice().reverse();
    return resultadoRapido(fuerzas[a], fuerzas[b], rngDe(c.semilla, [c.temporada, d, j, clubes[a], clubes[b]].join('|')));
  }
  function sumar(f, gf, gc) {
    f.pj++; f.gf += gf; f.gc += gc; f.dg = f.gf - f.gc;
    if (gf > gc) { f.g++; f.pts += 3; } else if (gf === gc) { f.e++; f.pts += 1; } else f.p++;
  }
  // Tabla de una división con las jornadas jugadas (o la temporada completa con `todas`).
  function tablaDivision(U, c, d, todas) {
    const clubes = c.divisiones[d], cal = calendario(8), fuerzas = clubes.map(x => fuerzaClub(U, x, c));
    const filas = clubes.map(club => ({ club, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }));
    const jugadas = todas ? 14 : c.jornada;
    for (let j = 0; j < jugadas; j++) {
      for (const [a, b] of cal[j]) {
        const [ga, gb] = resultadoDe(U, c, d, j, a, b, fuerzas);
        sumar(filas[a], ga, gb); sumar(filas[b], gb, ga);
      }
    }
    return filas.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.club - y.club);
  }
  function rivalJornada(U, c) {
    const d = divisionDe(c), yo = c.divisiones[d].indexOf(TU_CLUB);
    const [a, b] = calendario(8)[c.jornada].find(m => m.includes(yo));
    return { club: c.divisiones[d][a === yo ? b : a], local: a === yo, division: d };
  }

  // ================= Carrera =================
  function nuevaCarrera(U, { club, semilla }) {
    const s = (Math.abs(Math.trunc(Number(semilla) || 1)) % 2147483646) + 1;
    const divisiones = U.ligas.map(l => l.clubes.slice()), norte = divisiones[2];
    let peor = 0;
    norte.forEach((x, k) => { if (U.clubes[x].fuerza < U.clubes[norte[peor]].fuerza) peor = k; });
    norte[peor] = TU_CLUB;
    const r = rngDe(s, 'plantilla'), base = (s % 6000) * 16 + 1;
    const plantilla = PLANTILLA.map((pos, k) => [idGenerado(base + k, Math.round(54 + r() * 6 - (k === 1 ? 4 : 0)), pos), 0, null]);
    return { semilla: s, club: { ...club }, temporada: 1, divisiones, jornada: 0, resultados: [], dinero: 1500, plantilla, cartas: [], ojeador: [], ojeadas: 0, copa: null, palmares: { ascensos: 0, ligas: 0, copas: 0 } };
  }
  // Plantilla con ajuste de media (crecimiento), carta propia o asignada, edad de la temporada y números sin repetir.
  function plantillaCompleta(U, c) {
    const usados = new Set();
    const lista = c.plantilla.map(([id, ajuste, carta]) => {
      const j = jugadorPorId(U, id);
      for (const k of STATS) if (k !== 'por' || j.pos === 'POR') j[k] = clamp(j[k] + ajuste, 20, 99);
      if (carta) j.carta = carta;
      j.edad += c.temporada - 1;
      j.id = id;
      return j;
    });
    for (const j of lista) { if (!j.num || usados.has(j.num)) j.num = 0; else usados.add(j.num); }
    let libre = 1;
    for (const j of lista.filter(x => !x.num)) {
      while (usados.has(libre)) libre++;
      j.num = libre;
      usados.add(libre);
    }
    return lista;
  }
  function premioPartido(gf, gc) {
    let p = 50;
    if (gf > gc) p = 300; else if (gf === gc) p = 120;
    return p + 20 * gf;
  }
  function registrarPartido(U, c, gf, gc) {
    const a = clamp(Math.round(gf) || 0, 0, 20), b = clamp(Math.round(gc) || 0, 0, 20);
    c.resultados.push([a, b]); c.jornada++;
    const premio = premioPartido(a, b);
    c.dinero = clamp(c.dinero + premio, 0, 9999999);
    return { premio };
  }
  function finTemporada(U, c) {
    const tablas = [0, 1, 2].map(d => tablaDivision(U, c, d, true)), d = divisionDe(c);
    const pos = tablas[d].findIndex(f => f.club === TU_CLUB) + 1;
    const res = { division: d, pos, campeon: pos === 1, ascenso: d > 0 && pos <= 2, descenso: d < 2 && pos >= 7, copa: d === 0 && pos <= 4, premio: (9 - pos) * 100, progreso: [] };
    if (res.campeon) { res.premio += 2000; c.palmares.ligas++; }
    if (res.ascenso) { res.premio += 1000; c.palmares.ascensos++; }
    c.divisiones = movimientos(c.divisiones, tablas);
    res.progreso = progresar(U, c);
    c.copa = res.copa ? { ronda: 0, viva: true } : null;
    c.temporada = Math.min(99, c.temporada + 1); c.jornada = 0; c.resultados = [];
    c.dinero = clamp(c.dinero + res.premio, 0, 9999999);
    return res;
  }
  // Ascensos y descensos: los 2 primeros suben y los 2 últimos bajan (también los clubes de la IA).
  function movimientos(divisiones, tablas) {
    const nuevas = divisiones.map(x => x.slice());
    for (let d = 0; d < 2; d++) {
      const bajan = tablas[d].slice(6).map(f => f.club), suben = tablas[d + 1].slice(0, 2).map(f => f.club);
      nuevas[d] = nuevas[d].map(x => (bajan.includes(x) ? suben[bajan.indexOf(x)] : x));
      nuevas[d + 1] = nuevas[d + 1].map(x => (suben.includes(x) ? bajan[suben.indexOf(x)] : x));
    }
    return nuevas;
  }
  // Progresión por edad al cerrar la temporada (los jóvenes crecen, los mayores bajan un poco).
  function progresar(U, c) {
    return c.plantilla.map(e => {
      const j = jugadorPorId(U, e[0]), edad = j.edad + c.temporada - 1, r = rngDe(c.semilla, 'prog|' + c.temporada + '|' + e[0]);
      let delta = 0;
      if (edad <= 21) delta = 2 + Math.floor(r() * 3);
      else if (edad <= 23) delta = 1 + Math.floor(r() * 3);
      else if (edad <= 28) delta = Math.floor(r() * 2);
      else if (edad >= 31) delta = -1 - Math.floor(r() * 2);
      const tope = 95 - mediaJugador(j);
      e[1] = clamp(e[1] + delta, -20, Math.min(20, tope));
      return delta;
    });
  }
  function precio(media, edad) {
    const base = Math.max(1, media - 40);
    let f = 1;
    if (edad < 24) f = 1.2; else if (edad > 30) f = 0.6;
    return Math.max(200, Math.round(base * base * 6 * f / 10) * 10);
  }
  const oferta = (U, id, factor = 1) => {
    const j = jugadorPorId(U, id);
    return { id, nombre: j.nombre, pos: j.pos, media: mediaJugador(j), edad: j.edad, carta: j.carta || null, precio: Math.round(precio(mediaJugador(j), j.edad) * factor / 10) * 10 };
  };
  // Mercado de la temporada: 5 de clubes de tu división o la de arriba y 3 libres (siempre los mismos esa temporada).
  function mercado(U, c) {
    const r = rngDe(c.semilla, 'mercado|' + c.temporada), d = divisionDe(c);
    const clubes = c.divisiones[Math.max(0, d - 1)].concat(c.divisiones[d]).filter(x => x !== TU_CLUB);
    const ids = [];
    while (ids.length < 5) { const id = 'u' + elegir(r, clubes) + '-' + Math.floor(r() * 16); if (!ids.includes(id)) ids.push(id); }
    for (let k = 0; k < 3; k++) ids.push(idGenerado(20000 + Math.floor(r() * 30000), NIVEL_DIV[d][0] + 1 + Math.floor(r() * 6), elegir(r, ['DEF', 'MED', 'DEL', 'DEL'])));
    return ids.filter(id => !c.plantilla.some(e => e[0] === id)).map(id => oferta(U, id));
  }
  function fichar(U, c, id, salida) {
    const deMercado = mercado(U, c).find(o => o.id === id), deOjeador = c.ojeador.includes(id) ? oferta(U, id, 0.6) : null;
    const o = deOjeador || deMercado;
    if (!o || c.plantilla.some(e => e[0] === id)) return { ok: false, error: 'no_disponible' };
    if (c.dinero < o.precio) return { ok: false, error: 'sin_dinero' };
    if (salida === null && c.plantilla.length >= MAX_PLANTILLA) return { ok: false, error: 'plantilla_llena' };
    if (salida !== null && !vender(U, c, salida)) return { ok: false, error: 'no_se_puede_vender' };
    c.plantilla.push([id, 0, null]);
    c.dinero -= o.precio;
    c.ojeador = c.ojeador.filter(x => x !== id);
    return { ok: true, precio: o.precio };
  }
  // Vender (o dejar ir) a un jugador: la mitad de su valor; siempre quedan 14 y al menos un portero.
  function vender(U, c, idx) {
    const e = c.plantilla[idx];
    if (!e || c.plantilla.length <= MIN_PLANTILLA) return false;
    const pc = plantillaCompleta(U, c);
    if (pc[idx].pos === 'POR' && pc.filter(j => j.pos === 'POR').length <= 1) return false;
    c.dinero = clamp(c.dinero + Math.round(precio(mediaJugador(pc[idx]), pc[idx].edad) / 20) * 10, 0, 9999999);
    c.plantilla.splice(idx, 1);
    return true;
  }
  // Ojeador: descubre 3 jóvenes (17–20) con buena media para tu división, más baratos (0.6×).
  function ojear(U, c) {
    if (c.dinero < PRECIO_OJEADOR) return { ok: false, error: 'sin_dinero' };
    const r = rngDe(c.semilla, 'ojeador|' + c.ojeadas), d = divisionDe(c);
    c.ojeador = [0, 1, 2].map(() => {
      const crudo = 50000 + Math.floor(r() * 49000), k = crudo - (crudo % 16) + Math.floor(r() * 4);
      return idGenerado(k, NIVEL_DIV[d][0] + 2 + Math.floor(r() * 6), elegir(r, ['DEF', 'MED', 'MED', 'DEL', 'DEL']));
    });
    c.ojeadas = Math.min(9999, c.ojeadas + 1);
    c.dinero -= PRECIO_OJEADOR;
    return { ok: true, jugadores: c.ojeador.map(id => oferta(U, id, 0.6)) };
  }
  function comprarCarta(c, id) {
    if (!M.CARTA[id] || c.cartas.includes(id)) return { ok: false, error: 'no_disponible' };
    if (c.dinero < PRECIO_CARTA) return { ok: false, error: 'sin_dinero' };
    c.cartas.push(id); c.dinero -= PRECIO_CARTA;
    return { ok: true };
  }
  // Una carta desbloqueada se asigna a un solo jugador (se mueve si ya la tenía otro); null la quita.
  function asignarCarta(c, idx, id) {
    if (!c.plantilla[idx] || (id !== null && !c.cartas.includes(id))) return { ok: false };
    if (id !== null) c.plantilla.forEach(e => { if (e[2] === id) e[2] = null; });
    c.plantilla[idx][2] = id;
    return { ok: true };
  }

  // ================= Torneos (Copa, Torneo local y la Copa de la carrera) =================
  const SEMBRADO = { 4: [0, 3, 1, 2], 8: [0, 7, 3, 4, 1, 6, 2, 5] };
  function barajar(lista, r) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
    return a;
  }
  // participantes: [{ club, humano?, fuerza? }] (4 u 8). Con `sembrado` el orden es por fuerza (1 vs 8…).
  function crearTorneo(U, participantes, semilla, sembrado) {
    const n = participantes.length, idx = [...new Array(n).keys()];
    const orden = sembrado ? SEMBRADO[n].map(k => idx[k]) : barajar(idx, rngDe(semilla, 'llave'));
    const r0 = [];
    for (let i = 0; i < n; i += 2) r0.push({ a: orden[i], b: orden[i + 1], ga: null, gb: null, pen: null, ganador: null });
    return {
      semilla: String(semilla), rondas: [r0], campeon: null,
      equipos: participantes.map(p => ({ club: p.club, humano: Number.isInteger(p.humano) ? p.humano : null, fuerza: p.fuerza || (p.club === TU_CLUB ? 60 : U.clubes[p.club].fuerza) })),
    };
  }
  const NOMBRE_RONDA = { 8: ['Cuartos de final', 'Semifinal', 'Final'], 4: ['Semifinal', 'Final'] };
  const nombreRonda = (t, r) => NOMBRE_RONDA[t.equipos.length][r] || 'Ronda ' + (r + 1);
  const conHumano = (t, m) => t.equipos[m.a].humano !== null || t.equipos[m.b].humano !== null;
  function siguientePartido(t) {
    if (t.campeon !== null) return null;
    const r = t.rondas.length - 1, k = t.rondas[r].findIndex(m => m.ganador === null && conHumano(t, m));
    return k < 0 ? null : { ronda: r, idx: k, ...t.rondas[r][k] };
  }
  function cerrar(m, ga, gb, pen) {
    m.ga = ga; m.gb = gb; m.pen = pen;
    if (ga > gb) m.ganador = m.a; else if (gb > ga) m.ganador = m.b; else m.ganador = pen === 0 ? m.a : m.b;
  }
  function avanzar(t) {
    const ronda = t.rondas[t.rondas.length - 1];
    if (ronda.some(m => m.ganador === null)) return;
    if (ronda.length === 1) { t.campeon = ronda[0].ganador; return; }
    const sig = [];
    for (let i = 0; i < ronda.length; i += 2) sig.push({ a: ronda[i].ganador, b: ronda[i + 1].ganador, ga: null, gb: null, pen: null, ganador: null });
    t.rondas.push(sig);
  }
  // Resuelve los partidos de la IA contra la IA hasta que toque uno con personas o haya campeón.
  function simularIA(U, t) {
    for (let vuelta = 0; vuelta < 4 && t.campeon === null; vuelta++) {
      const r = t.rondas.length - 1;
      t.rondas[r].forEach((m, k) => {
        if (m.ganador !== null || conHumano(t, m)) return;
        const rng = rngDe(t.semilla, 'ia|' + r + '|' + k), [ga, gb] = resultadoRapido(t.equipos[m.a].fuerza, t.equipos[m.b].fuerza, rng);
        const pen = rng() < 0.5 ? 0 : 1; // penales simulados si empatan
        cerrar(m, ga, gb, ga === gb ? pen : null);
      });
      avanzar(t);
      if (siguientePartido(t)) return;
    }
  }
  // Resultado del partido con personas que tocaba (pen: 0 si ganó el primero en penales, 1 si el segundo).
  function registrarTorneo(U, t, ga, gb, pen) {
    const s = siguientePartido(t);
    if (!s) return false;
    cerrar(t.rondas[s.ronda][s.idx], ga, gb, ga === gb ? pen : null);
    avanzar(t);
    return true;
  }
  // Copa del modo Copa: tu club y los 7 más fuertes del universo, sembrados por fuerza.
  function crearCopa(U, club, semilla, carrera) {
    const otros = U.clubes.map(c => c.id).filter(x => x !== club).sort((a, b) => U.clubes[b].fuerza - U.clubes[a].fuerza || a - b).slice(0, 7);
    const todos = [club, ...otros].map(x => ({ club: x, fuerza: fuerzaClub(U, x, carrera) })).sort((a, b) => b.fuerza - a.fuerza || a.club - b.club);
    return crearTorneo(U, todos.map(x => ({ ...x, humano: x.club === club ? 0 : null })), semilla, true);
  }
  // Copa de la carrera: tú y los 7 de Primera; se reconstruye con la semilla y tus rondas ganadas.
  function torneoCopaCarrera(U, c) {
    const otros = c.divisiones[0].filter(x => x !== TU_CLUB);
    const todos = [TU_CLUB, ...otros].map(x => ({ club: x, fuerza: fuerzaClub(U, x, c) })).sort((a, b) => b.fuerza - a.fuerza || a.club - b.club);
    const t = crearTorneo(U, todos.map(x => ({ ...x, humano: x.club === TU_CLUB ? 0 : null })), c.semilla + '|copa|' + c.temporada, true);
    simularIA(U, t);
    for (let r = 0; r < c.copa.ronda && siguientePartido(t); r++) {
      const s = siguientePartido(t), yoA = t.equipos[s.a].club === TU_CLUB;
      registrarTorneo(U, t, yoA ? 1 : 0, yoA ? 0 : 1, null);
      simularIA(U, t);
    }
    return t;
  }
  function rivalCopa(U, c) {
    const t = torneoCopaCarrera(U, c), s = siguientePartido(t);
    if (!s) return -1;
    return t.equipos[s.a].club === TU_CLUB ? t.equipos[s.b].club : t.equipos[s.a].club;
  }
  function registrarCopa(U, c, gano) {
    if (!c.copa) return { fin: true };
    if (!gano) { c.copa = null; return { eliminado: true }; }
    c.copa.ronda++;
    c.dinero = clamp(c.dinero + 400, 0, 9999999);
    if (c.copa.ronda < 3) return { ronda: c.copa.ronda };
    c.copa = null; c.palmares.copas++;
    c.dinero = clamp(c.dinero + 3000, 0, 9999999);
    return { campeon: true };
  }

  // ================= Puntos, semana y rival semanal =================
  const FACTOR = { facil: 0.6, medio: 1, dificil: 1.4, leyenda: 1.8 };
  function puntosPartido({ gf, gc, dificultad, clasificatoria }) {
    let base = 40;
    if (gf > gc) base = 300; else if (gf === gc) base = 120;
    const p = (base + 60 * Math.min(6, gf) - 20 * gc) * (FACTOR[dificultad] || 1) * (clasificatoria ? 1.2 : 1);
    return clamp(Math.round(p), 0, 1000);
  }
  function semanaISO(f) {
    const d = new Date(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const inicio = Date.UTC(d.getUTCFullYear(), 0, 1);
    return d.getUTCFullYear() + '-W' + String(Math.ceil(((d - inicio) / 86400000 + 1) / 7)).padStart(2, '0');
  }
  function rivalSemana(U, semana) {
    const r = rngDe('semana', semana), liga = U.ligas[0].clubes;
    return { semana, club: liga[Math.floor(r() * liga.length)], dificultad: 'dificil', formacion: elegir(r, Object.keys(FORMACIONES)) };
  }

  raiz.FutbolLiga = {
    FORMAS, SIMBOLOS, PATRONES, COLORES, POSICIONES, NOMBRE_POS, LIGAS, COPA, CLUBES_BASE, CARTAS, TU_CLUB,
    PRECIO_OJEADOR, PRECIO_CARTA, MAX_PLANTILLA, MIN_PLANTILLA,
    generarUniverso, jugador, mediaJugador, alinear, fuerza, jugadorPorId, idGenerado, chocan, clubDe, equipoMotor, fuerzaClub,
    calendario, resultadoRapido, tablaDivision, rivalJornada, divisionDe,
    nuevaCarrera, plantillaCompleta, registrarPartido, finTemporada, mercado, fichar, vender, ojear, comprarCarta, asignarCarta, precio,
    crearTorneo, siguientePartido, simularIA, registrarTorneo, nombreRonda, crearCopa, torneoCopaCarrera, rivalCopa, registrarCopa,
    puntosPartido, semanaISO, rivalSemana,
  };
})(typeof window !== 'undefined' ? window : globalThis);
