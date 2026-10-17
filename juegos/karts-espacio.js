/* Karts Turbo: dibujo de las pistas espaciales (openspec: karts-copa-espacio). Script clásico SIN estado: lo carga
   karts.html después de karts-pistas.js y antes de su script; cada función recibe lo que necesita.
   - pintarPiso(P): textura del piso (vacío con estrellas, camino flotante metálico translúcido, neón donde hay
     barandal, franjas ámbar donde no, huecos, rampas, gravedad baja, portales, compuertas, turbo y antiturbo).
   - dibujo(nombre) / tamano(nombre): sprites propios (postes, boyas, módulos, rocas, dron de rescate, portal, hojas de
     compuerta…). Los nombres con color llevan el hex: 'espPoste_22d3ee'.
   - pintarCielo(...): panorama de 360° (estrellas, planeta con anillos, nebulosa, estación, luna con base).
   - prepararParche / pintarParche: la plataforma móvil se escribe directo en los mipmaps del piso (Mode-7).
   Inspiración de ciencia ficción, todo original: sin nombres, naves, logotipos ni personajes de ninguna franquicia.
   Todo se pinta una vez por pista (textura y panorama) o se cachea (sprites): cuesta cero por cuadro. */
(function (raiz) {
  'use strict';
  const KP = raiz.KartsPistas;
  const TAU = Math.PI * 2;

  // ---------------- Utilidades ----------------
  function ruta(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); }
  function trazo(c, pts, ancho, color, cerrar) {
    ruta(c, pts); if (cerrar) c.closePath();
    c.lineWidth = ancho; c.strokeStyle = color; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }
  // Línea paralela al camino (lado en px) de la muestra i0 a la i1.
  function linea(P, i0, i1, lado) {
    const out = [];
    for (let i = i0; i <= i1; i++) { out.push(P.punto(i, lado)); }
    return out;
  }
  // Cuadrilátero del camino entre las muestras i e i + 1, de lado a a lado b.
  function cuadro(c, P, i, a, b) {
    const p1 = P.punto(i, a), p2 = P.punto(i, b), p3 = P.punto(i + 1, b), p4 = P.punto(i + 1, a);
    c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.lineTo(p4.x, p4.y); c.closePath(); c.fill();
  }
  // Tramos seguidos de muestras con la misma condición: [[i0, i1, valor], ...].
  function tramos(n, valor) {
    const out = [];
    let i0 = 0, v = valor(0);
    for (let i = 1; i <= n; i++) {
      const w = i < n ? valor(i) : null;
      if (w !== v) { out.push([i0, i - 1, v]); i0 = i; v = w; }
    }
    return out;
  }
  const estrella = (c, x, y, t, color) => { c.fillStyle = color; c.fillRect(x, y, t, t); };
  const ESTRELLAS = ['#ffffff', '#dbeafe', '#fde68a', '#c7d2fe', '#bbf7d0'];
  const NEBULOSA = { orbital: ['#1e3a8a', '#0e7490'], anillos: ['#7c2d12', '#4c1d95'], cinturon: ['#7f1d1d', '#78350f'], nebulosa: ['#047857', '#86198f'] };

  // ---------------- Piso ----------------
  // Vacío: negro azulado, nubes de nebulosa muy tenues y estrellas (se ven debajo del camino translúcido).
  function pintarVacio(P) {
    const { c, W, H, r } = P, col = P.pista.color, neb = NEBULOSA[P.pista.tema.espacio];
    c.fillStyle = col.fondo; c.fillRect(0, 0, W, H);
    for (let k = 0; k < P.cuantos(26); k++) {
      const x = r() * W, y = r() * H, rad = 180 + r() * 420, g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, neb[k % 2]); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.16 + r() * 0.12; c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.globalAlpha = 1;
    for (let k = 0; k < P.cuantos(5200); k++) estrella(c, r() * W, r() * H, r() < 0.88 ? 2 : 3, ESTRELLAS[Math.floor(r() * ESTRELLAS.length)]);
  }
  // Camino metálico translúcido con juntas de panel, resplandor de neón debajo y línea central.
  function pintarCamino(P) {
    const { c, M, N } = P, col = P.pista.color, m = P.pista.mitad;
    c.save();
    c.globalAlpha = 0.05; trazo(c, M.pts, m * 2 + 170, col.borde1, true);
    c.globalAlpha = 0.12; trazo(c, M.pts, m * 2 + 50, col.borde1, true);
    c.globalAlpha = 0.84; trazo(c, M.pts, m * 2, col.camino, true);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < N; i += 12) cuadro(c, P, i, -m, m); // paneles alternos
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5;
    for (let i = 0; i < N; i += 6) { const a = P.punto(i, -m), b = P.punto(i, m); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    for (const l of [-m / 2, m / 2]) { c.globalAlpha = 0.35; trazo(c, linea(P, 0, N, l), 1.5, '#0b1020'); }
    c.globalAlpha = 0.55; c.setLineDash([16, 18]); trazo(c, linea(P, 0, N, 0), 3, col.linea); c.setLineDash([]);
    c.globalAlpha = 1;
  }
  // Orillas: neón continuo donde hay barandal; franjas ámbar y negras donde no (ahí se cae).
  function pintarOrillas(P) {
    const { c, N, marcas } = P, col = P.pista.color, m = P.pista.mitad, K = KP.MARCA;
    const abierto = i => !!(marcas[i] & K.ABIERTO), hueco = i => !!(marcas[i] & (K.HUECO | K.PLATAFORMA));
    for (const [i0, i1, ab] of tramos(N, abierto)) {
      if (ab) continue;
      for (const s of [-1, 1]) {
        const l = linea(P, i0, i1 + 1, s * (m + 3));
        c.globalAlpha = 0.3; trazo(c, l, 12, col.borde1);
        c.globalAlpha = 1; trazo(c, l, 3.5, col.borde1); trazo(c, l, 1.2, '#ffffff');
      }
    }
    for (let i = 0; i < N; i += 2) {
      if (!abierto(i) || hueco(i)) continue;
      c.fillStyle = (i / 2) % 2 ? col.borde2 : '#141414';
      for (const s of [-1, 1]) cuadro(c, P, i, s * (m - 2), s * (m + 9));
    }
  }
  // Huecos de las rampas y de las plataformas: vacío con estrellas y bordes de peligro.
  // Franja de peligro a lo ancho del camino entre las muestras i e i + paso (borde de un hueco).
  function franjaPeligro(P, i, paso) {
    const { c } = P, m = P.pista.mitad;
    for (let k = -m; k < m; k += 12) {
      c.fillStyle = Math.round(k / 12) % 2 ? P.pista.color.borde2 : '#141414';
      const a = P.punto(i, k), b = P.punto(i, k + 12), b2 = P.punto(i + paso, k + 12), a2 = P.punto(i + paso, k);
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(b2.x, b2.y); c.lineTo(a2.x, a2.y); c.fill();
    }
  }
  function pintarHueco(P, z) {
    const { c, r } = P, m = P.pista.mitad;
    c.fillStyle = P.pista.color.fondo;
    for (let i = z.i0; i <= z.i1; i++) cuadro(c, P, i, -m - 18, m + 18);
    for (let k = 0; k < 40; k++) {
      const p = P.punto(z.i0 + Math.floor(r() * (z.i1 - z.i0 + 1)), (r() * 2 - 1) * (m + 14));
      estrella(c, p.x, p.y, 2, ESTRELLAS[k % ESTRELLAS.length]);
    }
    franjaPeligro(P, z.i0, -1);
    franjaPeligro(P, z.i1 + 1, 1);
  }
  function pintarHuecos(P) {
    for (const z of P.zonas) if (z.tipo === 'brecha' || z.tipo === 'plataforma') pintarHueco(P, z);
  }
  // Gravedad baja: velo morado con anillos.
  function pintarGravedad(P) {
    const { c } = P, m = P.pista.mitad;
    for (const z of P.zonas.filter(x => x.tipo === 'gravedad')) {
      c.fillStyle = 'rgba(168,85,247,.22)';
      for (let i = z.i0; i <= z.i1; i++) cuadro(c, P, i, -m, m);
      c.strokeStyle = 'rgba(216,180,254,.55)'; c.lineWidth = 2;
      for (let i = z.i0 + 6; i < z.i1; i += 14) { const p = P.punto(i, 0); c.save(); c.translate(p.x, p.y); c.rotate(P.M.pts[i % P.N].a); c.beginPath(); c.ellipse(0, 0, 9, m * 0.7, 0, 0, TAU); c.stroke(); c.restore(); }
    }
  }
  function pintarPiso(P) {
    pintarVacio(P);
    pintarCamino(P);
    pintarGravedad(P);
    pintarOrillas(P);
    pintarHuecos(P);
  }

  // ---------------- Zonas en el piso (marco girado: x hacia adelante, y de lado) ----------------
  function flechas(c, color, dir, r) {
    c.strokeStyle = color; c.lineWidth = 4; c.lineJoin = 'miter';
    for (const dx of [-10, 0, 10]) { c.beginPath(); c.moveTo(dx - 5 * dir, -r * 0.5); c.lineTo(dx + 4 * dir, 0); c.lineTo(dx - 5 * dir, r * 0.5); c.stroke(); }
  }
  const ZONAS = {
    turbo(c, z) { // placa de neón con flechas hacia adelante
      c.fillStyle = 'rgba(34,211,238,.25)'; c.fillRect(-z.r, -z.r * 0.75, z.r * 2, z.r * 1.5);
      c.strokeStyle = '#22d3ee'; c.lineWidth = 2; c.strokeRect(-z.r, -z.r * 0.75, z.r * 2, z.r * 1.5);
      flechas(c, '#a5f3fc', 1, z.r);
    },
    antiturbo(c, z) { // franja roja con flechas hacia atrás: frena
      c.fillStyle = 'rgba(239,68,68,.32)'; c.fillRect(-z.r, -z.r * 0.75, z.r * 2, z.r * 1.5);
      c.strokeStyle = '#ef4444'; c.lineWidth = 2; c.strokeRect(-z.r, -z.r * 0.75, z.r * 2, z.r * 1.5);
      flechas(c, '#fecaca', -1, z.r);
    },
    brecha(c, z, m) { // rampa de neón antes del hueco
      for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#0f172a' : '#e2e8f0'; c.fillRect(-14 + k * 4, -m + 2, 4, m * 2 - 4); }
      c.fillStyle = '#facc15'; for (const y of [-m * 0.5, 0, m * 0.5]) { c.beginPath(); c.moveTo(4, y - 9); c.lineTo(16, y); c.lineTo(4, y + 9); c.fill(); }
    },
    portal(c, z) { // resplandor del anillo en el piso
      const g = c.createRadialGradient(0, 0, 2, 0, 0, z.r * 1.6); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.4, 'rgba(236,72,153,.6)'); g.addColorStop(1, 'rgba(236,72,153,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, z.r * 1.6, 0, TAU); c.fill();
    },
    compuerta(c, z, m) { // marco de la compuerta: franja de peligro de lado a lado
      for (let y = -m - 10; y < m + 10; y += 8) { c.fillStyle = (Math.round(y / 8) % 2) ? '#facc15' : '#111827'; c.fillRect(-5, y, 10, 8); }
    },
    asteroide(c, z) { // órbita de la roca: línea punteada de orilla a orilla
      c.strokeStyle = 'rgba(253,186,116,.55)'; c.lineWidth = 2; c.setLineDash([6, 8]);
      c.beginPath(); c.moveTo(0, -(z.ancho || 140)); c.lineTo(0, z.ancho || 140); c.stroke(); c.setLineDash([]);
    },
    plataforma(c, z, m) { // flechas de guía antes del hueco
      c.fillStyle = 'rgba(250,204,21,.8)'; for (const y of [-m * 0.6, m * 0.6]) { c.beginPath(); c.moveTo(-18, y - 6); c.lineTo(-8, y); c.lineTo(-18, y + 6); c.fill(); }
    },
  };
  // Salida del portal: el mismo resplandor en verde.
  function salidaPortal(c, z) {
    const g = c.createRadialGradient(z.sx, z.sy, 2, z.sx, z.sy, z.r * 1.6); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.4, 'rgba(52,211,153,.6)'); g.addColorStop(1, 'rgba(52,211,153,0)');
    c.fillStyle = g; c.beginPath(); c.arc(z.sx, z.sy, z.r * 1.6, 0, TAU); c.fill();
  }

  // ---------------- Sprites (c en px de mundo, w × h) ----------------
  const hex = nombre => '#' + nombre.split('_')[1];
  function brillo(c, x, y, rad, color) {
    const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
  }
  function roca(c, w, h, base, luz, semilla) {
    const cx = w / 2, cy = h * 0.55, n = 9;
    const g = c.createRadialGradient(cx - w * 0.18, cy - h * 0.2, 1, cx, cy, w * 0.55); g.addColorStop(0, luz); g.addColorStop(0.45, base); g.addColorStop(1, '#0c0a09');
    c.fillStyle = g; c.beginPath();
    for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = 0.82 + 0.18 * Math.sin(k * 2.7 + semilla); c.lineTo(cx + Math.cos(a) * w * 0.46 * rr, cy + Math.sin(a) * h * 0.42 * rr); }
    c.closePath(); c.fill();
    for (const [dx, dy, rad] of [[0.18, 0.1, 0.09], [-0.2, 0.2, 0.06], [0.05, -0.12, 0.05]]) { // cráteres con borde iluminado
      c.fillStyle = 'rgba(0,0,0,.32)'; c.beginPath(); c.arc(cx + dx * w, cy + dy * h, rad * w, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 0.8; c.beginPath(); c.arc(cx + dx * w, cy + dy * h, rad * w, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
    }
  }
  const SPRITES = {
    espPoste: { t: [8, 24], f(c, w, h, n) { c.fillStyle = '#1f2937'; c.fillRect(w * 0.35, h * 0.25, w * 0.3, h * 0.75); brillo(c, w / 2, h * 0.2, w * 0.7, hex(n)); } },
    espBoya: { t: [14, 24], f(c, w, h) { c.fillStyle = '#111827'; c.fillRect(w * 0.42, h * 0.4, w * 0.16, h * 0.6); c.fillStyle = '#f59e0b'; c.beginPath(); c.moveTo(w / 2, 1); c.lineTo(w - 1, h * 0.45); c.lineTo(1, h * 0.45); c.closePath(); c.fill(); c.fillStyle = '#111'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('!', w / 2, h * 0.4); brillo(c, w / 2, 3, 4, '#fbbf24'); } },
    espPanel: { t: [50, 28], f(c, w, h) { c.fillStyle = '#334155'; c.fillRect(w * 0.47, h * 0.3, w * 0.06, h * 0.7); for (const s of [0, 1]) { c.fillStyle = '#1e3a8a'; c.fillRect(s * w * 0.55, h * 0.05, w * 0.45, h * 0.45); c.strokeStyle = '#60a5fa'; c.lineWidth = 0.7; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(s * w * 0.55 + k * w * 0.11, h * 0.05); c.lineTo(s * w * 0.55 + k * w * 0.11, h * 0.5); c.stroke(); } } } },
    espAntena: { t: [18, 56], f(c, w, h) { c.strokeStyle = '#94a3b8'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, h * 0.2); c.stroke(); for (let y = h * 0.35; y < h; y += 8) { c.beginPath(); c.moveTo(w * 0.25, y); c.lineTo(w * 0.75, y + 4); c.stroke(); } c.fillStyle = '#cbd5e1'; c.beginPath(); c.ellipse(w / 2, h * 0.22, w * 0.45, h * 0.06, 0, 0, Math.PI); c.fill(); brillo(c, w / 2, h * 0.12, 5, '#f43f5e'); } },
    espModulo: { t: [96, 60], f(c, w, h) { c.fillStyle = '#475569'; c.fillRect(w * 0.1, h * 0.35, w * 0.8, h * 0.5); c.fillStyle = '#64748b'; c.beginPath(); c.ellipse(w / 2, h * 0.35, w * 0.4, h * 0.2, 0, Math.PI, 0); c.fill(); c.fillStyle = '#0f172a'; c.fillRect(w * 0.15, h * 0.85, w * 0.7, h * 0.08); for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#fde68a' : '#67e8f9'; c.fillRect(w * (0.18 + k * 0.11), h * 0.5, w * 0.06, h * 0.08); } c.fillStyle = '#22d3ee'; c.fillRect(w * 0.1, h * 0.7, w * 0.8, 1.5); } },
    espHielo: { t: [30, 26], f(c, w, h) { c.fillStyle = '#bae6fd'; c.beginPath(); c.moveTo(w * 0.2, h); c.lineTo(w * 0.05, h * 0.5); c.lineTo(w * 0.35, h * 0.1); c.lineTo(w * 0.7, h * 0.2); c.lineTo(w * 0.95, h * 0.6); c.lineTo(w * 0.8, h); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(w * 0.35, h * 0.1); c.lineTo(w * 0.5, h * 0.6); c.lineTo(w * 0.15, h * 0.5); c.closePath(); c.fill(); } },
    espRoca: { t: [34, 26], f(c, w, h) { roca(c, w, h, '#57534e', '#a8a29e', 1); } },
    espRocaGrande: { t: [74, 56], f(c, w, h) { roca(c, w, h, '#44403c', '#a16207', 2.2); } },
    espRocaMovil: { t: [46, 40], f(c, w, h) { roca(c, w, h, '#78350f', '#fdba74', 3.1); c.strokeStyle = 'rgba(251,146,60,.8)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(w / 2, h * 0.55, w * 0.48, h * 0.44, 0, 0, TAU); c.stroke(); } },
    espHieloMovil: { t: [46, 40], f(c, w, h) { roca(c, w, h, '#7dd3fc', '#f0f9ff', 4.4); c.strokeStyle = 'rgba(224,242,254,.9)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(w / 2, h * 0.55, w * 0.48, h * 0.44, 0, 0, TAU); c.stroke(); } },
    espLunita: { t: [80, 80], f(c, w, h) { const g = c.createRadialGradient(w * 0.38, h * 0.38, 2, w / 2, h / 2, w * 0.48); g.addColorStop(0, '#e7e5e4'); g.addColorStop(1, '#57534e'); c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.18)'; for (const [x, y, rad] of [[0.6, 0.4, 0.08], [0.35, 0.62, 0.11], [0.62, 0.7, 0.06]]) { c.beginPath(); c.arc(w * x, h * y, w * rad, 0, TAU); c.fill(); } } },
    espSatelite: { t: [46, 36], f(c, w, h) { c.fillStyle = '#1d4ed8'; c.fillRect(0, h * 0.35, w * 0.32, h * 0.3); c.fillRect(w * 0.68, h * 0.35, w * 0.32, h * 0.3); c.fillStyle = '#e5e7eb'; c.fillRect(w * 0.36, h * 0.25, w * 0.28, h * 0.5); c.fillStyle = '#facc15'; c.fillRect(w * 0.36, h * 0.45, w * 0.28, h * 0.06); c.strokeStyle = '#e5e7eb'; c.beginPath(); c.moveTo(w / 2, h * 0.25); c.lineTo(w / 2, h * 0.05); c.stroke(); brillo(c, w / 2, h * 0.05, 3, '#22c55e'); } },
    espCristal: { t: [22, 40], f(c, w, h) { for (const [x, s, col] of [[0.5, 1, '#34d399'], [0.25, 0.6, '#a7f3d0'], [0.75, 0.7, '#10b981']]) { c.fillStyle = col; c.beginPath(); c.moveTo(w * x, h * (1 - s)); c.lineTo(w * x + w * 0.16, h); c.lineTo(w * x - w * 0.16, h); c.closePath(); c.fill(); } brillo(c, w / 2, h * 0.1, 5, '#6ee7b7'); } },
    espMedusa: { t: [40, 56], f(c, w, h) { // criatura de la nebulosa (original): campana luminosa con tentáculos
      const g = c.createRadialGradient(w / 2, h * 0.3, 1, w / 2, h * 0.3, w * 0.45); g.addColorStop(0, '#fdf4ff'); g.addColorStop(0.5, 'rgba(232,121,249,.8)'); g.addColorStop(1, 'rgba(134,25,143,.2)');
      c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h * 0.32, w * 0.42, h * 0.24, 0, Math.PI, 0); c.quadraticCurveTo(w / 2, h * 0.42, w * 0.08, h * 0.32); c.fill();
      c.strokeStyle = 'rgba(240,171,252,.75)'; c.lineWidth = 1.4; for (let k = 0; k < 5; k++) { const x = w * (0.2 + k * 0.15); c.beginPath(); c.moveTo(x, h * 0.36); c.quadraticCurveTo(x + 5, h * 0.6, x - 2, h * 0.95); c.stroke(); } } },
    espDron: { t: [36, 22], f(c, w, h) { // dron de rescate: cuerpo blanco y naranja, 4 rotores y luz
      c.strokeStyle = '#334155'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.12, h * 0.3); c.lineTo(w * 0.88, h * 0.3); c.stroke();
      c.fillStyle = 'rgba(148,163,184,.55)'; for (const x of [0.1, 0.32, 0.68, 0.9]) { c.beginPath(); c.ellipse(w * x, h * 0.22, w * 0.11, h * 0.07, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#f8fafc'; c.beginPath(); c.ellipse(w / 2, h * 0.5, w * 0.24, h * 0.26, 0, 0, TAU); c.fill();
      c.fillStyle = '#f97316'; c.fillRect(w * 0.28, h * 0.48, w * 0.44, h * 0.12);
      c.strokeStyle = '#334155'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * 0.42, h * 0.74); c.lineTo(w * 0.36, h * 0.98); c.moveTo(w * 0.58, h * 0.74); c.lineTo(w * 0.64, h * 0.98); c.stroke();
      brillo(c, w / 2, h * 0.36, 4, '#ef4444'); } },
    espPortal: { t: [56, 60], f(c, w, h, n) { // anillo de energía (rosa la entrada, verde la salida)
      const col = hex(n), cx = w / 2, cy = h * 0.5;
      for (const [rx, al, lw] of [[0.46, 0.25, 9], [0.42, 0.9, 4], [0.36, 0.5, 2]]) { c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(cx, cy, w * rx, h * rx, 0, 0, TAU); c.stroke(); }
      c.globalAlpha = 1; const g = c.createRadialGradient(cx, cy, 1, cx, cy, w * 0.36); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, w * 0.36, 0, TAU); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(cx, cy, w * (0.12 + k * 0.07), k, k + 2.2); c.stroke(); } } },
    espPuerta: { t: [40, 46], f(c, w, h) { // hoja de compuerta: metal con franjas de peligro y luz
      c.fillStyle = '#334155'; c.fillRect(0, 0, w, h); c.fillStyle = '#475569'; c.fillRect(2, 2, w - 4, h - 4);
      for (let x = -h; x < w; x += 10) { c.fillStyle = '#facc15'; c.beginPath(); c.moveTo(x, h * 0.78); c.lineTo(x + 5, h * 0.78); c.lineTo(x + 5 + h * 0.18, h * 0.96); c.lineTo(x + h * 0.18, h * 0.96); c.fill(); }
      c.fillStyle = '#0f172a'; c.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.12); brillo(c, w / 2, h * 0.1, 4, '#f43f5e'); } },
  };
  const base = nombre => nombre.split('_')[0];
  const dibujo = nombre => { const s = SPRITES[base(nombre)]; return s ? s.f : null; };
  const tamano = nombre => { const s = SPRITES[base(nombre)]; return s ? s.t : null; };

  // ---------------- Cielo de 360° ----------------
  // Estrellas, la Vía de fondo y lo propio de cada pista. c en px del panorama; dos(f) dibuja f(0) y f(PW).
  function estrellasCielo(c, PW, PH, r, dos) {
    for (let k = 0; k < 420; k++) {
      const x = r() * PW, y = r() * PH * 0.98, t = r() < 0.9 ? 1 : 2, col = ESTRELLAS[Math.floor(r() * ESTRELLAS.length)];
      dos(o => estrella(c, x + o, y, t, col));
    }
    // Franja lejana de la galaxia: nubecitas suaves a lo largo de una onda (periódica: empata al dar la vuelta).
    for (let k = 0; k < 90; k++) {
      const x = (k + r()) / 90 * PW, y = PH * (0.42 + 0.22 * Math.sin(x / PW * TAU * 2) + (r() - 0.5) * 0.12), rad = PH * (0.06 + r() * 0.08);
      dos(o => { const g = c.createRadialGradient(x + o, y, 0, x + o, y, rad); g.addColorStop(0, 'rgba(199,210,254,.16)'); g.addColorStop(1, 'rgba(199,210,254,0)'); c.fillStyle = g; c.fillRect(x + o - rad, y - rad, rad * 2, rad * 2); });
    }
  }
  function planeta(c, x, y, rad, colores, bandas) {
    c.save(); c.beginPath(); c.arc(x, y, rad, 0, TAU); c.clip();
    const g = c.createRadialGradient(x - rad * 0.4, y - rad * 0.4, rad * 0.1, x, y, rad); g.addColorStop(0, colores[0]); g.addColorStop(1, colores[1]);
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    if (bandas) for (let k = -4; k <= 4; k++) { c.fillStyle = k % 2 ? 'rgba(120,53,15,.28)' : 'rgba(254,243,199,.18)'; c.fillRect(x - rad, y + k * rad * 0.2, rad * 2, rad * 0.11); }
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(x + rad * 0.45, y + rad * 0.35, rad * 1.05, 0, TAU); c.fill(); // sombra
    c.restore();
  }
  function anillos(c, x, y, rad, frente) {
    c.strokeStyle = 'rgba(253,230,138,.7)'; c.lineWidth = 3;
    for (const k of [1.45, 1.65, 1.85]) { c.globalAlpha = k === 1.65 ? 0.9 : 0.55; c.beginPath(); c.ellipse(x, y, rad * k, rad * k * 0.24, -0.18, frente ? 0 : Math.PI, frente ? Math.PI : TAU); c.stroke(); }
    c.globalAlpha = 1;
  }
  function nebulosaCielo(c, PW, PH, r, dos, cols) {
    for (let k = 0; k < 18; k++) {
      const x = r() * PW, y = PH * (0.15 + r() * 0.6), rad = PH * (0.25 + r() * 0.35), col = cols[k % cols.length];
      dos(o => { const g = c.createRadialGradient(x + o, y, 0, x + o, y, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.28; c.fillStyle = g; c.fillRect(x + o - rad, y - rad, rad * 2, rad * 2); });
    }
    c.globalAlpha = 1;
  }
  const CIELOS = {
    orbital(c, PW, PH, r, dos) { // planeta azul que asoma, estación de anillo y la luna con su base
      dos(o => {
        planeta(c, PW * 0.22 + o, PH * 1.55, PH * 0.95, ['#38bdf8', '#0c4a6e'], false);
        c.strokeStyle = 'rgba(125,211,252,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(PW * 0.22 + o, PH * 1.55, PH * 0.97, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        const ex = PW * 0.62 + o, ey = PH * 0.38; c.strokeStyle = '#cbd5e1'; c.lineWidth = 4; c.beginPath(); c.ellipse(ex, ey, PH * 0.32, PH * 0.1, 0.1, 0, TAU); c.stroke();
        c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + Math.cos(a) * PH * 0.32, ey + Math.sin(a) * PH * 0.1); c.stroke(); }
        c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(ex, ey, PH * 0.05, 0, TAU); c.fill();
        c.fillStyle = '#67e8f9'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; c.fillRect(ex + Math.cos(a) * PH * 0.32 - 1, ey + Math.sin(a) * PH * 0.1 - 1, 2, 2); }
        planeta(c, PW * 0.86 + o, PH * 0.26, PH * 0.12, ['#f5f5f4', '#57534e'], false);
        c.fillStyle = '#fef3c7'; for (const dx of [-0.04, 0, 0.03]) { c.beginPath(); c.arc(PW * 0.86 + o + PH * dx, PH * 0.26 - PH * 0.08, 1.6, 0, TAU); c.fill(); } // luces de la base lunar
      });
    },
    anillos(c, PW, PH, r, dos) { // gigante gaseoso con anillos y dos lunas
      dos(o => {
        const x = PW * 0.4 + o, y = PH * 0.52, rad = PH * 0.34;
        anillos(c, x, y, rad, false); planeta(c, x, y, rad, ['#fde68a', '#b45309'], true); anillos(c, x, y, rad, true);
        planeta(c, PW * 0.72 + o, PH * 0.3, PH * 0.05, ['#e0f2fe', '#475569'], false);
        planeta(c, PW * 0.08 + o, PH * 0.22, PH * 0.035, ['#fecaca', '#7f1d1d'], false);
      });
    },
    cinturon(c, PW, PH, r, dos) { // sol lejano, planeta rojo y asteroides flotando
      dos(o => { const g = c.createRadialGradient(PW * 0.12 + o, PH * 0.3, 2, PW * 0.12 + o, PH * 0.3, PH * 0.35); g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, '#fde68a'); g.addColorStop(1, 'rgba(251,146,60,0)'); c.fillStyle = g; c.fillRect(PW * 0.12 + o - PH * 0.35, 0, PH * 0.7, PH * 0.7); });
      dos(o => planeta(c, PW * 0.58 + o, PH * 0.42, PH * 0.16, ['#fca5a5', '#7f1d1d'], false));
      for (let k = 0; k < 34; k++) { const x = r() * PW, y = PH * (0.2 + r() * 0.7), s = 4 + r() * 16, sem = r() * 6; dos(o => { c.save(); c.translate(x + o - s / 2, y - s / 2); roca(c, s, s * 0.8, '#292524', '#78716c', sem); c.restore(); }); }
    },
    nebulosa(c, PW, PH, r, dos) { // nebulosa verde y rosa con un agujero de gusano
      nebulosaCielo(c, PW, PH, r, dos, ['#10b981', '#14b8a6', '#d946ef', '#22c55e']);
      dos(o => {
        const x = PW * 0.55 + o, y = PH * 0.45;
        for (let k = 6; k > 0; k--) { c.globalAlpha = 0.15 + k * 0.05; c.strokeStyle = k % 2 ? '#6ee7b7' : '#f0abfc'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, PH * 0.05 * k, PH * 0.035 * k, 0.4, 0, TAU); c.stroke(); }
        c.globalAlpha = 1; const g = c.createRadialGradient(x, y, 0, x, y, PH * 0.08); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - PH * 0.08, y - PH * 0.08, PH * 0.16, PH * 0.16);
      });
    },
  };
  function pintarCielo(c, tema, PW, PH, TW, dos, r) {
    estrellasCielo(c, PW, PH, r, dos);
    const pinta = CIELOS[tema.espacio];
    if (pinta) pinta(c, PW, PH, r, dos);
    const g = c.createLinearGradient(0, PH * 0.75, 0, PH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, tema.bruma);
    c.fillStyle = g; c.fillRect(0, PH * 0.75, TW, PH * 0.25);
  }

  // ---------------- Plataformas móviles: parche de los mipmaps del piso ----------------
  // Precalcula, por nivel de la textura, los píxeles del hueco: índice, lado (px de mundo) y franja; guarda el vacío.
  function muestraCercana(M, z, x, y) {
    let mejor = z.i0, md = Infinity;
    for (let i = z.i0 - 1; i <= z.i1 + 1; i++) { const p = M.pts[i]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < md) { md = d; mejor = i; } }
    return mejor;
  }
  function parcheNivel(T, M, z, mitad) {
    const f = T.f, xs = [], ys = [];
    for (let i = z.i0 - 1; i <= z.i1 + 1; i++) { xs.push(M.pts[i].x); ys.push(M.pts[i].y); }
    const m = mitad + 20, x0 = Math.max(0, Math.floor((Math.min(...xs) - m) / f)), x1 = Math.min(T.w - 1, Math.ceil((Math.max(...xs) + m) / f));
    const y0 = Math.max(0, Math.floor((Math.min(...ys) - m) / f)), y1 = Math.min(T.h - 1, Math.ceil((Math.max(...ys) + m) / f));
    const idx = [], lado = [], franja = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const x = (tx + 0.5) * f, y = (ty + 0.5) * f, i = muestraCercana(M, z, x, y), p = M.pts[i];
      const lat = -(x - p.x) * Math.sin(p.a) + (y - p.y) * Math.cos(p.a), lon = (x - p.x) * Math.cos(p.a) + (y - p.y) * Math.sin(p.a);
      if (i < z.i0 || i > z.i1 || Math.abs(lat) > mitad + 16 || Math.abs(lon) > M.paso) continue;
      idx.push(ty * T.w + tx); lado.push(lat); franja.push((i - z.i0) % 3 === 0 ? 1 : 0);
    }
    const I = Int32Array.from(idx);
    return { T, idx: I, lado: Float32Array.from(lado), franja: Uint8Array.from(franja), vacio: Uint32Array.from(I, k => T.d[k]) };
  }
  function prepararParche(z, M, mitad, TEX) {
    return { z, niveles: TEX.niveles.map(T => parcheNivel(T, M, z, mitad)), centro: null };
  }
  // Escribe la plataforma (centro y medio ancho en px) en los tres mipmaps: metal con franjas y orilla de neón.
  function pintarParche(P, centro, medio, cMetal, cFranja, cNeon) {
    if (P.centro !== null && Math.abs(P.centro - centro) < 0.25) return; // casi no se movió: no se reescribe
    P.centro = centro;
    for (const L of P.niveles) {
      const d = L.T.d, n = L.idx.length;
      for (let k = 0; k < n; k++) {
        const dist = Math.abs(L.lado[k] - centro);
        let v = L.vacio[k];
        if (dist < medio - 3) v = L.franja[k] ? cFranja : cMetal;
        else if (dist < medio) v = cNeon;
        d[L.idx[k]] = v;
      }
    }
  }

  raiz.KartsEspacio = { pintarPiso, ZONAS, salidaPortal, dibujo, tamano, pintarCielo, prepararParche, pintarParche, tramos };
})(typeof window !== 'undefined' ? window : globalThis);
