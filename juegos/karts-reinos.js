/* Karts Turbo: interiores de monumentos y mecánicas de la Copa Reinos Antiguos (openspec: karts-copa-reinos).
   Script clásico que karts.html carga ANTES de su script principal: aquí solo se definen funciones; usan, al
   llamarse, el estado del juego (pista, M, N, cam, g, yo, tCarrera…) y sus ayudantes (punto, proyectar, matiz…).
   - Interiores (design.md §2): piso de piedra oscura y charcos de luz horneados en la textura, muros de piedra en 3D
     (cuadriláteros proyectados, recortados en el plano cercano y ordenados con los sprites), portadas, bóveda oscura con
     antorchas (segundo panorama), niebla oscura, viñeta y brillo de las antorchas. Con movimiento reducido: antorchas
     quietas y la luz cambia sin transición.
   - Física: los muros detienen y frenan; columnas, bloques que caen, roca rodante y compuertas (deterministas: posición
     y reloj de la carrera, funciones de juegos/karts-pistas.js); los bots esquivan con la misma regla. */
'use strict';
const KartsReinos = (() => {
  const ALTO_MURO = 150, SEG = 4, SEG_LEJOS = 16, CELDA_M = 512, FACHADA = 150, NEGRO = '#0b0805', NIVELES = 32;
  let R = null; // estado de la pista con interiores (null en las demás)
  let ultimoMuro = null; // velocidad que te dejó el último golpe con el muro (ganchos de prueba)
  let dentro = 0, techo = 0; // luz del interior y bóveda (0 afuera … 1 adentro), suavizadas
  const DINAMICAS = new Set(['bloques', 'roca', 'compuerta']);
  const cerca = (i, j, n) => { const d = Math.abs(i - j) % N; return Math.min(d, N - d) <= n; };
  const adelante = (de, a) => (a - de + N) % N; // muestras hacia adelante

  /* ---------------- Preparación por pista ---------------- */
  function preparar() {
    dentro = 0; techo = 0;
    delete imgsDecor.bloqueCae; // el bloque toma el color de la piedra de cada pista
    if (!pista.interiores) { R = null; return; }
    const tramos = KP.tramosInteriores(pista, M).map((t, k) => ({ ...t, techo: pista.interiores[k].techo !== false, i1x: t.i0 + t.largo }));
    const antorchas = crearAntorchas(tramos), { fino, grueso, portales } = crearMuros(tramos, antorchas);
    R = {
      muros: KP.muroEn(pista, M), tramos, tramoDe: indiceTramos(tramos), antorchas, fino, grueso, columnas: KP.colocarColumnas(pista, M),
      paleta: Array.from({ length: NIVELES }, (_, n) => matiz(pista.int.muro, -0.86 + 0.86 * n / (NIVELES - 1))),
      portales: portales.map(q => ({ ...q, a: punto(q.i, -(q.w + 9)), b: punto(q.i, q.w + 9) })),
      bloques: zonas.filter(z => z.tipo === 'bloques'), rocas: zonas.filter(z => z.tipo === 'roca'), compuertas: zonas.filter(z => z.tipo === 'compuerta'),
      pano: null, vineta: null,
    };
  }
  // Índice del tramo de cada muestra (-1 = afuera).
  function indiceTramos(tramos) {
    const tramoDe = new Array(N).fill(-1);
    tramos.forEach((t, k) => { for (let d = 0; d <= t.largo; d++) tramoDe[(t.i0 + d) % N] = k; });
    return tramoDe;
  }
  // Antorchas cada 22 muestras, alternando muro (o en el único muro de una cámara abierta).
  function crearAntorchas(tramos) {
    const out = [];
    for (const t of tramos) {
      for (let d = 8, k = 0; d < t.largo - 3; d += 22, k++) {
        const s = t.muro || (k % 2 ? 1 : -1), i = (t.i0 + d) % N, q = punto(i, s * (t.w - 4));
        out.push({ x: q.x, y: q.y, idx: i, s });
      }
    }
    return out;
  }
  const meterSeg = (mapa, sg) => {
    const k = Math.floor((sg.x1 + sg.x2) / 2 / CELDA_M) + ',' + Math.floor((sg.y1 + sg.y2) / 2 / CELDA_M);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(sg);
  };
  // Segmentos de muro (finos para cerca y gruesos para lejos, en celdas), fachadas y portadas de cada tramo.
  function crearMuros(tramos, antorchas) {
    const fino = new Map(), grueso = new Map(), portales = [];
    const luzDe = (x, y) => antorchas.reduce((l, a) => Math.max(l, 1 - Math.hypot(a.x - x, a.y - y) / 190), 0);
    const contiguo = (t, en) => tramos.some(o => o !== t && (o.i0 === en || o.i1 === en));
    for (const t of tramos) {
      for (const s of t.muro ? [t.muro] : [-1, 1]) {
        segmentos(t, s, SEG, fino, luzDe);
        segmentos(t, s, SEG_LEJOS, grueso, luzDe);
        for (const en of [t.i0, t.i1]) if (!contiguo(t, en)) fachada(t, s, en, [fino, grueso]); // no entre dos tramos seguidos
      }
      portales.push({ i: t.i0, w: t.w, nombre: t.nombre });
      if (!contiguo(t, t.i1)) portales.push({ i: t.i1, w: t.w, nombre: '' });
    }
    return { fino, grueso, portales };
  }
  function segmentos(t, s, paso, mapa, luzDe) {
    for (let d = 0; d < t.largo; d += paso) {
      const a = punto(t.i0 + d, s * t.w), b = punto(t.i0 + Math.min(t.largo, d + paso), s * t.w);
      meterSeg(mapa, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, luz: luzDe((a.x + b.x) / 2, (a.y + b.y) / 2) });
    }
  }
  // Fachada del monumento a un lado de la entrada `en`.
  function fachada(t, s, en, mapas) {
    const a = punto(en, s * t.w), b = punto(en, s * (t.w + FACHADA));
    for (const m of mapas) meterSeg(m, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, luz: 0.5 });
  }
  const activo = () => !!R;
  // ¿Bloquea este adorno al azar? (detrás de un muro no se ve; en la cámara abierta solo si tiene bóveda).
  function tapaDecor(i, lado) {
    if (!R || R.muros.w[i] === 0) return false;
    const t = R.tramos[R.tramoDe[i]];
    if (!t) return false;
    if (!t.muro) return true;
    return Math.sign(lado) === t.muro || t.techo;
  }
  // Antorchas, columnas y adornos sueltos al escenario (antes de agruparlo en celdas).
  function decorar(lista) {
    for (const o of pista.adornos || []) lista.push({ x: o.x, y: o.y, img: o.img, w: o.w, h: o.h });
    if (!R) return;
    for (const a of R.antorchas) lista.push({ x: a.x, y: a.y, img: 'antorcha', w: 9, h: 22, alt: 52, luz: true });
    for (const c of R.columnas) lista.push({ x: c.x, y: c.y, img: 'columnaHipostila', w: 34, h: 150 });
  }

  /* ---------------- Textura del piso (una vez por pista) ---------------- */
  function fondoArena(c, W, H, r) {
    c.strokeStyle = 'rgba(150,100,40,.22)'; c.lineWidth = 3;
    for (let y = 0; y < H; y += 24) {
      c.beginPath();
      for (let x = 0; x <= W; x += 26) { c.lineTo(x, y + Math.sin(x / 80 + y * 0.27) * 6); }
      c.stroke();
    }
    for (let k = 0; k < cuantos(5000); k++) { c.fillStyle = r() < 0.5 ? 'rgba(120,80,40,.22)' : 'rgba(255,255,255,.14)'; c.fillRect(r() * W, r() * H, 3, 2); }
  }
  const FONDO = {
    giza: fondoArena, karnak: fondoArena,
    castillo(c, W, H, r) { for (let k = 0; k < cuantos(7000); k++) { c.fillStyle = r() < 0.6 ? 'rgba(0,50,0,.22)' : 'rgba(230,240,180,.12)'; c.fillRect(r() * W, r() * H, 2, 3); } },
    angkor(c, W, H, r) { for (let k = 0; k < cuantos(7000); k++) { c.fillStyle = r() < 0.55 ? 'rgba(0,35,0,.28)' : 'rgba(150,200,90,.15)'; c.beginPath(); c.ellipse(r() * W, r() * H, 3 + r() * 3, 1.5 + r() * 1.5, r() * 3, 0, 7); c.fill(); } },
  };
  function pintarFondo(c, W, H, r, id) {
    const f = Object.hasOwn(FONDO, id) ? FONDO[id] : null;
    if (f) f(c, W, H, r);
  }
  // Debajo del camino: el lago sagrado de Karnak y el foso de Angkor (el camino pasa encima como calzada o puente).
  function pintarBajo(c) {
    const agua = (dibujo, ancho) => {
      for (const [w, col] of [[ancho + 26, '#8a7a5a'], [ancho, '#2f6f86'], [ancho * 0.6, '#3f8ea3']]) { c.lineWidth = w; c.strokeStyle = col; dibujo(); c.stroke(); }
    };
    if (pista.lago) {
      const l = pista.lago;
      c.fillStyle = '#c9b48a'; c.beginPath(); c.ellipse(l.x, l.y, l.rx + 26, l.ry + 26, 0, 0, 7); c.fill();
      c.fillStyle = '#2f6f86'; c.beginPath(); c.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(220,245,250,.35)'; c.lineWidth = 2;
      for (let k = 0; k < 40; k++) { const a = k * 2.4, d = (k % 7) / 7; const x = l.x + Math.cos(a) * l.rx * d, y = l.y + Math.sin(a) * l.ry * d; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y); c.stroke(); }
    }
    if (pista.foso) { // foso alrededor del recinto: rectángulo de agua por fuera de las galerías
      c.lineCap = 'butt'; c.lineJoin = 'miter';
      agua(() => { c.beginPath(); c.rect(215, 235, 3450, 1680); }, 120);
    }
  }
  // Interiores: oscuridad tras los muros, losas de piedra con juntas, base del muro y charcos de luz de las antorchas.
  function pintarPiso(c) {
    if (!R) return;
    for (const t of R.tramos) pisoTramo(c, t, pista.int);
    for (const a of R.antorchas) {
      const q = punto(a.idx, a.s * (R.muros.w[a.idx] - 22));
      const gr = c.createRadialGradient(q.x, q.y, 4, q.x, q.y, 78); gr.addColorStop(0, 'rgba(255,176,90,.32)'); gr.addColorStop(1, 'rgba(255,176,90,0)');
      c.fillStyle = gr; c.fillRect(q.x - 80, q.y - 80, 160, 160);
    }
  }
  function pisoTramo(c, t, I) {
    const lados = t.muro ? [t.muro] : [-1, 1];
    for (const s of lados) trazoTramo(c, t.i0, t.i1x, s * (t.w + 80), 150, NEGRO);
    if (t.muro && t.techo) trazoTramo(c, t.i0, t.i1x, -t.muro * (t.w + 190), 400, matiz(I.piso, -0.25)); // piso de la cámara abierta
    trazoTramo(c, t.i0, t.i1x, 0, t.w * 2 + 2, I.piso);
    c.strokeStyle = I.junta; c.lineWidth = 1.6;
    for (let d = 0; d <= t.largo; d += 5) { const a = punto(t.i0 + d, -t.w), b = punto(t.i0 + d, t.w); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    c.globalAlpha = 0.7;
    for (const l of [-t.w / 3, t.w / 3]) { trazoTramo(c, t.i0, t.i1x, l, 1.4, I.junta); }
    c.globalAlpha = 0.55;
    for (const s of lados) { trazoTramo(c, t.i0, t.i1x, s * (t.w - 2), 6, '#000'); }
    c.globalAlpha = 1;
  }
  // Marcas de las mecánicas en el piso (se dibujan con pintarZonas, rotadas al sentido del camino).
  const ZONA_DIBUJO = {
    arena(c, z) { // duna de arena suelta
      for (const [dx, dy, rx, ry, col] of [[0, 0, 1, 0.75, '#e8c98c'], [-0.3, 0.2, 0.55, 0.45, '#d9b273'], [0.35, -0.2, 0.5, 0.4, '#f1d9a6']]) { c.fillStyle = col; c.beginPath(); c.ellipse(dx * z.r, dy * z.r, rx * z.r, ry * z.r, 0.3, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(150,100,40,.4)'; c.lineWidth = 1.5;
      for (const y of [-0.3, 0, 0.3]) { c.beginPath(); c.moveTo(-z.r * 0.7, y * z.r); c.quadraticCurveTo(0, y * z.r - 5, z.r * 0.7, y * z.r); c.stroke(); }
    },
    luz(c, z) { // triángulos de luz de la serpiente del equinoccio, con flechas
      c.fillStyle = 'rgba(255,236,150,.9)';
      for (const dx of [-14, 0, 14]) { c.beginPath(); c.moveTo(dx - 7, -z.r * 0.7); c.lineTo(dx + 7, 0); c.lineTo(dx - 7, z.r * 0.7); c.closePath(); c.fill(); }
      c.strokeStyle = '#fff7d1'; c.lineWidth = 2; c.strokeRect(-z.r, -z.r * 0.8, z.r * 2, z.r * 1.6);
    },
    bloques(c, z) { // losa marcada donde cae el bloque
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-z.r, -z.r, z.r * 2, z.r * 2);
      c.strokeStyle = 'rgba(255,190,90,.55)'; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(-z.r + 2, -z.r + 2, z.r * 2 - 4, z.r * 2 - 4); c.setLineDash([]);
    },
    roca(c, z) { // canal por donde rueda la roca
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-z.r, -z.w, z.r * 2, z.w * 2);
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.5; for (const dx of [-z.r * 0.5, z.r * 0.5]) { c.beginPath(); c.moveTo(dx, -z.w); c.lineTo(dx, z.w); c.stroke(); }
    },
    compuerta(c, z) { // riel de la compuerta de piedra
      c.fillStyle = '#1a140e'; c.fillRect(-5, -z.w, 10, z.w * 2);
      c.fillStyle = 'rgba(255,200,110,.5)'; c.fillRect(-1, -z.w, 2, z.w * 2);
    },
  };

  /* ---------------- Física y bots ---------------- */
  function golpe(k, tipo, txt) {
    if (k.giro > 0 || k.estrella > 0 || k.aire > 0) return;
    golpear(k);
    if (k === yo && k.giro > 0) { eventos[tipo] = (eventos[tipo] || 0) + 1; avisar(txt, 1100); }
  }
  function muro(k, w, lado) {
    const lat = lateralDe(k), s = Math.sign(lat), lim = w - 9;
    if (Math.abs(lat) <= lim || (lado && s !== lado)) return;
    const p = M.pts[k.idx], nx = -Math.sin(p.a), ny = Math.cos(p.a), exceso = Math.abs(lat) - lim;
    k.x -= nx * s * exceso; k.y -= ny * s * exceso;
    const vl = k.vx * nx + k.vy * ny;
    if (vl * s <= 0) return;
    k.vx -= nx * vl * 1.25; k.vy -= ny * vl * 1.25; // rebote con restitución 0.25
    k.ang += difAng(p.a - k.ang) * 0.12; // el muro endereza hacia el camino
    k.vel *= 0.99; // rozar frena un poco
    if (Math.abs(vl) > 60 && (k.muroT || 0) <= tCarrera) {
      k.vel *= 0.7; k.muroT = tCarrera + 0.4; k.derrape = null;
      if (k === yo) { eventos.muro = (eventos.muro || 0) + 1; ultimoMuro = Math.round(k.vel); tono(140, 0.12, 'square', 0.05, 70); }
    }
  }
  function columna(k, c) {
    const dx = k.x - c.x, dy = k.y - c.y, d = Math.hypot(dx, dy), min = c.r + 9;
    if (d >= min || d === 0) return;
    const nx = dx / d, ny = dy / d;
    k.x = c.x + nx * min; k.y = c.y + ny * min;
    const vn = k.vx * nx + k.vy * ny;
    if (vn >= 0) return;
    k.vx -= nx * vn * 1.3; k.vy -= ny * vn * 1.3;
    if (-vn > 60 && (k.colT || 0) <= tCarrera) {
      k.vel *= 0.6; k.colT = tCarrera + 0.4; k.derrape = null;
      if (k === yo) { eventos.columna = (eventos.columna || 0) + 1; tono(160, 0.15, 'square', 0.05, 80); avisar('🏛️ ¡Columna!', 700); }
    }
  }
  function compuerta(k, z) {
    if ((k.compT || 0) > tCarrera || Math.cos(difAng(k.ang - M.pts[z.idx].a)) < 0) return;
    const lat = lateralDe(k), c = KP.centroCompuerta(z, tCarrera);
    if (lat < c - z.w / 2 - 9 || lat > c + z.w / 2 + 9) return;
    const i = (z.idx - 4 + N) % N, p = punto(i, lat);
    k.x = p.x; k.y = p.y; k.idx = i; k.vel *= 0.35; k.vx = Math.cos(k.ang) * k.vel; k.vy = Math.sin(k.ang) * k.vel; k.compT = tCarrera + 0.5; k.derrape = null;
    if (k === yo) { eventos.compuerta = (eventos.compuerta || 0) + 1; tono(110, 0.2, 'square', 0.05, 60); avisar('🚪 ¡Compuerta! Pasa por el lado abierto', 1100); }
  }
  function fisica(k) {
    if (!R) return;
    const w = R.muros.w[k.idx];
    if (w > 0) muro(k, w, R.muros.lado[k.idx]);
    for (const c of R.columnas) if (cerca(c.idx, k.idx, 5)) columna(k, c);
    for (const z of R.compuertas) if (cerca(z.idx, k.idx, 2)) compuerta(k, z);
    caidasYRocas(k);
  }
  function caidasYRocas(k) {
    for (const z of R.bloques) if (KP.bloquePeligro(z, tCarrera) && dentroZona(k, z)) golpe(k, 'bloques', '🧱 ¡Te cayó un bloque! −2 🪙');
    for (const z of R.rocas) {
      if (!cerca(z.idx, k.idx, 6)) continue;
      const q = punto(z.idx, KP.ladoRoca(z, tCarrera));
      if ((k.x - q.x) ** 2 + (k.y - q.y) ** 2 < (z.r + 9) ** 2) golpe(k, 'roca', '🪨 ¡La roca rodante! −2 🪙');
    }
  }
  // Carril de un bot (y del piloto de prueba): esquiva el obstáculo más cercano adelante; si no hay, el de siempre,
  // dentro de los muros.
  // [obstáculos, alcance en muestras, lado libre al llegar (t = hora de llegada; null = no estorba)].
  const ESQUIVAR = [
    ['columnas', 45, (o, w) => -Math.sign(o.lado) * w * 0.55],
    ['compuertas', 60, (o, w, t) => -(Math.sign(KP.centroCompuerta(o, t)) || 1) * o.w * 0.5],
    ['bloques', 50, (o, w, t) => (KP.alturaBloque(o, t) < 70 ? -(Math.sign(lateralZona(o)) || 1) * w * 0.6 : null)],
    ['rocas', 40, (o, w, t) => -(Math.sign(KP.ladoRoca(o, t)) || 1) * o.w * 0.55],
  ];
  function carril(k, base) {
    if (!R) return base;
    const w = R.muros.w[(k.idx + 10) % N] || pista.mitad, v = Math.max(90, k.vel);
    let mejor = base, dMin = Infinity;
    for (const [lista, alcance, ladoLibre] of ESQUIVAR) {
      for (const o of R[lista]) {
        const d = adelante(k.idx, o.idx);
        if (d <= 0 || d >= Math.min(alcance, dMin)) continue;
        const lado = ladoLibre(o, w, tCarrera + d * M.paso / v);
        if (lado !== null) { dMin = d; mejor = lado; }
      }
    }
    return Math.max(-(w - 16), Math.min(w - 16, mejor));
  }
  const lateralZona = z => { const p = M.pts[z.idx]; return -(z.x - p.x) * Math.sin(p.a) + (z.y - p.y) * Math.cos(p.a); };

  /* ---------------- Dibujo en 3D ---------------- */
  // Mete en la lista de la escena los muros, portadas, bloques, rocas y compuertas que la cámara alcanza a ver.
  function juntar(lista, visible, mitadVista) {
    if (!R) return;
    const lejos = 1600 - 700 * dentro;
    juntarMuros(lista, lejos, mitadVista);
    for (const p of R.portales) { const z = visible((p.a.x + p.b.x) / 2, (p.a.y + p.b.y) / 2, p.w + 30, lejos); if (z) lista.push({ z: z + 2, rk: 'portal', p }); }
    for (const b of R.bloques) { const z = visible(b.x, b.y, b.r * 2, 1100); if (z) lista.push({ z, rk: 'bloque', b }); }
    for (const o of R.rocas) { const q = punto(o.idx, KP.ladoRoca(o, tCarrera)), z = visible(q.x, q.y, 40, 1100); if (z) lista.push({ z, rk: 'roca', o, q }); }
    for (const o of R.compuertas) { const p = M.pts[o.idx], z = visible(p.x, p.y, o.w + 10, 1100); if (z) lista.push({ z: z + 1, rk: 'compuerta', o }); }
  }
  // Segmentos de muro de las celdas cercanas (finos a menos de 900 px, gruesos más lejos) que caen en la vista.
  function juntarMuros(lista, lejos, mitadVista) {
    const c0 = Math.floor((cam.x - lejos) / CELDA_M), c1 = Math.floor((cam.x + lejos) / CELDA_M), f0 = Math.floor((cam.y - lejos) / CELDA_M), f1 = Math.floor((cam.y + lejos) / CELDA_M);
    for (let cx = c0; cx <= c1; cx++) {
      for (let fy = f0; fy <= f1; fy++) {
        const dc = Math.hypot((cx + 0.5) * CELDA_M - cam.x, (fy + 0.5) * CELDA_M - cam.y);
        for (const sg of (dc < 900 ? R.fino : R.grueso).get(cx + ',' + fy) || []) {
          const e = segmentoVisible(sg, lejos, mitadVista);
          if (e) lista.push(e);
        }
      }
    }
  }
  // Elemento de la escena para el segmento (en coordenadas de cámara) o null si no se ve.
  function segmentoVisible(sg, lejos, mitadVista) {
    const z1 = (sg.x1 - cam.x) * cam.cos + (sg.y1 - cam.y) * cam.sin, z2 = (sg.x2 - cam.x) * cam.cos + (sg.y2 - cam.y) * cam.sin;
    if ((z1 < 6 && z2 < 6) || (z1 > lejos && z2 > lejos)) return null;
    const l1 = (sg.y1 - cam.y) * cam.cos - (sg.x1 - cam.x) * cam.sin, l2 = (sg.y2 - cam.y) * cam.cos - (sg.x2 - cam.x) * cam.sin;
    const m1 = Math.max(z1, 6) * mitadVista + 10, m2 = Math.max(z2, 6) * mitadVista + 10;
    if ((l1 > m1 && l2 > m2) || (l1 < -m1 && l2 < -m2)) return null;
    return { z: Math.max(z1, z2), rk: 'muro', s: sg, z1, z2, l1, l2 };
  }
  // Cuadrilátero vertical entre dos puntos del piso (en coordenadas de cámara: lateral l y distancia z), de alto `alto`.
  function cuad(l1, z1, l2, z2, alto) {
    if (z1 < 6) { const f = (6 - z1) / (z2 - z1); l1 += (l2 - l1) * f; z1 = 6; } else if (z2 < 6) { const f = (6 - z2) / (z1 - z2); l2 += (l1 - l2) * f; z2 = 6; }
    const s1 = cam.F / z1, s2 = cam.F / z2, x1 = LW / 2 + l1 * s1, x2 = LW / 2 + l2 * s2;
    g.beginPath(); g.moveTo(x1, cam.hy + cam.h * s1); g.lineTo(x1, cam.hy + (cam.h - alto) * s1); g.lineTo(x2, cam.hy + (cam.h - alto) * s2); g.lineTo(x2, cam.hy + cam.h * s2); g.closePath();
    return { x1, x2, s1, s2 };
  }
  function nivel(luz, z) {
    const niebla = Math.max(0, Math.min(1, (z - 180) / 720)) * dentro;
    const adentro = (0.3 + 0.7 * luz) * (1 - niebla), afuera = 0.86 - Math.min(0.25, z / 6400);
    return R.paleta[Math.max(0, Math.min(NIVELES - 1, Math.round((adentro * dentro + afuera * (1 - dentro)) * (NIVELES - 1))))];
  }
  function dibujar(e, t) {
    if (e.rk === 'muro') {
      const zm = (Math.max(e.z1, 6) + Math.max(e.z2, 6)) / 2;
      g.fillStyle = nivel(e.s.luz, zm);
      const q = cuad(e.l1, e.z1, e.l2, e.z2, ALTO_MURO);
      g.fill();
      if (zm < 520) { // hiladas de piedra y la junta del borde (solo de cerca)
        g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1;
        g.beginPath();
        for (const h of [38, 76, 114]) { g.moveTo(q.x1, cam.hy + (cam.h - h) * q.s1); g.lineTo(q.x2, cam.hy + (cam.h - h) * q.s2); }
        g.moveTo(q.x1, cam.hy + cam.h * q.s1); g.lineTo(q.x1, cam.hy + (cam.h - ALTO_MURO) * q.s1);
        g.stroke();
      }
    } else if (e.rk === 'portal') dibujarPortal(e.p);
    else if (e.rk === 'bloque') dibujarBloque(e.b);
    else if (e.rk === 'roca') dibujarRoca(e.o, e.q);
    else if (e.rk === 'compuerta') dibujarCompuerta(e.o);
  }
  // Portada de piedra: dos jambas y un dintel con el nombre del tramo.
  function dibujarPortal(p) {
    const pa = proyectar(p.a.x, p.a.y, 0), pb = proyectar(p.b.x, p.b.y, 0), ta = proyectar(p.a.x, p.a.y, ALTO_MURO), tb = proyectar(p.b.x, p.b.y, ALTO_MURO);
    const da = proyectar(p.a.x, p.a.y, 112), db = proyectar(p.b.x, p.b.y, 112);
    if (!pa || !pb || pa.z < 30 || pb.z < 30) return;
    const col = matiz(pista.int.muro, -0.15), osc = matiz(pista.int.muro, -0.45);
    for (const [b, tq] of [[pa, ta], [pb, tb]]) { const w = Math.max(2, 16 * b.s); g.fillStyle = col; g.fillRect(b.x - w / 2, tq.y, w, b.y - tq.y); g.fillStyle = osc; g.fillRect(b.x - w / 2, tq.y, w * 0.25, b.y - tq.y); }
    g.fillStyle = col; g.beginPath(); g.moveTo(ta.x, ta.y); g.lineTo(tb.x, tb.y); g.lineTo(db.x, db.y); g.lineTo(da.x, da.y); g.closePath(); g.fill();
    g.fillStyle = pista.int.acento; g.fillRect(Math.min(da.x, db.x), Math.min(da.y, db.y) - 3 * pa.s, Math.abs(db.x - da.x), 3 * pa.s);
    const alto = (da.y - ta.y + db.y - tb.y) / 2;
    if (p.nombre && alto > 7) {
      g.fillStyle = '#fde68a'; g.font = 'bold ' + Math.round(Math.min(alto * 0.5, 30)) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(p.nombre.toUpperCase(), (ta.x + tb.x) / 2, (ta.y + tb.y + da.y + db.y) / 4);
    }
  }
  function dibujarBloque(b) {
    const h = KP.alturaBloque(b, tCarrera), p = proyectar(b.x, b.y, 0);
    if (!p) return;
    const cerca1 = 1 - Math.min(1, h / KP.ALTO_BLOQUE); // sombra de aviso: crece mientras el bloque baja
    if (cerca1 > 0.02) { g.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.45 * cerca1).toFixed(2) + ')'; g.beginPath(); g.ellipse(p.x, p.y, b.r * p.s * (0.5 + 0.6 * cerca1), b.r * p.s * 0.32 * (0.5 + 0.6 * cerca1), 0, 0, 7); g.fill(); }
    if (h >= KP.ALTO_BLOQUE - 1) return;
    const q = proyectar(b.x, b.y, h), w = b.r * 2 * q.s;
    g.drawImage(imgDecor('bloqueCae'), q.x - w / 2, q.y - w, w, w);
  }
  function dibujarRoca(o, q) {
    const p = proyectar(q.x, q.y, 0);
    if (!p) return;
    const w = (o.r * 2 + 4) * p.s;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(p.x, p.y, w * 0.45, w * 0.12, 0, 0, 7); g.fill();
    g.save(); g.translate(p.x, p.y - w / 2); if (!REDUCIR) g.rotate(KP.ladoRoca(o, tCarrera) / o.r);
    g.drawImage(imgDecor('rocaRodante'), -w / 2, -w / 2, w, w); g.restore();
  }
  function dibujarCompuerta(o) {
    const c = KP.centroCompuerta(o, tCarrera);
    const a = punto(o.idx, c - o.w / 2), b = punto(o.idx, c + o.w / 2);
    const z = q => (q.x - cam.x) * cam.cos + (q.y - cam.y) * cam.sin, l = q => (q.y - cam.y) * cam.cos - (q.x - cam.x) * cam.sin;
    const za = z(a), zb = z(b);
    if (za < 6 && zb < 6) return;
    g.fillStyle = matiz(pista.int.muro, -0.3 * (1 - dentro) - 0.35 * dentro);
    cuad(l(a), za, l(b), zb, 78); g.fill();
    g.strokeStyle = pista.int.acento; g.lineWidth = Math.max(1, 3 * cam.F / Math.max(za, 6) / 4); g.stroke();
  }

  /* ---------------- Cielo, niebla y luz ---------------- */
  function silueta(c, id, PW, PH, dos) {
    const B = PH + 1;
    if (id === 'giza') {
      dos(o => { // las tres pirámides de Giza (lisas, con la punta clara) y la Esfinge enfrente
        for (const [dx, w, h] of [[0.0, 1.5, 0.62], [0.07, 1.35, 0.56], [0.12, 0.8, 0.34]]) {
          const cx = PW * dx + o;
          c.fillStyle = '#d6b679'; c.beginPath(); c.moveTo(cx - PH * w / 2, B); c.lineTo(cx, B - PH * h); c.lineTo(cx + PH * w / 2, B); c.fill();
          c.fillStyle = '#b8955a'; c.beginPath(); c.moveTo(cx, B - PH * h); c.lineTo(cx + PH * w / 2, B); c.lineTo(cx + PH * w * 0.1, B); c.fill();
          c.fillStyle = '#f1e2bd'; c.beginPath(); c.moveTo(cx - PH * w * 0.06, B - PH * h * 0.88); c.lineTo(cx, B - PH * h); c.lineTo(cx + PH * w * 0.06, B - PH * h * 0.88); c.fill();
        }
      });
    } else if (id === 'castillo') {
      dos(o => { // El Castillo al atardecer, con la sombra de la serpiente en la escalinata
        const cx = PW * 0.02 + o, cima = piramidePano(c, cx, B, PH * 1.25, PH * 0.6, 9, '#cfc29f', '#a99a73', '#e6dcc0');
        c.fillStyle = '#c4b590'; c.fillRect(cx - PH * 0.15, cima - PH * 0.13, PH * 0.3, PH * 0.13);
        c.fillStyle = 'rgba(255,230,140,.85)'; for (let k = 0; k < 7; k++) { const y = B - PH * 0.08 - k * PH * 0.07; c.beginPath(); c.moveTo(cx + PH * 0.07, y); c.lineTo(cx + PH * 0.1, y - PH * 0.035); c.lineTo(cx + PH * 0.07, y - PH * 0.07); c.fill(); }
      });
    } else if (id === 'karnak') {
      dos(o => { // pilono de entrada con sus dos torres y obeliscos
        const cx = PW * 0.03 + o, w = PH * 0.5, h = PH * 0.42;
        for (const s of [-1, 1]) { c.fillStyle = '#cdae79'; c.beginPath(); c.moveTo(cx + s * w * 0.12, B); c.lineTo(cx + s * w * 0.15, B - h); c.lineTo(cx + s * w * 0.95, B - h * 0.94); c.lineTo(cx + s * w, B); c.fill(); }
        c.fillStyle = '#7a5a36'; c.fillRect(cx - w * 0.1, B - h * 0.55, w * 0.2, h * 0.55);
        for (const dx of [-0.9, 0.9, 2.2]) { const x = cx + dx * w; c.fillStyle = '#d9bd86'; c.beginPath(); c.moveTo(x - 4, B); c.lineTo(x - 2.5, B - h * 1.1); c.lineTo(x, B - h * 1.2); c.lineTo(x + 2.5, B - h * 1.1); c.lineTo(x + 4, B); c.fill(); }
      });
    } else if (id === 'angkor') {
      dos(o => { // las cinco torres en forma de flor de loto
        const cx = PW * 0.02 + o;
        for (const [dx, h, w] of [[-0.42, 0.42, 0.16], [0.42, 0.42, 0.16], [-0.22, 0.5, 0.18], [0.22, 0.5, 0.18], [0, 0.66, 0.22]]) {
          const x = cx + dx * PH, top = B - PH * h, ww = PH * w;
          c.fillStyle = '#6f7466'; c.beginPath(); c.moveTo(x - ww / 2, B); c.quadraticCurveTo(x - ww * 0.55, top + PH * h * 0.35, x, top); c.quadraticCurveTo(x + ww * 0.55, top + PH * h * 0.35, x + ww / 2, B); c.fill();
          c.strokeStyle = 'rgba(40,45,35,.35)'; c.lineWidth = 1; for (let k = 1; k < 6; k++) { const y = B - PH * h * k / 6; c.beginPath(); c.moveTo(x - ww * 0.45 * (1 - k / 7), y); c.lineTo(x + ww * 0.45 * (1 - k / 7), y); c.stroke(); }
        }
        c.fillStyle = '#5c6a55'; c.fillRect(cx - PH * 0.55, B - PH * 0.12, PH * 1.1, PH * 0.12);
      });
    }
  }
  // Bóveda interior: hiladas de piedra, falso arco escalonado, friso de color y antorchas.
  function panoInterior(PW, PH, TW, ps) {
    const I = pista.int, cv2 = document.createElement('canvas'); cv2.width = TW * ps; cv2.height = PH * ps;
    const c = cv2.getContext('2d'); c.scale(ps, ps);
    const gr = c.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, I.cielo[0]); gr.addColorStop(0.55, I.cielo[1]); gr.addColorStop(0.92, I.cielo[2]); gr.addColorStop(1, '#050403');
    c.fillStyle = gr; c.fillRect(0, 0, TW, PH);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
    for (let y = PH * 0.15, f = 0; y < PH * 0.92; y += 9, f++) { c.beginPath(); c.moveTo(0, y); c.lineTo(TW, y); c.stroke(); for (let x = (f % 2) * 14; x < TW; x += 28) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); } }
    c.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 5; k++) c.fillRect(0, PH * (0.05 + k * 0.04), TW, PH * 0.012); // falso arco
    c.fillStyle = I.acento; c.globalAlpha = 0.55; c.fillRect(0, PH * 0.6, TW, PH * 0.035); c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,230,170,.35)'; for (let x = 6; x < TW; x += 22) c.fillRect(x, PH * 0.607, 6, PH * 0.02); // glifos del friso
    for (let x = PW / 24; x < TW; x += PW / 12) {
      const y = PH * 0.72, gl = c.createRadialGradient(x, y, 1, x, y, 26); gl.addColorStop(0, 'rgba(255,190,90,.55)'); gl.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = gl; c.fillRect(x - 26, y - 26, 52, 52);
      c.fillStyle = '#5a3a1e'; c.fillRect(x - 1.5, y, 3, 8); c.fillStyle = '#ffcf6b'; c.beginPath(); c.ellipse(x, y - 2, 2.5, 4, 0, 0, 7); c.fill();
    }
    return cv2;
  }
  function cielo() {
    if (!R || techo < 0.01) return;
    const { PW, PH, ps } = pano, TW = Math.round(PW + Math.ceil(LW) + 2);
    if (!R.pano || R.pano.base !== pano) R.pano = { base: pano, cv: panoInterior(PW, PH, TW, ps) };
    const sx = Math.floor(((((cam.ang - Math.atan2(LW / 2, cam.F)) / (2 * Math.PI)) % 1) + 1) % 1 * PW * ps);
    g.globalAlpha = techo; g.drawImage(R.pano.cv, sx, 0, Math.round(LW * ps), PH * ps, 0, 0, LW, PH); g.globalAlpha = 1;
  }
  // Niebla oscura sobre el piso lejano (encima de la bruma de afuera).
  function niebla() {
    if (!R || dentro < 0.01) return;
    const gr = g.createLinearGradient(0, cam.hy - 2, 0, cam.hy + (LH - cam.hy) * 0.45);
    gr.addColorStop(0, 'rgba(6,4,3,.95)'); gr.addColorStop(1, 'rgba(6,4,3,0)');
    g.globalAlpha = dentro; g.fillStyle = gr; g.fillRect(0, cam.hy - 2, LW, (LH - cam.hy) * 0.45 + 2); g.globalAlpha = 1;
  }
  // [distancia donde empiezan a desvanecerse los sprites, en cuántos px]: más corto adentro.
  const lejania = () => [1100 - 550 * dentro, 500 - 150 * dentro];
  const alcanceDecor = () => 1600 - 700 * dentro;
  // Viñeta (luz limitada), encima de la escena.
  function luz() {
    if (!R || dentro < 0.01) return;
    if (!R.vineta || R.vineta.w !== LW || R.vineta.h !== LH) {
      const v = document.createElement('canvas'); v.width = Math.ceil(LW); v.height = Math.ceil(LH);
      const c = v.getContext('2d'), m = Math.max(LW, LH), gr = c.createRadialGradient(LW / 2, LH * 0.66, m * 0.18, LW / 2, LH * 0.6, m * 0.78);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(10,6,3,.35)'); gr.addColorStop(1, 'rgba(6,3,1,.88)');
      c.fillStyle = gr; c.fillRect(0, 0, LW, LH);
      R.vineta = { cv: v, w: LW, h: LH };
    }
    g.globalAlpha = dentro; g.drawImage(R.vineta.cv, 0, 0, LW, LH); g.globalAlpha = 1;
  }
  let resplandor = null;
  // Brillo de una antorcha (p = proyección de su base; d = adorno con alt y h), en modo «lighter».
  function brillo(p, d, t) {
    if (!resplandor) {
      resplandor = document.createElement('canvas'); resplandor.width = resplandor.height = 64;
      const c = resplandor.getContext('2d'), gr = c.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,110,.95)'); gr.addColorStop(0.4, 'rgba(255,150,60,.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    }
    const parpadeo = REDUCIR ? 1 : 0.88 + 0.12 * Math.sin(t * 11 + d.x * 0.7) * Math.sin(t * 7.3 + d.y);
    const w = 90 * p.s * parpadeo, y = p.y - d.h * p.s * 0.85;
    const a = g.globalAlpha; g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * (0.35 + 0.4 * dentro);
    g.drawImage(resplandor, p.x - w / 2, y - w / 2, w, w);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
  }
  // Suaviza la luz del interior según la muestra donde va la cámara (≈ 0.35 s; de golpe con movimiento reducido).
  function paso(idx, dt) {
    if (!R) { dentro = techo = 0; return; }
    const t = R.tramos[R.tramoDe[((idx % N) + N) % N]];
    let objD = 0;
    if (t) objD = t.techo ? 1 : 0.5;
    const objT = t?.techo ? 1 : 0, f = REDUCIR ? 1 : Math.min(1, dt * 8);
    dentro += (objD - dentro) * f; techo += (objT - techo) * f;
  }
  // Minimapa: los tramos interiores en ámbar sobre el trazado.
  function minimapa(c, mm) {
    if (!R) return;
    c.strokeStyle = '#f59e0b'; c.lineWidth = 3; c.lineCap = 'round';
    for (const t of R.tramos) {
      c.beginPath();
      for (let d = 0; d <= t.largo; d += 2) { const q = M.pts[(t.i0 + d) % N]; c.lineTo(mm.ox + q.x * mm.esc, mm.oy + q.y * mm.esc); }
      c.stroke();
    }
  }
  function estado() {
    if (!R) return { dentro: 0, interior: false, tramos: 0, columnas: 0 };
    const w = yo ? R.muros.w[yo.idx] : 0;
    return { velMuro: ultimoMuro, dentro: Math.round(dentro * 100) / 100, interior: w > 0, tramos: R.tramos.length, columnas: R.columnas.length, lateral: yo ? Math.round(lateralDe(yo)) : 0, muro: w };
  }
  // Muestras desde el inicio del tramo t a un punto sin obstáculos cerca (de la mitad hacia adelante), para las capturas.
  function libreEn(t) {
    const obst = [...R.columnas, ...R.compuertas, ...R.bloques, ...R.rocas].map(o => o.idx);
    for (let d = Math.floor(t.largo / 2); d < t.largo - 10; d += 5) {
      const i = (t.i0 + d) % N;
      if (obst.every(o => adelante(i, o) > 45 && adelante(o, i) > 10)) return d;
    }
    return Math.floor(t.largo / 2);
  }
  // Ganchos de prueba (?prueba=1): te pone frente a un obstáculo para ver que actúa.
  function prueba(tipo) {
    if (!R || !yo) return false;
    const coloca = (i, lado, vel) => { const q = punto(i, lado); yo.idx = (i + N) % N; yo.x = q.x; yo.y = q.y; yo.ang = M.pts[yo.idx].a; yo.vel = vel; yo.vx = Math.cos(yo.ang) * vel; yo.vy = Math.sin(yo.ang) * vel; yo.giro = 0; yo.estrella = 0; yo.zona = null; };
    const [que, k] = String(tipo).split(':'), t = R.tramos[Number(k) || 0];
    if (que === 'entrada' && t) { coloca(t.i0 - 40, 0, 0); yo.ahogado = 1.2; return true; } // capturas: frente a la portada
    if (que === 'adentro' && t) { coloca(t.i0 + libreEn(t), 0, 0); yo.ahogado = 1.2; return true; }
    if (tipo === 'muro') {
      const t = R.tramos[0], i = (t.i0 + Math.floor(t.largo / 2)) % N, s = t.muro || 1;
      coloca(i, s * (t.w - 14), A.VEL_KART); yo.ang += s * 0.6; yo.vx = Math.cos(yo.ang) * yo.vel; yo.vy = Math.sin(yo.ang) * yo.vel; return true;
    }
    if (tipo === 'columna' && R.columnas.length) { const c = R.columnas[2] || R.columnas[0]; coloca(c.idx - 6, c.lado, A.VEL_KART); return true; }
    if (tipo === 'compuerta' && R.compuertas.length) { const z = R.compuertas[0]; coloca(z.idx - 8, KP.centroCompuerta(z, tCarrera + 0.15), A.VEL_KART); return true; }
    if (tipo === 'bloques' && R.bloques.length) { const z = R.bloques[0]; coloca(z.idx, lateralZona(z), 0); yo.ahogado = 6; return true; }
    if (tipo === 'roca' && R.rocas.length) { const z = R.rocas[0]; coloca(z.idx, KP.ladoRoca(z, tCarrera + 1 / 60), 0); return true; }
    return false;
  }

  /* ---------------- Adornos de la copa (dibujo en su lienzo w×h, px de mundo) ---------------- */
  const D = {
    palmaDatil(c, w, h) {
      sombraDecor(c, w, h, w * 0.3);
      c.strokeStyle = '#7a5530'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, h - 1); c.quadraticCurveTo(w * 0.42, h * 0.5, w / 2 + 2, h * 0.28); c.stroke();
      c.strokeStyle = '#3f8a3a'; c.lineWidth = 2.4; c.lineCap = 'round';
      for (const [dx, dy] of [[-13, 8], [-9, -2], [0, -6], [9, -2], [13, 8], [-6, 10], [6, 10]]) { c.beginPath(); c.moveTo(w / 2 + 2, h * 0.28); c.quadraticCurveTo(w / 2 + 2 + dx * 0.6, h * 0.28 + dy - 6, w / 2 + 2 + dx, h * 0.28 + dy); c.stroke(); }
      c.fillStyle = '#d9822b'; for (const dx of [-2, 2, 0]) { c.beginPath(); c.arc(w / 2 + 2 + dx, h * 0.32, 1.4, 0, 7); c.fill(); }
    },
    piramideChica(c, w, h) {
      c.fillStyle = '#d4b06f'; c.beginPath(); c.moveTo(0, h); c.lineTo(w / 2, 0); c.lineTo(w, h); c.fill();
      c.fillStyle = '#b08b4f'; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w, h); c.lineTo(w * 0.62, h); c.fill();
    },
    esfingeGrande(c, w, h) {
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#c9a66b'; rr(c, w * 0.08, h * 0.55, w * 0.84, h * 0.42, 6); c.fill(); // cuerpo de león echado
      c.fillStyle = '#b8945a'; c.fillRect(w * 0.06, h * 0.86, w * 0.3, h * 0.12); // patas al frente
      c.fillStyle = '#c9a66b'; c.fillRect(w * 0.12, h * 0.2, w * 0.24, h * 0.45); // cabeza
      c.fillStyle = '#3b6fb0'; for (let k = 0; k < 5; k++) c.fillRect(w * 0.08, h * (0.2 + k * 0.09), w * 0.06, h * 0.045); // tocado a rayas
      for (let k = 0; k < 5; k++) c.fillRect(w * 0.34, h * (0.2 + k * 0.09), w * 0.06, h * 0.045);
      c.fillStyle = '#e8c35a'; c.fillRect(w * 0.12, h * 0.16, w * 0.24, h * 0.06);
      c.fillStyle = '#5a4128'; c.fillRect(w * 0.18, h * 0.34, w * 0.03, h * 0.03); c.fillRect(w * 0.27, h * 0.34, w * 0.03, h * 0.03); // ojos tranquilos
    },
    columnaMaya(c, w, h) {
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#bdb39a'; c.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.88);
      c.fillStyle = '#a49a80'; c.fillRect(w * 0.05, h * 0.06, w * 0.9, h * 0.08);
      c.fillStyle = '#8e2f22'; for (let k = 0; k < 4; k++) c.fillRect(w * 0.25, h * (0.25 + k * 0.17), w * 0.5, h * 0.05); // serpiente tallada y pintada
    },
    chacmool(c, w, h) {
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#9d9784'; rr(c, w * 0.05, h * 0.55, w * 0.9, h * 0.4, 3); c.fill();
      c.fillStyle = '#8a8471'; c.fillRect(w * 0.1, h * 0.2, w * 0.22, h * 0.4); c.fillRect(w * 0.7, h * 0.35, w * 0.2, h * 0.25);
      c.fillStyle = '#b5ae98'; c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.14, h * 0.07, 0, 0, 7); c.fill(); // la vasija en el regazo
    },
    kukulkan(c, w, h) { // cabeza de serpiente emplumada de la escalinata, de piedra
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#b9b097'; rr(c, w * 0.08, h * 0.3, w * 0.84, h * 0.68, 4); c.fill();
      c.fillStyle = '#8f8670'; c.fillRect(w * 0.08, h * 0.62, w * 0.84, h * 0.08); // boca
      c.fillStyle = '#efe9da'; for (let k = 0; k < 5; k++) c.fillRect(w * (0.16 + k * 0.15), h * 0.62, w * 0.05, h * 0.06);
      c.fillStyle = '#4f8a5a'; for (let k = 0; k < 4; k++) c.fillRect(w * (0.12 + k * 0.2), h * 0.2, w * 0.14, h * 0.14); // plumas
      c.fillStyle = '#2b2a24'; c.beginPath(); c.arc(w * 0.3, h * 0.45, 1.6, 0, 7); c.arc(w * 0.7, h * 0.45, 1.6, 0, 7); c.fill();
    },
    tronoJaguar(c, w, h) { // trono del jaguar rojo con manchas de jade
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#6b6457'; c.fillRect(w * 0.05, h * 0.78, w * 0.9, h * 0.2);
      c.fillStyle = '#b8322b'; rr(c, w * 0.12, h * 0.42, w * 0.7, h * 0.38, 6); c.fill();
      c.fillRect(w * 0.18, h * 0.72, w * 0.08, h * 0.1); c.fillRect(w * 0.66, h * 0.72, w * 0.08, h * 0.1);
      c.beginPath(); c.ellipse(w * 0.8, h * 0.38, w * 0.13, h * 0.15, 0, 0, 7); c.fill(); // cabeza
      c.fillStyle = '#2fb38a'; for (const [x, y] of [[0.25, 0.52], [0.4, 0.6], [0.55, 0.5], [0.68, 0.62], [0.32, 0.68]]) { c.beginPath(); c.arc(w * x, h * y, 2.2, 0, 7); c.fill(); }
      c.fillStyle = '#2fb38a'; c.beginPath(); c.arc(w * 0.84, h * 0.34, 1.6, 0, 7); c.fill(); // ojo de jade
      c.strokeStyle = '#b8322b'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(w * 0.13, h * 0.5); c.quadraticCurveTo(w * 0.02, h * 0.3, w * 0.1, h * 0.18); c.stroke(); // cola
    },
    obelisco(c, w, h) {
      sombraDecor(c, w, h, w * 0.4);
      c.fillStyle = '#d6b780'; c.beginPath(); c.moveTo(w * 0.22, h); c.lineTo(w * 0.32, h * 0.1); c.lineTo(w * 0.68, h * 0.1); c.lineTo(w * 0.78, h); c.fill();
      c.fillStyle = '#e8c35a'; c.beginPath(); c.moveTo(w * 0.32, h * 0.1); c.lineTo(w / 2, 0); c.lineTo(w * 0.68, h * 0.1); c.fill();
      c.fillStyle = 'rgba(90,60,30,.45)'; for (let k = 0; k < 7; k++) c.fillRect(w * 0.44, h * (0.2 + k * 0.1), w * 0.12, h * 0.04);
    },
    estatuaFaraon(c, w, h) { // coloso sentado
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#c4a171'; c.fillRect(w * 0.1, h * 0.8, w * 0.8, h * 0.2);
      c.fillStyle = '#d2b07d'; c.fillRect(w * 0.25, h * 0.45, w * 0.5, h * 0.37); c.fillRect(w * 0.2, h * 0.6, w * 0.6, h * 0.22);
      c.fillRect(w * 0.36, h * 0.18, w * 0.28, h * 0.3);
      c.fillStyle = '#3b6fb0'; c.fillRect(w * 0.3, h * 0.18, w * 0.06, h * 0.26); c.fillRect(w * 0.64, h * 0.18, w * 0.06, h * 0.26);
      c.fillStyle = '#e8c35a'; c.fillRect(w * 0.34, h * 0.12, w * 0.32, h * 0.07);
      c.fillStyle = '#8a6a40'; c.fillRect(w * 0.47, h * 0.42, w * 0.06, h * 0.07); // barba
    },
    esfinge(c, w, h) { // esfinge con cabeza de carnero sobre su pedestal
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#b8955f'; c.fillRect(0, h * 0.72, w, h * 0.28);
      c.fillStyle = '#cfae74'; rr(c, w * 0.15, h * 0.42, w * 0.7, h * 0.32, 4); c.fill();
      c.beginPath(); c.ellipse(w * 0.22, h * 0.36, w * 0.13, h * 0.17, 0, 0, 7); c.fill();
      c.strokeStyle = '#9a7845'; c.lineWidth = 1.6; c.beginPath(); c.arc(w * 0.22, h * 0.38, w * 0.07, 0.5, 5.5); c.stroke(); // cuerno
    },
    arbolRaices(c, w, h) {
      sombraDecor(c, w, h, w * 0.45);
      c.strokeStyle = '#9b9583'; c.lineCap = 'round';
      for (const [dx, lw] of [[-0.4, 3], [-0.2, 2.5], [0.2, 2.5], [0.42, 3]]) { c.lineWidth = lw; c.beginPath(); c.moveTo(w / 2, h * 0.55); c.quadraticCurveTo(w * (0.5 + dx * 0.5), h * 0.8, w * (0.5 + dx), h - 1); c.stroke(); }
      c.fillStyle = '#a8a290'; c.fillRect(w * 0.43, h * 0.3, w * 0.14, h * 0.4);
      c.fillStyle = '#2f6f34'; for (const [x, y, r] of [[0.5, 0.2, 0.3], [0.3, 0.28, 0.2], [0.7, 0.28, 0.2]]) { c.beginPath(); c.arc(w * x, h * y, w * r, 0, 7); c.fill(); }
    },
    torreAngkor(c, w, h) {
      c.fillStyle = '#767a6a';
      c.beginPath(); c.moveTo(w * 0.12, h); c.quadraticCurveTo(w * 0.08, h * 0.35, w / 2, 0); c.quadraticCurveTo(w * 0.92, h * 0.35, w * 0.88, h); c.fill();
      c.strokeStyle = 'rgba(40,45,35,.4)'; c.lineWidth = 1.2; for (let k = 1; k < 8; k++) { const y = h * k / 8, a = 0.38 * Math.sqrt(k / 8) + 0.02; c.beginPath(); c.moveTo(w * (0.5 - a), y); c.lineTo(w * (0.5 + a), y); c.stroke(); }
      c.fillStyle = '#2f3328'; c.fillRect(w * 0.42, h * 0.78, w * 0.16, h * 0.22);
    },
    naga(c, w, h) { // remate de la balaustrada: serpiente de siete cabezas en abanico
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#8b8878'; c.fillRect(0, h * 0.75, w, h * 0.2);
      for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + k * 0.7 / 6); c.beginPath(); c.ellipse(w / 2 - Math.cos(a) * w * 0.32, h * 0.62 - Math.sin(a) * h * 0.45, 2.4, 3.2, 0, 0, 7); c.fill(); }
      c.beginPath(); c.moveTo(w * 0.2, h * 0.75); c.quadraticCurveTo(w / 2, h * 0.2, w * 0.8, h * 0.75); c.fill();
    },
    pilar(c, w, h) {
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#8f8b79'; c.fillRect(w * 0.2, h * 0.08, w * 0.6, h * 0.92);
      c.fillStyle = '#7a7666'; c.fillRect(0, 0, w, h * 0.1); c.fillRect(w * 0.1, h * 0.9, w * 0.8, h * 0.1);
    },
    antorcha(c, w, h) {
      c.fillStyle = '#3b2a1a'; c.fillRect(w * 0.4, h * 0.45, w * 0.2, h * 0.55);
      c.fillStyle = '#6b4a2a'; c.fillRect(w * 0.2, h * 0.4, w * 0.6, h * 0.1);
      c.fillStyle = '#ff9f2e'; c.beginPath(); c.moveTo(w * 0.15, h * 0.42); c.quadraticCurveTo(w * 0.2, h * 0.1, w / 2, 0); c.quadraticCurveTo(w * 0.8, h * 0.1, w * 0.85, h * 0.42); c.fill();
      c.fillStyle = '#ffe28a'; c.beginPath(); c.ellipse(w / 2, h * 0.3, w * 0.18, h * 0.12, 0, 0, 7); c.fill();
    },
    columnaHipostila(c, w, h) { // columna papiriforme con capitel abierto y bandas pintadas
      sombraDecor(c, w, h, w * 0.45);
      c.fillStyle = '#c9a874'; c.fillRect(w * 0.18, h * 0.14, w * 0.64, h * 0.86);
      c.fillStyle = '#b38f5c'; c.fillRect(w * 0.18, h * 0.14, w * 0.14, h * 0.86);
      c.fillStyle = '#d8ba86'; c.beginPath(); c.moveTo(w * 0.18, h * 0.16); c.lineTo(0, h * 0.04); c.lineTo(w, h * 0.04); c.lineTo(w * 0.82, h * 0.16); c.fill();
      c.fillStyle = '#b89a66'; c.fillRect(0, 0, w, h * 0.045);
      for (const [y, col] of [[0.24, '#2f5f8a'], [0.3, '#b8322b'], [0.5, '#2f5f8a'], [0.72, '#3f8a5a']]) { c.fillStyle = col; c.fillRect(w * 0.18, h * y, w * 0.64, h * 0.025); }
      c.fillStyle = 'rgba(90,60,30,.4)'; for (let k = 0; k < 5; k++) c.fillRect(w * 0.42, h * (0.36 + k * 0.06), w * 0.16, h * 0.03); // jeroglíficos
    },
    bloqueCae(c, w, h) {
      c.fillStyle = matiz(pista ? pista.int.muro : '#9a774c', -0.1); c.fillRect(0, h * 0.18, w, h * 0.82);
      c.fillStyle = matiz(pista ? pista.int.muro : '#9a774c', 0.15); c.fillRect(0, 0, w, h * 0.2);
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, w - 1, h - 1); c.beginPath(); c.moveTo(0, h * 0.6); c.lineTo(w, h * 0.6); c.moveTo(w * 0.5, h * 0.2); c.lineTo(w * 0.5, h * 0.6); c.stroke();
    },
    rocaRodante(c, w, h) {
      const gr = c.createRadialGradient(w * 0.35, h * 0.35, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, '#b3a58c'); gr.addColorStop(1, '#5e5444');
      c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 0.5, 0, 7); c.fill();
      c.strokeStyle = 'rgba(40,30,20,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * 0.2, h * 0.4); c.quadraticCurveTo(w / 2, h * 0.55, w * 0.8, h * 0.4); c.moveTo(w / 2, h * 0.1); c.lineTo(w * 0.45, h * 0.9); c.stroke();
    },
  };
  // Tamaño base de cada adorno nuevo (los que no salen de `decor` de las pistas).
  const BASE = { esfingeGrande: [120, 66], kukulkan: [30, 24], tronoJaguar: [64, 50], esfinge: [34, 26], naga: [26, 20], pilar: [14, 46], antorcha: [9, 22], columnaHipostila: [34, 150], bloqueCae: [48, 48], rocaRodante: [44, 44], torreAngkor: [64, 96] };
  const DIBUJO = Object.entries(D);

  return { preparar, activo, tapaDecor, decorar, pintarFondo, pintarBajo, pintarPiso, ZONA_DIBUJO, DINAMICAS, fisica, carril, juntar, dibujar, silueta, cielo, niebla, lejania, alcanceDecor, luz, brillo, paso, minimapa, estado, prueba, DIBUJO, BASE };
})();
