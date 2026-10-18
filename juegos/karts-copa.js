/* Copa completa de Karts en sala (openspec: karts-copa-en-sala). Reglas compartidas, sin DOM: las cargan juegos.html
   (la página de la sala), el servidor (server/karts_copa.ts) y las pruebas de Deno. Requiere juegos/karts-pistas.js y
   juegos/arcade.js antes.
   La sala corre las 4 carreras de la copa seguidas. Cada persona manda el resultado de cada carrera
   (`jugador.copa` = [{ k, ms, monedas, t, abandono? }]); con eso y la hora de inicio de la sala, el calendario es el mismo
   en el servidor y en cada aparato:
   - carrera 0: empieza en `sala.inicio`;
   - karts-copa-sala-4: en TODAS las carreras cuentan todas las personas de la sala (antes, desde la 2.ª solo quien
     reportó la anterior: perder un reporte te sacaba del resto de la copa);
   - la carrera k cierra (KartsCopa.cierreCarrera) cuando todas la reportaron (a la hora del último reporte), a los
     PLAZO_MS (45 s, karts-plazo-45) de la primera llegada o, si nadie llega, al vencer su límite + la gracia (quien no llegó: NT,
     0 puntos, ordenado por su avance);
   - la siguiente empieza INTERPODIO_MS después del cierre (tabla entre carreras con cuenta regresiva).
   Puntos por lugar como en el modo individual (15, 12, 10, 8, 6, 4, 2, 1); no terminar = 0. Los bots corren con su
   tiempo simulado de cada pista. Al final, puntos de ranking por el lugar en la tabla de la copa: 4 × Arcade.puntosLugar
   (2000, 1760, 1520…; tope 2000; 0 sin puntos de copa) — karts-salida-y-puntos. */
