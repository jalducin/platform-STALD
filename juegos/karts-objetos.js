/* Ítems entre personas en sala de Karts (openspec: karts-objetos-en-sala). Script clásico sin DOM: lo cargan
   juegos/karts.html y las pruebas de Deno (server/karts_objetos_test.ts).
   Regla «la víctima decide»: cada aparato manda solo sobre su kart. Quien usa un ítem manda el evento `item` y crea su
   objeto con ese mismo evento; cada aparato simula el objeto igual (paso fijo de 1/60 s desde la hora de la carrera
   del evento) y revisa los golpes solo contra su kart. Aquí viven las partes puras: tablas de ítems, codificación de
   los eventos, registro anti-abuso, simulación, choque, historial del avance (rayo) y gracia. */
(function (raiz) {
  'use strict';
  const TIPOS = ['cascara', 'bola', 'cohete', 'rayo']; // los que viajan por el canal (los demás son solo de tu kart)
  const DT = 1 / 60, PASO_MS = 1000 / 60;
  const VIEJO_MS = 4000; // eventos de más de 4 s de la carrera se descartan
  const POR_SEG = 1; // ítems por segundo por persona
  const GRACIA_MS = 4000; // tras un golpe de ítem en sala, 4 s sin recibir otro
  const GIRO_S = 0.9; // lo que dura el giro de un golpe (golpear() en karts.html)
  const MAX_SALA = 8; // personas por sala

  // ---------- Tablas por lugar (r = 0 primer lugar … 1 último) ----------
  // solo: la de siempre. vivo: igual por lugar, un poco más suave (menos cohetes y rayos, más turbo y estrella atrás).
  // respaldo (sala sin canal en vivo): la reducida de siempre, sin objetos entre personas.
  function tablaItems(r, modo) {
    if (modo === 'respaldo') return r < 0.5 ? { monedas: 50, turbo: 40, estrella: 10 } : { turbo: 55, estrella: 30, monedas: 15 };
    if (modo === 'vivo') {
      if (r <= 0.01) return { cascara: 40, bola: 20, monedas: 40 };
      if (r < 0.4) return { cascara: 25, bola: 25, monedas: 20, turbo: 25, cohete: 5 };
      if (r < 0.75) return { bola: 15, turbo: 40, cohete: 20, estrella: 15, monedas: 10 };
      return { turbo: 35, cohete: 25, estrella: 30, rayo: 10 };
    }
    if (r <= 0.01) return { cascara: 45, bola: 25, monedas: 30 };
    if (r < 0.4) return { cascara: 25, bola: 30, monedas: 15, turbo: 25, cohete: 5 };
    if (r < 0.75) return { bola: 15, turbo: 35, cohete: 30, estrella: 10, monedas: 10 };
    return { turbo: 30, cohete: 30, estrella: 25, rayo: 15 };
  }
  function sortear(tabla, azar) {
    const total = Object.values(tabla).reduce((a, b) => a + b, 0);
    let x = azar() * total;
    for (const [it, p] of Object.entries(tabla)) { x -= p; if (x <= 0) return it; }
    return Object.keys(tabla).at(-1) || 'turbo';
  }

  // ---------- Eventos: solo números ----------
  // item: [n, tipo, x·10, y·10, ángulo·1000, vel, vuelta, idx, tc, avance, blanco, carrera]
  // item-golpe: [n del dueño, índice del dueño en la sala, carrera]
  const entero = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  function codificar(e) {
    return [e.n, TIPOS.indexOf(e.tipo), Math.round(e.x * 10), Math.round(e.y * 10), Math.round(e.ang * 1000), Math.round(e.vel),
      e.vuelta, e.idx, Math.round(e.tc), Math.round(e.avance), e.blanco, e.carrera];
  }
  function decodificar(d) {
    if (!Array.isArray(d) || d.length !== 12 || !d.every(x => typeof x === 'number' && Number.isFinite(x))) return null;
    const [n, t, x, y, ang, vel, vuelta, idx, tc, avance, blanco, carrera] = d;
    if (!entero(n, 1, 1e6) || !entero(t, 0, TIPOS.length - 1) || !entero(vuelta, -1, 50) || !entero(idx, 0, 1e5) || !entero(tc, 0, 36e5) ||
      !entero(blanco, -1, MAX_SALA - 1) || !entero(carrera, 0, 20) || Math.abs(x) > 1e7 || Math.abs(y) > 1e7 || Math.abs(vel) > 5000 || Math.abs(avance) > 1e7) return null;
    return { n, tipo: TIPOS[t], x: x / 10, y: y / 10, ang: ang / 1000, vel, vuelta, idx, tc, avance, blanco, carrera };
  }
  const codificarGolpe = e => [e.n, e.dueno, e.carrera];
  function decodificarGolpe(d) {
    if (!Array.isArray(d) || d.length !== 3 || !entero(d[0], 1, 1e6) || !entero(d[1], 0, MAX_SALA - 1) || !entero(d[2], 0, 20)) return null;
    return { n: d[0], dueno: d[1], carrera: d[2] };
  }
  const idDe = (de, n) => de + ':' + n;

  // ---------- Anti-abuso (uno por carrera) ----------
  function registro(o = {}) {
    const viejoMs = o.viejoMs ?? VIEJO_MS, minMs = 1000 / (o.porSeg ?? POR_SEG);
    const vistos = new Set(), retirados = new Set(), duenos = new Map();
    const st = { ok: 0, repetido: 0, rapido: 0, viejo: 0 };
    const res = r => { st[r]++; return r; };
    return {
      // 'ok' | 'repetido' (id visto o ya retirado) | 'viejo' (más de 4 s o número viejo) | 'rapido' (< 1 s del anterior)
      aceptar(de, e, ahoraTc) {
        const id = idDe(de, e.n), p = duenos.get(de);
        if (vistos.has(id) || retirados.has(id)) return res('repetido');
        if (ahoraTc - e.tc > viejoMs || (p && e.n <= p.n)) return res('viejo');
        if (p && e.tc - p.tc < minMs) return res('rapido');
        vistos.add(id); duenos.set(de, { n: e.n, tc: e.tc });
        return res('ok');
      },
      retirar(id) { retirados.add(id); },
      retirado: id => retirados.has(id),
      stats: () => ({ ...st }),
    };
  }
  const puedeUsar = (ultimoTc, ahoraTc) => ultimoTc === null || ahoraTc - ultimoTc >= 1000 / POR_SEG;
  const enGracia = (desde, ahoraTc) => desde !== null && ahoraTc - desde < GRACIA_MS;
  // Peor caso con golpes cada vez que acaba la gracia: el giro (casi detenido) más recuperar la velocidad (la mitad del
  // tiempo de acelerar de 0 a la punta) se pierden en cada ciclo de GRACIA_MS. Devuelve el factor del tiempo.
  function factorPeorCaso(velKart, acel) {
    const perdido = GIRO_S + velKart / acel / 2;
    return 1 / (1 - perdido / (GRACIA_MS / 1000));
  }

  // ---------- Geometría y simulación determinista ----------
  function geometria(pista, M, velKart) {
    const pts = M.pts, n = pts.length;
    return {
      pts, n, mitad: pista.mitad, velKart, paso: M.paso || 8,
      punto(i, lado) { const p = pts[((i % n) + n) % n]; return { x: p.x - Math.sin(p.a) * lado, y: p.y + Math.cos(p.a) * lado }; },
    };
  }
  function masCercano(geo, x, y) {
    let mi = 0, md = Infinity;
    for (let i = 0; i < geo.n; i += 2) { const p = geo.pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < md) { md = d; mi = i; } }
    return { i: mi, d: Math.sqrt(md) };
  }
  const distanciaCamino = (geo, x, y) => masCercano(geo, x, y).d;
  // Objeto desde el evento (null para el rayo, que no deja objeto). `dueno` = id de quien lo usó.
  function crear(e, geo, dueno) {
    const fx = Math.cos(e.ang), fy = Math.sin(e.ang);
    const base = { tipo: e.tipo, dueno, blanco: e.blanco, tc0: e.tc, pasos: 0 };
    if (e.tipo === 'cascara') return { ...base, x: e.x - fx * 18, y: e.y - fy * 18, r: 7, t: 0.5, vida: 40 };
    if (e.tipo === 'bola') return { ...base, x: e.x + fx * 16, y: e.y + fy * 16, vx: fx * (e.vel + 200), vy: fy * (e.vel + 200), r: 6, t: 0.3, vida: 3 };
    if (e.tipo === 'cohete') return { ...base, x: e.x, y: e.y, idx: e.idx, vuelta: e.vuelta, r: 6, t: 0.3, vida: 8, carril: 0 };
    return null;
  }
  // La bola rebota contra el borde del camino (hasta que se le acaba la vida).
  function moverBola(o, dt, geo) {
    o.x += o.vx * dt; o.y += o.vy * dt;
    const c = masCercano(geo, o.x, o.y);
    if (c.d > geo.mitad) {
      const p = geo.pts[c.i], nx = o.x - p.x, ny = o.y - p.y, l = Math.hypot(nx, ny) || 1, dot = (o.vx * nx + o.vy * ny) / l;
      if (dot > 0) { o.vx -= 2 * dot * nx / l; o.vy -= 2 * dot * ny / l; }
    }
  }
  // El cohete avanza por la pista a 1.7× la velocidad del kart y se cierra al carril de su blanco (lateral o null).
  function moverCohete(o, dt, geo, lateral) {
    o.idx += geo.velKart * 1.7 * dt / geo.paso;
    if (o.idx >= geo.n) { o.idx -= geo.n; o.vuelta++; }
    if (lateral !== null && lateral !== undefined) o.carril += (lateral - o.carril) * Math.min(1, dt * 4);
    const p = geo.punto(Math.floor(o.idx), o.carril); o.x = p.x; o.y = p.y;
  }
  // Avanza el objeto en pasos fijos hasta la hora `hastaTc` (ms de la carrera). lateralBlanco() da el carril del blanco
  // (o null). Mismo evento + misma hora = mismo lugar, sin importar cada cuánto se llame.
  function avanzar(o, geo, hastaTc, lateralBlanco) {
    while (o.vida > 0 && o.tc0 + (o.pasos + 1) * PASO_MS <= hastaTc) {
      o.pasos++;
      o.t = Math.max(0, o.t - DT); o.vida -= DT;
      if (o.tipo === 'bola') moverBola(o, DT, geo);
      else if (o.tipo === 'cohete') moverCohete(o, DT, geo, o.blanco >= 0 ? lateralBlanco() : null);
    }
    return o;
  }
  // ¿El objeto le pega a tu kart (en x, y)? El cohete con blanco solo a su blanco; el dueño es inmune al soltarlo.
  function toca(o, x, y, miIndice, miId) {
    if (o.vida <= 0 || (o.dueno === miId && o.t > 0)) return false;
    if (o.tipo === 'cohete' && o.blanco >= 0 && o.blanco !== miIndice) return false;
    return (x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + 9) ** 2;
  }

  // ---------- Rayo: tu avance a la hora del evento ----------
  function historial(maxMs = 5000) {
    const xs = []; // [tc, avance] en orden
    return {
      agregar(tc, avance) {
        xs.push([tc, avance]);
        while (xs.length && xs[0][0] < tc - maxMs) xs.shift();
      },
      en(tc) { // la muestra anterior más cercana (null si es más vieja que el historial)
        for (let k = xs.length - 1; k >= 0; k--) if (xs[k][0] <= tc) return xs[k][1];
        return null;
      },
      vaciar() { xs.length = 0; },
    };
  }
  const rayoAfecta = (miAvance, avanceUsuario) => miAvance !== null && miAvance > avanceUsuario;

  raiz.KartsObjetos = {
    TIPOS, VIEJO_MS, POR_SEG, GRACIA_MS, tablaItems, sortear, codificar, decodificar, codificarGolpe, decodificarGolpe, idDe,
    registro, puedeUsar, enGracia, factorPeorCaso, geometria, distanciaCamino, crear, moverBola, moverCohete, avanzar, toca,
    historial, rayoAfecta,
  };
})(typeof window !== 'undefined' ? window : globalThis);
