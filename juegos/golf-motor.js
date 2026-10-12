/* Motor de «⛳ Golf» (openspec: golf). Sin DOM; requiere juegos/fisica.js. Determinista: solo + − * / y Math.sqrt en
   la simulación, paso fijo de 1/240 s, obstáculos que dependen del `reloj` (subpasos, entero) y estado redondeado tras
   cada tiro, para que la sala de 2 a 4 personas se reproduzca igual en todos los aparatos. Lo usan juegos/golf.html y
   las pruebas de Deno (server/golf_motor_test.ts). Decisiones en openspec/changes/golf/design.md. */
(function (raiz) {
  'use strict';
  const F = raiz.Fisica;
  const R = 6, HOYO_R = 11, CAPTURA = 320, ATRAE_R = 22, ATRAE = 350;
  const SUB = 4, PASOS_SEG = 240, DT = 1 / PASOS_SEG;
  const FRICCION = { pasto: 150, arena: 700 }, PARA = 5, ESTATICA = 200;
  const E_PARED = 0.78, E_TANG = 0.98;
  const MAX_PASOS = PASOS_SEG * 25, ATASCO = 120;
  const velocidad = f => 30 + 6.9 * f; // fuerza 1–100 → 37–720 u/s
  const limite = par => par + 4;

  // ---------- Los 9 hoyos (hechos a mano; de menor a mayor dificultad) ----------
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const HOYOS = [
    { n: 1, nombre: 'Primer tiro', par: 2, ancho: 300, alto: 560, salida: { x: 150, y: 490 }, hoyo: { x: 150, y: 110 },
      borde: [[40, 0], [260, 0], [300, 40], [300, 520], [260, 560], [40, 560], [0, 520], [0, 40]], muros: [], zonas: [], portales: [], moviles: [],
      ayuda: 'Jala hacia atrás, mira la línea y toca GOLPEAR. ¡Derecho al hoyo!' },
    { n: 2, nombre: 'La curva', par: 2, ancho: 400, alto: 620, salida: { x: 75, y: 560 }, hoyo: { x: 320, y: 72 },
      borde: [[0, 140], [140, 0], [400, 0], [400, 190], [150, 190], [150, 620], [0, 620]], muros: [], zonas: [], portales: [], moviles: [],
      ayuda: 'Tira derecho hacia arriba: la banda diagonal manda la pelota hacia el hoyo.' },
    { n: 3, nombre: 'El arenero', par: 3, ancho: 340, alto: 660, salida: { x: 170, y: 600 }, hoyo: { x: 240, y: 100 },
      borde: [[0, 30], [30, 0], [310, 0], [340, 30], [340, 660], [0, 660]], muros: [],
      zonas: [{ tipo: 'arena', rect: [0, 280, 250, 110] }, { tipo: 'arena', circ: [140, 120, 40] }, { tipo: 'arena', circ: [290, 470, 28] }],
      portales: [], moviles: [], ayuda: 'La arena frena mucho: rodéala por el carril de pasto o pégale más fuerte.' },
    { n: 4, nombre: 'La loma', par: 3, ancho: 360, alto: 700, salida: { x: 180, y: 640 }, hoyo: { x: 180, y: 90 },
      borde: rect(0, 0, 360, 700), muros: [],
      zonas: [{ tipo: 'pendiente', rect: [0, 250, 360, 200], ax: 190, ay: 0 }, { tipo: 'pendiente', rect: [110, 150, 140, 50], ax: 0, ay: 240 }],
      portales: [], moviles: [], ayuda: 'La loma empuja a la derecha: apunta un poco a la izquierda. La rampa regresa las pelotas lentas.' },
    { n: 5, nombre: 'El lago', par: 3, ancho: 360, alto: 720, salida: { x: 80, y: 650 }, hoyo: { x: 100, y: 100 },
      borde: rect(0, 0, 360, 720), muros: [],
      zonas: [{ tipo: 'agua', rect: [0, 300, 230, 130] }, { tipo: 'agua', rect: [300, 300, 60, 130] }, { tipo: 'arena', circ: [210, 140, 32] }],
      portales: [], moviles: [], ayuda: 'Cruza por el puente. Si cae al agua, regresa a donde tiraste con un golpe de castigo.' },
    { n: 6, nombre: 'El molino', par: 3, ancho: 340, alto: 760, salida: { x: 170, y: 690 }, hoyo: { x: 170, y: 110 },
      borde: rect(0, 0, 340, 760), muros: [rect(0, 330, 145, 70), rect(195, 330, 145, 70)],
      zonas: [{ tipo: 'arena', circ: [70, 150, 34] }, { tipo: 'arena', circ: [270, 150, 34] }],
      portales: [], moviles: [{ tipo: 'molino', cx: 170, cy: 352, largo: 58, puerta: [145, 400, 195, 400], periodo: 960 }],
      ayuda: 'Cuando un aspa tapa la puerta, la pelota rebota. ¡Tira cuando esté libre!' },
    { n: 7, nombre: 'Túnel mágico', par: 3, ancho: 380, alto: 760, salida: { x: 290, y: 690 }, hoyo: { x: 90, y: 650 },
      borde: rect(0, 0, 380, 760), muros: [rect(180, 170, 20, 590)],
      zonas: [{ tipo: 'arena', circ: [290, 240, 38] }, { tipo: 'arena', circ: [90, 200, 34] }],
      portales: [{ de: { x: 290, y: 430, r: 16 }, a: { x: 90, y: 300 }, dir: 900 }], moviles: [],
      ayuda: 'El portal morado te lleva al otro lado, cerca del hoyo. Si fallas, toca el camino largo.' },
    { n: 8, nombre: 'La compuerta', par: 4, ancho: 380, alto: 820, salida: { x: 120, y: 760 }, hoyo: { x: 300, y: 100 },
      borde: [[0, 0], [260, 0], [380, 120], [380, 820], [0, 820]], muros: [rect(0, 560, 250, 20), rect(130, 280, 250, 20)],
      zonas: [{ tipo: 'arena', rect: [190, 380, 190, 90] }],
      portales: [], moviles: [{ tipo: 'compuerta', x0: 250, x1: 330, y: 560, w: 50, h: 20, periodo: 720 }],
      ayuda: 'Zigzag: pasa junto a la compuerta que va y viene, luego por la izquierda y usa la banda.' },
    { n: 9, nombre: 'Gran final', par: 5, ancho: 420, alto: 1000, salida: { x: 360, y: 940 }, hoyo: { x: 210, y: 90 },
      borde: [[0, 80], [80, 0], [340, 0], [420, 80], [420, 1000], [0, 1000]], muros: [rect(0, 270, 185, 50), rect(235, 270, 185, 50)],
      zonas: [{ tipo: 'agua', rect: [0, 520, 300, 120] }, { tipo: 'pendiente', rect: [0, 760, 420, 120], ax: -170, ay: 0 },
        { tipo: 'arena', circ: [120, 150, 40] }, { tipo: 'arena', circ: [300, 150, 40] }],
      portales: [{ de: { x: 50, y: 700, r: 18 }, a: { x: 330, y: 430 }, dir: 2225 }],
      moviles: [{ tipo: 'molino', cx: 210, cy: 290, largo: 44, puerta: [185, 320, 235, 320], periodo: 960 }],
      ayuda: 'Todo junto: la loma te lleva al portal, o cruza junto al lago. Al final, el molino.' },
  ];

  // ---------- Geometría ----------
  const lados = pol => pol.map((p, i) => { const q = pol[(i + 1) % pol.length]; return [p[0], p[1], q[0], q[1]]; });
  function enPoligono(pol, x, y) {
    let dentro = false;
    for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
      const [xi, yi] = pol[i], [xj, yj] = pol[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  const geos = new Map();
  function geometria(hoyo) {
    let g = geos.get(hoyo.n);
    if (!g) {
      g = { segs: lados(hoyo.borde).concat(...hoyo.muros.map(lados)), zonas: hoyo.zonas, portales: hoyo.portales, moviles: hoyo.moviles, hoyo };
      geos.set(hoyo.n, g);
    }
    return g;
  }
  const dentroCampo = (geo, x, y) => enPoligono(geo.hoyo.borde, x, y) && !geo.hoyo.muros.some(m => enPoligono(m, x, y));
  function enZona(z, x, y) {
    if (z.rect) { const [zx, zy, w, h] = z.rect; return x >= zx && x < zx + w && y >= zy && y < zy + h; }
    const [cx, cy, r] = z.circ, dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < r * r;
  }
  // Obstáculo móvil en un instante: segmentos sólidos y su velocidad (u/s).
  function estadoMovil(m, reloj) {
    if (m.tipo === 'molino') {
      const angulo = (reloj * 3600 / m.periodo) % 3600, fase = angulo % 900;
      const cerrada = fase <= 220 || fase >= 680; // un aspa apunta hacia abajo (±22°): tapa la puerta
      return { angulo, cerrada, segs: cerrada ? [m.puerta] : [], vx: 0, vy: 0 };
    }
    const fase = (reloj % m.periodo) / m.periodo, tri = fase < 0.5 ? 2 * fase : 2 - 2 * fase;
    const x = m.x0 + (m.x1 - m.x0) * tri;
    return { x, segs: lados(rect(x, m.y, m.w, m.h)), vx: (fase < 0.5 ? 1 : -1) * (m.x1 - m.x0) * 2 * PASOS_SEG / m.periodo, vy: 0 };
  }
  function distSeg2(px, py, s) {
    const dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - s[0]) * dx + (py - s[1]) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = px - (s[0] + dx * t), ey = py - (s[1] + dy * t);
    return ex * ex + ey * ey;
  }
  const encima = (b, segs) => segs.some(s => distSeg2(b.x, b.y, s) < R * R);
  // Choque de la pelota con un segmento (que se mueve con mvx, mvy): la saca y rebota. ¿Rebotó?
  function chocar(b, s, mvx, mvy) {
    const ax = s[0], ay = s[1], dx = s[2] - ax, dy = s[3] - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((b.x - ax) * dx + (b.y - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + dx * t, cy = ay + dy * t, ex = b.x - cx, ey = b.y - cy, d2 = ex * ex + ey * ey;
    if (d2 >= R * R || d2 === 0) return false;
    const d = Math.sqrt(d2), nx = ex / d, ny = ey / d;
    b.x = cx + nx * R; b.y = cy + ny * R;
    const rvx = b.vx - mvx, rvy = b.vy - mvy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return false;
    const tx = rvx - vn * nx, ty = rvy - vn * ny, sale = -vn * E_PARED;
    b.vx = mvx + tx * E_TANG + sale * nx; b.vy = mvy + ty * E_TANG + sale * ny;
    return true;
  }

  // ---------- Partida (mismo estado para individual y sala) ----------
  function partida(hoyos, n) {
    const h0 = HOYOS[hoyos[0]];
    return {
      hoyos: hoyos.slice(), h: 0, reloj: 0, tiros: 0, ultimo: null, fin: null,
      jug: Array.from({ length: n }, () => ({ x: h0.salida.x, y: h0.salida.y, golpes: hoyos.map(() => 0), dentro: false, recogidas: [], retirado: false })),
    };
  }
  const hoyoActual = st => HOYOS[st.hoyos[st.h]];
  // Tira quien no ha terminado el hoyo con menos golpes en él (empate: el primero de la mesa).
  function turno(st) {
    let mejor = -1;
    st.jug.forEach((j, i) => { if (!j.dentro && !j.retirado && (mejor < 0 || j.golpes[st.h] < st.jug[mejor].golpes[st.h])) mejor = i; });
    return mejor < 0 ? 0 : mejor;
  }
  // Cuando todos terminan el hoyo: el siguiente desde la salida, o el fin con el orden por golpes.
  function avanzar(st) {
    if (!st.jug.every(j => j.dentro || j.retirado)) return;
    if (st.h + 1 < st.hoyos.length && !st.jug.every(j => j.retirado)) {
      st.h++; st.reloj = 0;
      const s = hoyoActual(st).salida;
      st.jug.forEach(j => { if (!j.retirado) Object.assign(j, { x: s.x, y: s.y, dentro: false }); });
    } else st.fin = { ranking: ranking(st) };
  }
  const total = j => j.golpes.reduce((a, b) => a + b, 0);
  function ranking(st) {
    const filas = st.jug.map((j, idx) => ({ idx, total: total(j), retirado: j.retirado }));
    filas.forEach(r => { r.lugar = 1 + filas.filter(o => (o.retirado ? 1 : 0) < (r.retirado ? 1 : 0) || (o.retirado === r.retirado && o.total < r.total)).length; });
    return filas.sort((a, b) => a.lugar - b.lugar || a.idx - b.idx);
  }

  // ---------- Simulación de un tiro ----------
  // `paso()` avanza un subpaso; la página llama SUB por cuadro para animar y la reproducción instantánea corre hasta
  // `termino`: el resultado es el mismo. `maxPasos` solo lo acorta el bot al buscar su tiro.
  function crearSim(st0, tiro, maxPasos) {
    const idx = turno(st0), hoyo = hoyoActual(st0), geo = geometria(hoyo), j = st0.jug[idx];
    const [sn, cs] = F.senCos(tiro.angulo), v0 = velocidad(tiro.fuerza);
    const b = { x: j.x, y: j.y, vx: cs * v0, vy: sn * v0 };
    const tope = maxPasos || MAX_PASOS;
    const sim = { idx, hoyo, bola: b, reloj: st0.reloj, pasos: 0, termino: false, evento: null, donde: null, rebotes: 0, portales: 0, arena: false, lie: { x: j.x, y: j.y } };
    let cx = b.x, cy = b.y;
    const acabar = ev => {
      sim.evento = ev; sim.termino = true; b.vx = 0; b.vy = 0;
      if (ev === 'agua' || ev === 'fuera') { sim.donde = { x: b.x, y: b.y }; b.x = sim.lie.x; b.y = sim.lie.y; }
    };
    sim.paso = () => {
      if (sim.termino) return;
      // Obstáculos que ya la tienen encimada al empezar el subpaso: no la chocan (nunca queda atrapada).
      const enc = geo.moviles.map(m => encima(b, estadoMovil(m, sim.reloj).segs));
      sim.reloj++; sim.pasos++;
      let ax = 0, ay = 0, arena = false;
      for (const z of geo.zonas) {
        if (!enZona(z, b.x, b.y)) continue;
        if (z.tipo === 'arena') arena = true; else if (z.tipo === 'pendiente') { ax += z.ax; ay += z.ay; }
      }
      const hx = hoyo.hoyo.x - b.x, hy = hoyo.hoyo.y - b.y, hd2 = hx * hx + hy * hy;
      if (hd2 > 0 && hd2 < ATRAE_R * ATRAE_R && b.vx * b.vx + b.vy * b.vy < 200 * 200) { const hd = Math.sqrt(hd2); ax += hx / hd * ATRAE; ay += hy / hd * ATRAE; }
      b.vx += ax * DT; b.vy += ay * DT;
      b.x += b.vx * DT; b.y += b.vy * DT;
      for (const s of geo.segs) if (chocar(b, s, 0, 0)) sim.rebotes++;
      for (let i = 0; i < geo.moviles.length; i++) {
        if (enc[i]) continue;
        const e = estadoMovil(geo.moviles[i], sim.reloj);
        for (const s of e.segs) if (chocar(b, s, e.vx, e.vy)) sim.rebotes++;
      }
      for (const p of geo.portales) {
        const dx = b.x - p.de.x, dy = b.y - p.de.y;
        if (dx * dx + dy * dy >= p.de.r * p.de.r) continue;
        const v = Math.sqrt(b.vx * b.vx + b.vy * b.vy), sale = v < 120 ? 120 : v, [s2, c2] = F.senCos(p.dir);
        b.x = p.a.x; b.y = p.a.y; b.vx = c2 * sale; b.vy = s2 * sale; sim.portales++;
        break;
      }
      for (const z of geo.zonas) if (z.tipo === 'agua' && enZona(z, b.x, b.y)) return acabar('agua');
      if (sim.pasos % 4 === 0 && !dentroCampo(geo, b.x, b.y)) return acabar('fuera'); // red de seguridad
      const v = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      const ex = hoyo.hoyo.x - b.x, ey = hoyo.hoyo.y - b.y;
      if (ex * ex + ey * ey < HOYO_R * HOYO_R && v < CAPTURA) { b.x = hoyo.hoyo.x; b.y = hoyo.hoyo.y; return acabar('hoyo'); }
      sim.arena = arena;
      const nv = v - (arena ? FRICCION.arena : FRICCION.pasto) * DT;
      if (nv <= PARA) {
        // El pasto la detiene (también en pendiente suave); en una rampa sigue rodando hacia abajo.
        if (ax * ax + ay * ay <= ESTATICA * ESTATICA) return acabar(null);
      } else { const f = nv / v; b.vx *= f; b.vy *= f; }
      if (sim.pasos % ATASCO === 0) { // atasco: casi no se movió en 0.5 s (pendiente contra una pared)
        const dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy < 4 && v < 60) return acabar(null);
        cx = b.x; cy = b.y;
      }
      if (sim.pasos >= tope) acabar(null);
    };
    sim.resultado = () => reglas(st0, sim);
    return sim;
  }

  // Golpes, castigo, recogida y cambio de hoyo → { st, ms }.
  function reglas(st0, sim) {
    const st = F.clonar(st0), j = st.jug[sim.idx], h = st.h, hoyo = sim.hoyo;
    j.golpes[h] += sim.evento === 'agua' ? 2 : 1;
    if (sim.evento === 'hoyo') { j.dentro = true; j.x = hoyo.hoyo.x; j.y = hoyo.hoyo.y; } else { j.x = F.q(sim.bola.x); j.y = F.q(sim.bola.y); }
    let recogida = false;
    if (!j.dentro && j.golpes[h] >= limite(hoyo.par)) { j.dentro = true; recogida = true; j.recogidas.push(h); }
    if (j.golpes[h] > limite(hoyo.par)) j.golpes[h] = limite(hoyo.par);
    st.reloj = sim.reloj; st.tiros++;
    st.ultimo = { quien: sim.idx, evento: sim.evento, recogida, golpes: j.golpes[h], h, n: hoyo.n, par: hoyo.par, portales: sim.portales };
    avanzar(st);
    return { st, ms: Math.round(sim.pasos * 1000 / PASOS_SEG) };
  }
  function aplicar(st, tiro) {
    const sim = crearSim(st, tiro);
    while (!sim.termino) sim.paso();
    return sim.resultado();
  }
  // Rendirse (sala): deja de tirar; sus hoyos pendientes cuentan con el límite. Los demás siguen.
  function rendir(st0, idx) {
    const st = F.clonar(st0), j = st.jug[idx];
    if (j.retirado) return st;
    j.retirado = true;
    st.hoyos.forEach((hi, k) => { if (k > st.h || (k === st.h && !j.dentro)) { j.golpes[k] = limite(HOYOS[hi].par); j.recogidas.push(k); } });
    j.dentro = true;
    st.ultimo = { quien: idx, evento: 'rendirse', recogida: false, golpes: j.golpes[st.h], h: st.h, n: hoyoActual(st).n, par: hoyoActual(st).par, portales: 0 };
    avanzar(st);
    return st;
  }
  // Individual: los obstáculos se mueven mientras apuntas (en sala el reloj solo avanza con la pelota rodando).
  const esperar = (st, pasos) => { st.reloj += pasos; return st; };
  const tiroDe = j => ({ angulo: j.angulo, fuerza: j.fuerza });

  // ---------- Bot: campo de distancias al hoyo y búsqueda del tiro ----------
  const CELDA = 8, campos = new Map();
  function campo(hoyo) {
    let c = campos.get(hoyo.n);
    if (c) return c;
    const geo = geometria(hoyo), nx = Math.ceil(hoyo.ancho / CELDA), ny = Math.ceil(hoyo.alto / CELDA), n = nx * ny;
    const costo = new Float64Array(n), dist = new Float64Array(n).fill(Infinity);
    for (let i = 0; i < n; i++) {
      const x = (i % nx + 0.5) * CELDA, y = (Math.floor(i / nx) + 0.5) * CELDA;
      let k = dentroCampo(geo, x, y) && !geo.segs.some(s => distSeg2(x, y, s) < (R + 1) * (R + 1)) ? 1 : 0;
      for (const z of geo.zonas) if (k && enZona(z, x, y)) { if (z.tipo === 'agua') k = 0; else if (z.tipo === 'arena') k = 4; }
      costo[i] = k;
    }
    const celda = (x, y) => F.acotar(Math.floor(y / CELDA), 0, ny - 1) * nx + F.acotar(Math.floor(x / CELDA), 0, nx - 1);
    const salidas = geo.portales.map(p => ({ i: celda(p.a.x, p.a.y), p }));
    // Dijkstra con montículo binario (orden determinista).
    const heap = [];
    const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] < heap[k][0] || (heap[p][0] === heap[k][0] && heap[p][1] <= heap[k][1])) { break; } [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; const menor = (a, b) => heap[a][0] < heap[b][0] || (heap[a][0] === heap[b][0] && heap[a][1] < heap[b][1]); if (l < heap.length && menor(l, m)) { m = l; } if (r < heap.length && menor(r, m)) { m = r; } if (m === k) { break; } [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const ini = celda(hoyo.hoyo.x, hoyo.hoyo.y); dist[ini] = 0; push(0, ini);
    const VEC = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142135623730951], [1, -1, 1.4142135623730951], [-1, 1, 1.4142135623730951], [-1, -1, 1.4142135623730951]];
    while (heap.length) {
      const [d, i] = pop();
      if (d > dist[i]) continue;
      const cx = i % nx, cy = Math.floor(i / nx);
      for (const [dx, dy, f] of VEC) {
        const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
        const k = y * nx + x; if (!costo[k]) continue;
        const nd = d + CELDA * f * costo[k];
        if (nd < dist[k]) { dist[k] = nd; push(nd, k); }
      }
      for (const s of salidas) {
        if (s.i !== i) continue;
        for (let k = 0; k < n; k++) {
          const x = (k % nx + 0.5) * CELDA - s.p.de.x, y = (Math.floor(k / nx) + 0.5) * CELDA - s.p.de.y;
          if (x * x + y * y < s.p.de.r * s.p.de.r && d + 1 < dist[k]) { dist[k] = d + 1; push(d + 1, k); }
        }
      }
    }
    c = { nx, ny, dist, celda };
    campos.set(hoyo.n, c);
    return c;
  }
  function valorCampo(hoyo, x, y) {
    const c = campo(hoyo), i = c.celda(x, y);
    if (c.dist[i] < Infinity) return c.dist[i];
    let m = Infinity; const cx = i % c.nx, cy = Math.floor(i / c.nx);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x2 = cx + dx, y2 = cy + dy; if (x2 < 0 || y2 < 0 || x2 >= c.nx || y2 >= c.ny) continue;
      const v = c.dist[y2 * c.nx + x2] + CELDA; if (v < m) m = v;
    }
    return m < Infinity ? m : 100000;
  }
  function evaluar(st, tiro) {
    const sim = crearSim(st, tiro, PASOS_SEG * 12);
    while (!sim.termino) sim.paso();
    if (sim.evento === 'hoyo') return -1e6;
    const base = valorCampo(sim.hoyo, sim.bola.x, sim.bola.y);
    return sim.evento === 'agua' || sim.evento === 'fuera' ? base + 500 : base + (sim.arena ? 20 : 0);
  }
  const ideales = new Map();
  // El mejor tiro sin error (72 ángulos × 9 fuerzas y dos afinados). En caché: Fisica.linea lo pide en cada cuadro.
  function tiroIdeal(st) {
    const j = st.jug[turno(st)], clave = st.hoyos[st.h] + '|' + j.x + '|' + j.y + '|' + st.reloj;
    if (ideales.has(clave)) return ideales.get(clave);
    let mejor = null;
    const probar = (a, f) => {
      const tiro = { angulo: ((Math.round(a) % 3600) + 3600) % 3600, fuerza: F.acotar(Math.round(f), 1, 100) };
      const v = evaluar(st, tiro);
      if (!mejor || v < mejor.v) mejor = { v, tiro };
    };
    for (let a = 0; a < 3600; a += 50) for (const f of [10, 18, 26, 34, 44, 56, 70, 86, 100]) probar(a, f);
    for (const [paso, fp] of [[10, 3], [2, 1]]) {
      const b = mejor.tiro;
      for (let da = -4; da <= 4; da++) for (let df = -2; df <= 2; df++) probar(b.angulo + da * paso, b.fuerza + df * fp);
    }
    if (ideales.size > 300) ideales.clear();
    ideales.set(clave, mejor.tiro);
    return mejor.tiro;
  }
  const ERROR = { ideal: [0, 0], dificil: [6, 2], medio: [20, 5], facil: [50, 10], auto: [60, 12] };
  function tiroBot(st, nivel, rnd) {
    const t = tiroIdeal(st), [ea, ef] = ERROR[nivel] || ERROR.medio;
    const r1 = rnd ? rnd() : 0.5, r2 = rnd ? rnd() : 0.5;
    const a = Math.round(t.angulo + (r1 * 2 - 1) * ea);
    return { angulo: ((a % 3600) + 3600) % 3600, fuerza: F.acotar(Math.round(t.fuerza + (r2 * 2 - 1) * ef), 1, 100) };
  }

  // ---------- Línea guía (solo dibujo: trayectoria estimada en pasto con hasta 2 rebotes) ----------
  function guia(hoyo, x, y, angulo, fuerza) {
    const geo = geometria(hoyo), v0 = velocidad(fuerza);
    let [dy, dx] = F.senCos(angulo), px = x, py = y, resto = v0 * v0 / (2 * FRICCION.pasto);
    const puntos = [{ x, y }];
    for (let reb = 0; reb <= 2 && resto > 1; reb++) {
      let mejor = null;
      for (const s of geo.segs) {
        const ex = s[2] - s[0], ey = s[3] - s[1], den = dx * ey - dy * ex; if (den === 0) continue;
        const t = ((s[0] - px) * ey - (s[1] - py) * ex) / den, u = ((s[0] - px) * dy - (s[1] - py) * dx) / den;
        if (t > 0.5 && u >= 0 && u <= 1 && (!mejor || t < mejor.t)) mejor = { t, ex, ey };
      }
      const alcance = mejor ? Math.max(0, mejor.t - R) : Infinity;
      if (alcance >= resto) { puntos.push({ x: px + dx * resto, y: py + dy * resto }); break; }
      px += dx * alcance; py += dy * alcance; resto = (resto - alcance) * E_PARED * E_PARED;
      puntos.push({ x: px, y: py, rebote: true });
      const l = Math.sqrt(mejor.ex * mejor.ex + mejor.ey * mejor.ey), nx = -mejor.ey / l, ny = mejor.ex / l, dn = dx * nx + dy * ny;
      dx -= 2 * dn * nx; dy -= 2 * dn * ny;
    }
    return puntos;
  }

  // ---------- Puntuación ----------
  function resultado(golpes, par, recogida) {
    if (recogida) return { clave: 'recogida', t: 'Recogida', emoji: '🫳' };
    if (golpes === 1) return { clave: 'hoyo-en-uno', t: '¡Hoyo en uno!', emoji: '🏆' };
    const d = golpes - par;
    if (d <= -3) return { clave: 'albatros', t: '¡Albatros!', emoji: '🌟' };
    if (d === -2) return { clave: 'aguila', t: '¡Águila!', emoji: '🦅' };
    if (d === -1) return { clave: 'birdie', t: '¡Birdie!', emoji: '🐦' };
    if (d === 0) return { clave: 'par', t: 'Par', emoji: '👍' };
    if (d === 1) return { clave: 'bogey', t: 'Bogey', emoji: '🙂' };
    if (d === 2) return { clave: 'doble-bogey', t: 'Doble bogey', emoji: '😅' };
    if (d === 3) return { clave: 'triple-bogey', t: 'Triple bogey', emoji: '😬' };
    return { clave: 'mas', t: '+' + d, emoji: '💪' };
  }
  const estrellas = (golpes, par, recogida) => recogida ? 0 : golpes < par ? 3 : golpes === par ? 2 : 1;
  const puntosHoyo = (golpes, par, recogida) => recogida ? 10 : 20 + 30 * Math.max(0, par + 2 - golpes) + (golpes === 1 ? 100 : 0);
  const estrellasDe = (st, idx) => st.hoyos.reduce((a, hi, k) => a + (k < st.h || st.fin || st.jug[idx].dentro && k === st.h ? estrellas(st.jug[idx].golpes[k], HOYOS[hi].par, st.jug[idx].recogidas.includes(k)) : 0), 0);
  // Sala: 500 / 300 / 200 / 100 por lugar (empates comparten) + 10 por estrella (máx. 90); quien se rinde, solo estrellas.
  const BASE_LUGAR = [500, 300, 200, 100];
  function puntosSala(st) {
    const rk = ranking(st);
    return st.jug.map((j, idx) => {
      const r = rk.find(x => x.idx === idx);
      return Math.min(1000, (j.retirado ? 0 : BASE_LUGAR[r.lugar - 1] || 0) + Math.min(90, 10 * estrellasDe(st, idx)));
    });
  }
  // Sala: 3 hoyos con la semilla (uno de 1–3, uno de 4–6 y uno de 7–9).
  function hoyosSala(seed) { const r = F.rng(seed, 'golf-hoyos'); return [0, 3, 6].map(b => b + Math.floor(r() * 3)); }
  function motorSala(n) {
    return { SUB, inicial: seed => partida(hoyosSala(seed), n), turno, fin: st => st.fin, aplicar, rendir, tiroBot, tiroDe, crearSim };
  }

  raiz.Golf = {
    R, HOYO_R, SUB, PASOS_SEG, HOYOS, velocidad, limite, geometria, dentroCampo, enZona, estadoMovil,
    partida, hoyoActual, turno, ranking, total, crearSim, aplicar, rendir, esperar, tiroDe, tiroBot, tiroIdeal, campo, valorCampo,
    guia, resultado, estrellas, puntosHoyo, estrellasDe, puntosSala, hoyosSala, motorSala,
    fin: st => st.fin,
  };
})(typeof window !== 'undefined' ? window : globalThis);