(function (raiz) {
  'use strict';
  const A = raiz.Arcade, KP = raiz.KartsPistas;
  // karts-copa-espacio: las copas de sala salen de KartsPistas.COPAS en orden de dificultad (`nivel`), más la mixta.
  const ORDEN = KP.copasOrdenadas();
  const COPAS_SALA = [...ORDEN.map(c => c.id), 'mixta'];
  const CARRERAS = 4; // todas las copas tienen 4 pistas; el calendario usa pistasDe(…).length (karts-copa-sala-4)
  const INTERPODIO_MS = 10000; // tabla entre carreras (incluye los 3 s de cuenta regresiva del juego)
  const PLAZO_MS = 45000; // karts-copa-sala-4 + karts-plazo-45: tras la primera llegada, las demás tienen 45 s para terminar
  const TOPE_RANKING = 2000; // igual que el tope de Karts en el catálogo (server/juegos.ts)
  const NOMBRE = { ...Object.fromEntries(ORDEN.map(c => [c.id, c.nombre])), mixta: 'Copa mixta' };
  const EMOJI = { ...Object.fromEntries(ORDEN.map(c => [c.id, c.emoji])), mixta: '🎲' };
  const MIXTA = ['fiesta', 'mesoamerica']; // karts-copa-espacio: la mixta sigue tomando 2 y 2 de estas dos (por id)

  // Pistas de la copa. La mixta: 2 de cada copa, al azar con la semilla de la sala (la revancha sortea otras).
  function pistasDe(copa, seed) {
    if (copa !== 'mixta') return KP.copaPorId(copa).pistas.slice();
    const r = A.rng(seed, 'copa-mixta');
    const toma = l => { const x = l.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x.slice(0, 2); };
    const out = [...toma(KP.copaPorId(MIXTA[0]).pistas), ...toma(KP.copaPorId(MIXTA[1]).pistas)];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const esCopa = sala => !!sala && sala.juego === 'karts' && !!sala.opciones && sala.opciones.modo === 'copa';
  const reporte = (j, k) => (Array.isArray(j.copa) ? j.copa.find(x => x.k === k) : null) || null;

  // karts-copa-sala-4: cierre de una carrera de sala (copa o suelta), igual en la página y en el servidor.
  //   inicio y limite (ms), reportes = [{ t (hora del servidor), ms (null = no terminó) }] (el primero de cada persona),
  //   total = personas de la sala. Devuelve { cierre (null = abierta), plazo (null = nadie ha llegado) }.
  //   Cierra: todas reportaron → hora del último reporte; si no, al vencer el plazo (1.ª llegada + PLAZO_MS); si no, al
  //   límite + la gracia. No depende del número de vueltas.
  function cierreCarrera(c, ahora) {
    const reps = (c.reportes || []).filter(Boolean);
    const llegadas = reps.filter(r => r.ms !== null && r.ms !== undefined).map(r => r.t);
    const plazo = llegadas.length ? Math.min(...llegadas) + PLAZO_MS : null;
    const vence = c.inicio + c.limite + A.GRACIA_SALA;
    let cierre = null;
    if (c.total > 0 && reps.length >= c.total) cierre = Math.max(c.inicio, ...reps.map(r => r.t));
    if (plazo !== null && ahora >= plazo && (cierre === null || plazo < cierre)) cierre = plazo;
    if (cierre === null && ahora >= vence) cierre = vence;
    return { cierre, plazo };
  }
  // Calendario: [{ k, pista, inicio, limite, cierre (null = abierta), plazo, esperados }] hasta la carrera en curso.
  // karts-copa-sala-4: `esperados` = todas las personas de la sala en cada carrera.
  function calendario(sala, jugadores, ahora) {
    const pistas = pistasDe(sala.opciones.copa, sala.seed), out = [];
    const esperados = jugadores.map(j => j.id);
    let inicio = sala.inicio;
    for (let k = 0; k < pistas.length && inicio !== null; k++) {
      const pista = pistas[k], limite = A.limiteSala('karts', pista);
      const { cierre, plazo } = cierreCarrera({ inicio, limite, total: jugadores.length, reportes: jugadores.map(j => reporte(j, k)) }, ahora);
      out.push({ k, pista, inicio, limite, cierre, plazo, esperados });
      inicio = cierre === null ? null : cierre + INTERPODIO_MS;
    }
    return out;
  }
  // Participantes: personas de la sala y, con bots, los que completan 3 lugares (Arcade.BOTS_SALA, como la página).
  function participantesCopa(sala, jugadores) {
    const nb = sala.bots ? Math.max(0, 3 - Math.min(jugadores.length, 8)) : 0;
    return jugadores.map(j => ({ id: j.id, nombre: j.nombre, bot: false }))
      .concat(A.BOTS_SALA.slice(0, nb).map(b => ({ id: b.id, nombre: b.nombre, bot: true })));
  }
  // Resultado de la carrera k ya cerrada: filas { id, ms (null = no terminó), lugar, pts } en orden de llegada (el mismo
  // orden que una carrera suelta: Arcade.podioCarrera; karts-salida-y-puntos).
  function resultadoCarrera(sala, jugadores, c) {
    const filas = participantesCopa(sala, jugadores).map(p => {
      if (p.bot) return { id: p.id, ms: A.tiempoBot('karts', c.pista, sala.seed, p.id) };
      const r = reporte(jugadores.find(j => j.id === p.id), c.k);
      if (r && !r.abandono && r.ms !== null && r.t <= c.cierre) return { id: p.id, ms: r.ms, t: r.t };
      return r && Number.isInteger(r.avance) && r.t <= c.cierre ? { id: p.id, ms: null, avance: r.avance } : { id: p.id, ms: null }; // karts-copa-sala-4: NT por avance
    });
    return A.podioCarrera(filas).map((f, i) => f.ms === null ? { id: f.id, ms: null, lugar: null, pts: 0 } : { id: f.id, ms: f.ms, lugar: i + 1, pts: A.PUNTOS_COPA[i] || 0 });
  }
  // karts-salida-y-puntos: puntos de partida por el lugar final en la copa (4 × los de una carrera, tope 2000; 0 si no
  // sumó puntos de copa). Así siempre van en el orden de la tabla (con la suma por carrera podían quedar al revés).
  const rankingCopa = (lugar, pts) => (pts > 0 ? Math.min(TOPE_RANKING, CARRERAS * A.puntosLugar(lugar)) : 0);
  // Estado completo de la copa a la hora `ahora`.
  //   fase: 'espera' (antes de empezar), 'carrera' (la k está abierta), 'interpodio' (la k cerró y la k+1 aún no
  //   empieza) o 'final'; carrera = k en curso o la última cerrada; inicioSig = hora de inicio de la siguiente.
  //   tabla: participantes por puntos acumulados (desempate: tiempo total, no terminar = el límite) con sus puntos por
  //   carrera y sus puntos de ranking (tope 2000).
  function estado(sala, jugadores, ahora) {
    const cal = sala.inicio === null ? [] : calendario(sala, jugadores, ahora);
    const cerradas = cal.filter(c => c.cierre !== null);
    const resultados = cerradas.map(c => resultadoCarrera(sala, jugadores, c));
    const tabla = participantesCopa(sala, jugadores).map(p => {
      const por = resultados.map(r => r.find(f => f.id === p.id));
      return { id: p.id, nombre: p.nombre, bot: p.bot, pts: por.reduce((a, f) => a + f.pts, 0),
        tiempo: por.reduce((a, f, i) => a + (f.ms === null ? cerradas[i].limite : f.ms), 0), porCarrera: por.map(f => ({ ms: f.ms, lugar: f.lugar, pts: f.pts })) };
    }).sort((a, b) => b.pts - a.pts || a.tiempo - b.tiempo || a.nombre.localeCompare(b.nombre, 'es-MX'));
    tabla.forEach((t, i) => { t.ranking = rankingCopa(i + 1, t.pts); });
    let fase = 'espera', carrera = 0, inicioSig = null;
    const ultima = cal[cal.length - 1];
    if (ultima) {
      carrera = ultima.k;
      if (ultima.cierre === null) fase = ahora < ultima.inicio ? 'interpodio' : 'carrera';
      else if (ultima.k === pistasDe(sala.opciones.copa, sala.seed).length - 1) fase = 'final'; // karts-copa-sala-4: podio solo al final
      else { fase = 'interpodio'; carrera = ultima.k + 1; inicioSig = ultima.cierre + INTERPODIO_MS; }
      if (fase === 'interpodio' && ultima.cierre === null) inicioSig = ultima.inicio; // la que sigue ya tiene hora
    }
    const pistas = pistasDe(sala.opciones.copa, sala.seed);
    return { copa: sala.opciones.copa, nombre: NOMBRE[sala.opciones.copa], pistas, fase, carrera, inicioSig, calendario: cal, resultados, tabla };
  }
  // La carrera que una persona puede reportar a la hora `ahora`: la abierta y ya empezada; si no hay, null.
  function carreraAbierta(sala, jugadores, ahora) {
    const cal = calendario(sala, jugadores, ahora), c = cal[cal.length - 1];
    return c && c.cierre === null && ahora >= c.inicio ? c : null;
  }

  raiz.KartsCopa = { COPAS_SALA, CARRERAS, INTERPODIO_MS, PLAZO_MS, cierreCarrera, // karts-copa-sala-4
    TOPE_RANKING, NOMBRE, EMOJI, pistasDe, esCopa, reporte, calendario, participantesCopa, resultadoCarrera, estado, carreraAbierta };
})(typeof window !== 'undefined' ? window : globalThis);
