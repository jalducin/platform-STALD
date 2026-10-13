/* Vista de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar, design.md §2): cámara lateral de transmisión en
   perspectiva 2.5D que sigue al balón, sprites de jugadores pre-dibujados (uniforme con su patrón, piel, peinado y
   número), balón con altura y sombra, tribuna y vallas inventadas, escudos y camisetas dibujados en canvas, y radar.
   Solo dibuja: no cambia el partido. Lo carga juegos/futbol.html (después de futbol-motor.js). */
(function (raiz) {
  'use strict';
  const M = raiz.FutbolMotor;
  const { MX, MY, POSTE, TRAVESANO, AREA_X, AREA_Y, PENAL, CIRCULO } = M;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const PIELES = ['#f1c9a5', '#d9a273', '#a86b43', '#6b4228'];
  const PELOS = ['#2b1d14', '#120d0a', '#6b4423', '#c9a46a'];
  const VALLAS = ['FÚTBOL ESTELAR 2010', 'LIGA VOLCÁN', 'COPA CONTINENTAL', '¡VAMOS, EQUIPO!', 'LIGA DEL PACÍFICO', 'JUEGO LIMPIO', 'LIGA NORTE'];
  const REDUCIR = !!(raiz.matchMedia && raiz.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ================= Escudos y camisetas (canvas → imagen para la página) =================
  function trazoForma(c, forma, s) {
    c.beginPath();
    if (forma === 'circulo') { c.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2); return; }
    if (forma === 'diamante') { c.moveTo(s / 2, s * 0.03); c.lineTo(s * 0.96, s / 2); c.lineTo(s / 2, s * 0.97); c.lineTo(s * 0.04, s / 2); c.closePath(); return; }
    if (forma === 'hexagono') { for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(s / 2 + Math.cos(a) * s * 0.47, s / 2 + Math.sin(a) * s * 0.47); } c.closePath(); return; }
    c.moveTo(s * 0.1, s * 0.08); c.lineTo(s * 0.9, s * 0.08); c.lineTo(s * 0.9, s * 0.45);
    c.quadraticCurveTo(s * 0.88, s * 0.82, s / 2, s * 0.96); c.quadraticCurveTo(s * 0.12, s * 0.82, s * 0.1, s * 0.45); c.closePath();
  }
  function estrella(c, x, y, r) {
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  // Símbolos dibujados con trazos simples (sin marcas ni escudos reales).
  const SIMBOLO = {
    estrella: (c, s) => estrella(c, s / 2, s * 0.52, s * 0.24),
    rayo: (c, s) => { c.beginPath(); [[0.56, 0.22], [0.36, 0.55], [0.5, 0.55], [0.42, 0.8], [0.66, 0.45], [0.52, 0.45], [0.6, 0.22]].forEach(([x, y]) => c.lineTo(x * s, y * s)); c.closePath(); c.fill(); },
    corona: (c, s) => { c.beginPath(); [[0.28, 0.66], [0.28, 0.38], [0.39, 0.52], [0.5, 0.32], [0.61, 0.52], [0.72, 0.38], [0.72, 0.66]].forEach(([x, y]) => c.lineTo(x * s, y * s)); c.closePath(); c.fill(); },
    balon: (c, s) => { c.beginPath(); c.arc(s / 2, s * 0.52, s * 0.2, 0, 7); c.fill(); c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; c.lineTo(s / 2 + Math.cos(a) * s * 0.08, s * 0.52 + Math.sin(a) * s * 0.08); } c.fill(); c.restore(); },
    montana: (c, s) => { c.beginPath(); c.moveTo(s * 0.2, s * 0.72); c.lineTo(s * 0.42, s * 0.34); c.lineTo(s * 0.54, s * 0.52); c.lineTo(s * 0.64, s * 0.4); c.lineTo(s * 0.82, s * 0.72); c.closePath(); c.fill(); },
    ola: (c, s) => { c.lineWidth = s * 0.08; c.lineCap = 'round'; for (const y of [0.44, 0.6]) { c.beginPath(); c.moveTo(s * 0.22, s * y); c.bezierCurveTo(s * 0.36, s * (y - 0.12), s * 0.46, s * (y + 0.12), s * 0.6, s * y); c.bezierCurveTo(s * 0.68, s * (y - 0.1), s * 0.74, s * (y - 0.04), s * 0.8, s * y); c.stroke(); } },
    sol: (c, s) => { c.beginPath(); c.arc(s / 2, s * 0.52, s * 0.13, 0, 7); c.fill(); c.lineWidth = s * 0.05; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(s / 2 + Math.cos(a) * s * 0.18, s * 0.52 + Math.sin(a) * s * 0.18); c.lineTo(s / 2 + Math.cos(a) * s * 0.27, s * 0.52 + Math.sin(a) * s * 0.27); c.stroke(); } },
    llama: (c, s) => { c.beginPath(); c.moveTo(s / 2, s * 0.24); c.bezierCurveTo(s * 0.72, s * 0.44, s * 0.72, s * 0.76, s / 2, s * 0.78); c.bezierCurveTo(s * 0.28, s * 0.76, s * 0.3, s * 0.52, s * 0.42, s * 0.44); c.bezierCurveTo(s * 0.42, s * 0.56, s * 0.5, s * 0.58, s * 0.52, s * 0.5); c.closePath(); c.fill(); },
    ave: (c, s) => { c.beginPath(); c.moveTo(s * 0.18, s * 0.42); c.quadraticCurveTo(s * 0.36, s * 0.38, s / 2, s * 0.6); c.quadraticCurveTo(s * 0.64, s * 0.38, s * 0.82, s * 0.42); c.quadraticCurveTo(s * 0.62, s * 0.5, s / 2, s * 0.72); c.quadraticCurveTo(s * 0.38, s * 0.5, s * 0.18, s * 0.42); c.fill(); },
    arbol: (c, s) => { c.beginPath(); c.moveTo(s / 2, s * 0.22); c.lineTo(s * 0.72, s * 0.62); c.lineTo(s * 0.28, s * 0.62); c.closePath(); c.fill(); c.fillRect(s * 0.46, s * 0.6, s * 0.08, s * 0.16); },
  };
  const claro = hex => { const n = Number.parseInt(hex.slice(1), 16); return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 150; };
  function dibujarEscudo(c, e, s) {
    c.save();
    trazoForma(c, e.forma, s);
    c.fillStyle = e.c1; c.fill();
    c.save(); c.clip();
    c.fillStyle = e.c2; c.globalAlpha = 0.9; c.fillRect(0, s * 0.08, s, s * 0.12);
    c.globalAlpha = 1; c.restore();
    c.lineWidth = Math.max(1.5, s * 0.06); c.strokeStyle = claro(e.c1) ? '#1f2937' : '#f8fafc'; c.stroke();
    c.fillStyle = e.c2 === e.c1 ? '#ffffff' : e.c2; c.strokeStyle = c.fillStyle;
    (SIMBOLO[e.simbolo] || SIMBOLO.estrella)(c, s);
    c.restore();
  }
  const cacheImg = new Map();
  function aImagen(clave, s, dibujo) {
    if (cacheImg.has(clave)) return cacheImg.get(clave);
    const cv = document.createElement('canvas'); cv.width = s; cv.height = s;
    dibujo(cv.getContext('2d'), s);
    const url = cv.toDataURL('image/png');
    cacheImg.set(clave, url);
    return url;
  }
  const escudoUrl = (e, s = 96) => aImagen('e|' + JSON.stringify(e) + '|' + s, s, (c, t) => dibujarEscudo(c, e, t));
  function rellenarPatron(c, u, x, y, w, h) {
    c.fillStyle = u.c1; c.fillRect(x, y, w, h);
    c.fillStyle = u.c2;
    if (u.patron === 'rayas') for (let k = 1; k < 6; k += 2) c.fillRect(x + w * k / 6, y, w / 6, h);
    else if (u.patron === 'aros') for (let k = 1; k < 6; k += 2) c.fillRect(x, y + h * k / 6, w, h / 6);
    else if (u.patron === 'mitades') c.fillRect(x + w / 2, y, w / 2, h);
    else if (u.patron === 'banda') { c.beginPath(); c.moveTo(x, y + h * 0.15); c.lineTo(x + w * 0.25, y); c.lineTo(x + w, y + h * 0.75); c.lineTo(x + w * 0.75, y + h); c.closePath(); c.fill(); }
  }
  function dibujarCamisa(c, u, s) {
    c.save();
    c.beginPath();
    [[0.3, 0.12], [0.42, 0.08], [0.5, 0.16], [0.58, 0.08], [0.7, 0.12], [0.92, 0.32], [0.8, 0.44], [0.74, 0.38], [0.74, 0.92], [0.26, 0.92], [0.26, 0.38], [0.2, 0.44], [0.08, 0.32]].forEach(([x, y]) => c.lineTo(x * s, y * s));
    c.closePath();
    c.save(); c.clip(); rellenarPatron(c, u, 0, 0, s, s); c.restore();
    c.lineWidth = Math.max(1.2, s * 0.04); c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke();
    c.restore();
  }
  const camisaUrl = (u, s = 64) => aImagen('c|' + JSON.stringify(u) + '|' + s, s, (c, t) => dibujarCamisa(c, u, t));

  // ================= Sprites de jugadores (48 × 96 = 1 m × 2 m; pies en y = 92) =================
  const SW = 48, SH = 96, TAM = 1.3; // los jugadores se dibujan 1.3 veces más grandes para leerse en el celular
  function pierna(c, x, y, ang, colores) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = colores.short; c.fillRect(-4, -2, 8, 12);
    c.fillStyle = colores.piel; c.fillRect(-3, 10, 6, 8);
    c.fillStyle = colores.media; c.fillRect(-3.5, 17, 7, 13);
    c.fillStyle = '#111'; c.fillRect(-4, 29, 10, 4);
    c.restore();
  }
  function brazo(c, x, y, ang, colores) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = colores.manga; c.fillRect(-3, 0, 6, 8);
    c.fillStyle = colores.guante || colores.piel; c.fillRect(-2.5, 8, 5, 12);
    c.restore();
  }
  function cabeza(c, j, colores) {
    const pelo = PELOS[(j.pelo + (j.piel > 1 ? 1 : 0)) % PELOS.length];
    c.fillStyle = colores.piel; c.beginPath(); c.arc(24, 21, 7.5, 0, 7); c.fill();
    c.fillStyle = pelo;
    c.beginPath(); c.arc(24, 19, 7.8, Math.PI * 1.02, Math.PI * 1.98); c.fill();
    if (j.pelo === 1 || (j.g === 'f' && j.pelo !== 3)) { c.beginPath(); c.ellipse(16.5, 24, 3, 7, 0.3, 0, 7); c.fill(); } // cola de caballo
    if (j.pelo === 2) for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(18 + k * 3, 13.5, 2.4, 0, 7); c.fill(); } // chino
    c.fillStyle = '#1f2937'; c.fillRect(27.5, 19.5, 1.8, 2);
  }
  function torso(c, u, num, gk) {
    c.save();
    c.beginPath(); c.moveTo(14, 31); c.lineTo(34, 31); c.lineTo(33, 58); c.lineTo(15, 58); c.closePath(); c.clip();
    rellenarPatron(c, gk ? { c1: u.c1, c2: u.c2, patron: 'liso' } : u, 12, 29, 24, 31);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(14, 54, 20, 4);
  }
  // El número va aparte para no quedar al revés en los cuadros que miran a la izquierda.
  function numero(c, u, num) {
    c.font = 'bold 13px "Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = claro(u.c1) ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.55)'; c.strokeText(String(num), 24, 44);
    c.fillStyle = claro(u.c1) ? '#111827' : '#ffffff'; c.fillText(String(num), 24, 44);
  }
  // Cuadros: 0 parado, 1–4 corre, 5 patea, 6 barrida o caído, 7 portero lanzándose.
  const PIERNAS = [[0.08, -0.08], [0.55, -0.45], [0.2, -0.15], [-0.45, 0.55], [-0.15, 0.2], [1.1, -0.2]];
  function cuadro(c, f, j, colores, u, gk) {
    if (f >= 6) { c.save(); c.translate(24, 80); c.rotate(f === 7 ? -1.35 : -1.5); c.translate(-24, -80); }
    const [a, b] = PIERNAS[Math.min(f, 5)];
    pierna(c, 21, 58, b, colores); brazo(c, 16, 33, -a * 0.8, colores);
    pierna(c, 27, 58, a, colores);
    torso(c, u, j.num, gk);
    brazo(c, 32, 33, a * 0.8 + (f === 7 ? -2.4 : 0), colores);
    cabeza(c, j, colores);
    if (f >= 6) c.restore();
  }
  function hojaJugador(j, kit, gk, k) {
    const cv = document.createElement('canvas'); cv.width = SW * 16 * k; cv.height = SH * k;
    const c = cv.getContext('2d'); c.scale(k, k);
    const u = gk ? { c1: kit.portero.c1, c2: kit.portero.c2, patron: 'liso' } : kit.uniforme;
    const colores = { piel: PIELES[j.piel || 0], short: gk ? kit.portero.c2 : u.c2, media: u.c1, manga: u.c1, guante: gk ? '#f8fafc' : null };
    if (colores.short === colores.media) colores.short = '#f8fafc';
    // Cuadros 0–7 miran a la derecha y 8–15 a la izquierda (espejo con el número al derecho).
    for (let f = 0; f < 16; f++) {
      c.save(); c.translate(f * SW, 0);
      if (f >= 8) { c.translate(SW, 0); c.scale(-1, 1); }
      cuadro(c, f % 8, j, colores, u, gk);
      c.restore();
      if (f % 8 < 6) { c.save(); c.translate(f * SW, 0); numero(c, gk ? { c1: kit.portero.c1 } : u, j.num); c.restore(); }
    }
    return cv;
  }

  // ================= Tribuna (textura pre-dibujada) =================
  function texturaTribuna(k) {
    const cv = document.createElement('canvas'), w = 320, h = 120; cv.width = w * k; cv.height = h * k;
    const c = cv.getContext('2d'); c.scale(k, k);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b2333'); g.addColorStop(1, '#2f3a4f');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = M.rngDe('tribuna', 'gente'), colores = ['#e5e7eb', '#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#fde047', '#f472b6', '#94a3b8'];
    for (let fila = 0; fila < 14; fila++) {
      const y = 6 + fila * 8;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, y + 4, w, 2);
      for (let x = 2 + (fila % 2) * 3; x < w; x += 6) {
        if (r() < 0.12) continue;
        c.fillStyle = colores[Math.floor(r() * colores.length)]; c.fillRect(x, y, 4, 4);
        c.fillStyle = PIELES[Math.floor(r() * 4)]; c.fillRect(x + 0.8, y - 2.4, 2.4, 2.4);
      }
    }
    return cv;
  }

  // ================= Vista: cámara, cancha y jugadores =================
  function crearVista(cv) {
    const g = cv.getContext('2d');
    const v = { cv, g, w: 400, h: 300, k: 1, cam: { x: 0, y: 0, th: 0.4, dist: 120, F: 400, cx: 200, cy: 150, ancho: 50, cos: 1, sin: 0 }, hojas: new Map(), tribuna: null, fps: 0, dibujados: 0, temblor: 0 };
    return {
      ajustar: (w, h, dpr) => ajustar(v, w, h, dpr), dibujar: (p, info, dt) => dibujar(v, p, info, dt),
      proyectar: (x, y, z) => proyectar(v, x, y, z || 0), vista: v, olvidarSprites: () => v.hojas.clear(),
      seguir: (x, y) => { v.cam.x = x; v.cam.y = y; },
    };
  }
  // El ancho visible sale de la proporción de la pantalla y la inclinación hace que quepa todo el ancho de la cancha.
  function ajustar(v, w, h, dpr) {
    v.w = w; v.h = h; v.k = Math.min(2, dpr || 1);
    v.cv.width = Math.round(w * v.k); v.cv.height = Math.round(h * v.k);
    v.cv.style.width = w + 'px'; v.cv.style.height = h + 'px';
    const c = v.cam;
    c.ancho = clamp(w / h * 30, 30, 62);
    c.th = Math.asin(clamp(0.86 * (h / w) * c.ancho / 68, 0.22, 0.62));
    c.cos = Math.cos(c.th); c.sin = Math.sin(c.th);
    c.F = w * c.dist / c.ancho; c.cx = w / 2; c.cy = 0;
    let cerca = proyectar(v, c.x, -MY - 1.5, 0).y, lejos = proyectar(v, c.x, MY + 2, 0).y;
    // Con la perspectiva, la banda cercana se agranda: si el ancho de la cancha no cabe, se aleja la cámara.
    const cabe = h * 0.8 / (cerca - lejos);
    if (cabe < 1) { c.F *= cabe; c.ancho = w * c.dist / c.F; cerca *= cabe; lejos *= cabe; }
    c.cy = h * 0.57 - (cerca + lejos) / 2;
    v.tribuna = texturaTribuna(v.k);
    v.hojas.clear();
  }
  function proyectar(v, x, y, z) {
    const c = v.cam;
    const dx = x - c.x, dy = y - (c.y - c.dist * c.cos), dz = z - c.dist * c.sin;
    const prof = dy * c.cos - dz * c.sin, up = dy * c.sin + dz * c.cos, s = c.F / prof;
    return { x: c.cx + dx * s, y: c.cy - up * s, s };
  }
  function seguirCamara(v, p, dt) {
    const c = v.cam, b = p.balon, mitad = c.ancho / 2;
    const meta = clamp(b.x + b.vx * 0.35, -MX + mitad - 8, MX - mitad + 8);
    c.x += (meta - c.x) * Math.min(1, dt * 3.2);
  }
  function poligono(v, puntos) {
    const g = v.g;
    g.beginPath();
    for (const [x, y, z] of puntos) { const q = proyectar(v, x, y, z || 0); g.lineTo(q.x, q.y); }
    g.closePath();
  }
  function linea(v, puntos) {
    const g = v.g;
    g.beginPath();
    puntos.forEach(([x, y], k) => { const q = proyectar(v, x, y, 0); if (k) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
    g.stroke();
  }
  const arco = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + (a1 - a0) * k / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  function fondo(v) {
    const g = v.g, borde = proyectar(v, v.cam.x, MY + 4.5, 0).y;
    g.fillStyle = '#1e3a24'; g.fillRect(0, 0, v.w, v.h);
    const t = v.tribuna, tw = t.width / v.k, th = t.height / v.k, alto = Math.max(20, borde + 2);
    const esc = alto / th, paso = tw * esc, off = -(((v.cam.x * 6) % paso) + paso) % paso;
    for (let x = off; x < v.w; x += paso) g.drawImage(t, x, 0, paso, alto);
    g.fillStyle = 'rgba(10,14,24,.35)'; g.fillRect(0, 0, v.w, alto * 0.18);
  }
  function vallas(v) {
    const g = v.g, y = MY + 3.2, x0 = Math.floor((v.cam.x - v.cam.ancho) / 14) * 14;
    for (let x = x0; x < v.cam.x + v.cam.ancho; x += 14) {
      const a = proyectar(v, x, y, 0.95), b = proyectar(v, x + 13.6, y, 0);
      const i = ((x / 14) % VALLAS.length + VALLAS.length) % VALLAS.length;
      g.fillStyle = i % 2 ? '#0f3d8a' : '#0b5b3f'; g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      g.fillStyle = '#f8fafc'; g.font = 'bold ' + Math.max(6, Math.round((b.y - a.y) * 0.62)) + 'px "Trebuchet MS",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(VALLAS[i], (a.x + b.x) / 2, (a.y + b.y) / 2 + 0.5, b.x - a.x - 4);
    }
  }
  function pasto(v) {
    const g = v.g, x0 = Math.floor((v.cam.x - v.cam.ancho * 0.8) / 5.25) * 5.25;
    g.fillStyle = '#2f8f3c'; poligono(v, [[-MX - 9, -MY - 12], [MX + 9, -MY - 12], [MX + 9, MY + 3], [-MX - 9, MY + 3]]); g.fill();
    for (let x = x0; x < v.cam.x + v.cam.ancho * 0.8; x += 5.25) {
      if (Math.round(x / 5.25) % 2) continue;
      g.fillStyle = '#37a046'; poligono(v, [[x, -MY - 12], [x + 5.25, -MY - 12], [x + 5.25, MY + 3], [x, MY + 3]]); g.fill();
    }
  }
  function lineas(v) {
    const g = v.g;
    g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 1.6; g.lineJoin = 'round';
    linea(v, [[-MX, -MY], [MX, -MY], [MX, MY], [-MX, MY], [-MX, -MY]]);
    linea(v, [[0, -MY], [0, MY]]);
    linea(v, arco(0, 0, CIRCULO, 0, Math.PI * 2, 40));
    for (const s of [-1, 1]) {
      const gx = s * MX;
      linea(v, [[gx, -AREA_Y], [gx - s * AREA_X, -AREA_Y], [gx - s * AREA_X, AREA_Y], [gx, AREA_Y]]);
      linea(v, [[gx, -9.16], [gx - s * 5.5, -9.16], [gx - s * 5.5, 9.16], [gx, 9.16]]);
      const a = Math.acos((AREA_X - PENAL) / CIRCULO);
      linea(v, arco(gx - s * PENAL, 0, CIRCULO, s > 0 ? Math.PI - a : -a, s > 0 ? Math.PI + a : a, 14));
      for (const t of [-1, 1]) linea(v, arco(gx, t * MY, 1, s > 0 ? Math.PI : 0, s > 0 ? Math.PI + t * -Math.PI / 2 : -t * Math.PI / 2, 5));
      punto(v, gx - s * PENAL, 0);
    }
    punto(v, 0, 0);
  }
  function punto(v, x, y) { const q = proyectar(v, x, y, 0); v.g.fillStyle = 'rgba(255,255,255,.9)'; v.g.beginPath(); v.g.arc(q.x, q.y, Math.max(1.2, q.s * 0.12), 0, 7); v.g.fill(); }
  function porteria(v, s) {
    const g = v.g, gx = s * MX, fondoX = gx + s * 2;
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.8;
    for (let k = 0; k <= 8; k++) { const y = -POSTE + k * POSTE / 4; const a = proyectar(v, gx, y, TRAVESANO), b = proyectar(v, fondoX, y, TRAVESANO * 0.7), c = proyectar(v, fondoX, y, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.stroke(); }
    for (let k = 0; k <= 4; k++) { const z = TRAVESANO * 0.7 * k / 4; linea3(v, [[fondoX, -POSTE, z], [fondoX, POSTE, z]]); }
    g.strokeStyle = '#f8fafc'; g.lineWidth = Math.max(2, proyectar(v, gx, 0, 0).s * 0.14);
    linea3(v, [[gx, -POSTE, 0], [gx, -POSTE, TRAVESANO], [gx, POSTE, TRAVESANO], [gx, POSTE, 0]]);
  }
  function linea3(v, puntos) {
    const g = v.g;
    g.beginPath();
    puntos.forEach(([x, y, z], k) => { const q = proyectar(v, x, y, z); if (k) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
    g.stroke();
  }
  function hojaDe(v, p, j) {
    const clave = j.i + '|' + j.eq;
    let h = v.hojas.get(clave);
    if (!h) { const eq = p.eq[j.eq].datos; h = hojaJugador(j.datos, { uniforme: eq.uniforme, portero: eq.portero }, j.rol === 'POR', Math.min(2, v.k * 1.2)); v.hojas.set(clave, h); }
    return h;
  }
  function cuadroDe(j) {
    if (j.anim === 'barre' || j.anim === 'cae') return 6;
    if (j.anim === 'lanza') return 7;
    if (j.anim === 'patea') return 5;
    if (j.anim === 'corre') return 1 + Math.floor(j.fase * 4) % 4;
    return 0;
  }
  function dibujarJugador(v, p, j, info) {
    const q = proyectar(v, j.x, j.y, 0);
    if (q.x < -40 || q.x > v.w + 40) return;
    const g = v.g, s = q.s * TAM, h = hojaDe(v, p, j), f = cuadroDe(j), mira = Math.cos(j.dir) < 0 ? -1 : 1;
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(q.x, q.y, s * 0.55, s * 0.18, 0, 0, 7); g.fill();
    if (j.humano >= 0) marcaHumano(v, q, j, info);
    g.save(); g.translate(q.x, q.y);
    const fw = h.width / 16, fr = f + (mira < 0 ? 8 : 0);
    g.drawImage(h, fr * fw, 0, fw, h.height, -s * 0.5, -s * (92 / 48), s, s * 2);
    g.restore();
    v.dibujados++;
  }
  const COLOR_P = ['#facc15', '#38bdf8', '#f472b6', '#a3e635'];
  function marcaHumano(v, q, j, info) {
    const g = v.g, s = q.s * TAM, c = COLOR_P[j.humano % 4];
    g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.ellipse(q.x, q.y, s * 0.6, s * 0.22, 0, 0, 7); g.stroke();
    const top = q.y - s * 2.25;
    g.fillStyle = c; g.beginPath(); g.moveTo(q.x - 5, top - 7); g.lineTo(q.x + 5, top - 7); g.lineTo(q.x, top); g.closePath(); g.fill();
    if (info && info.etiquetas) { g.font = 'bold 9px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.fillStyle = c; g.fillText('P' + (j.humano + 1), q.x, top - 10); }
    const h = info && info.cargas && info.cargas[j.humano];
    if (h) { const w = 26; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(q.x - w / 2 - 1, top - 20, w + 2, 6); g.fillStyle = h.t > 0.9 ? '#ef4444' : '#facc15'; g.fillRect(q.x - w / 2, top - 19, w * Math.min(1, h.t), 4); }
  }
  function dibujarBalon(v, b) {
    const g = v.g, sombra = proyectar(v, b.x, b.y, 0), q = proyectar(v, b.x, b.y, b.z + 0.11);
    const alto = clamp(1 - b.z / 12, 0.35, 1);
    g.fillStyle = 'rgba(0,0,0,' + (0.35 * alto) + ')'; g.beginPath(); g.ellipse(sombra.x, sombra.y, sombra.s * 0.2 * alto + 1, sombra.s * 0.07 * alto + 0.6, 0, 0, 7); g.fill();
    const r = Math.max(3.4, q.s * 0.17);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1f2937'; g.lineWidth = 1;
    g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#1f2937'; g.beginPath(); g.arc(q.x - r * 0.15, q.y - r * 0.1, r * 0.35, 0, 7); g.fill();
  }
  function dibujar(v, p, info, dt) {
    const g = v.g;
    g.setTransform(v.k, 0, 0, v.k, 0, 0);
    v.dibujados = 0;
    if (p && (!info || !info.fija)) seguirCamara(v, p, dt || 0);
    fondo(v); vallas(v); pasto(v); lineas(v);
    porteria(v, -1); porteria(v, 1);
    if (!p) return;
    const orden = p.jug.slice().sort((a, b) => b.y - a.y);
    let balonPuesto = false;
    for (const j of orden) {
      if (!balonPuesto && j.y < p.balon.y) { dibujarBalon(v, p.balon); balonPuesto = true; }
      dibujarJugador(v, p, j, info);
    }
    if (!balonPuesto) dibujarBalon(v, p.balon);
    if (info && info.destello > 0 && !REDUCIR) { g.fillStyle = 'rgba(255,255,255,' + (info.destello * 0.18) + ')'; g.fillRect(0, 0, v.w, v.h); }
  }

  // ================= Radar =================
  function dibujarRadar(cv, p, k) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * k)) { cv.width = Math.round(w * k); cv.height = Math.round(h * k); }
    const c = cv.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(12,40,20,.78)'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.strokeRect(3.5, 3.5, w - 7, h - 7);
    c.beginPath(); c.moveTo(w / 2, 3.5); c.lineTo(w / 2, h - 3.5); c.stroke();
    const X = x => 4 + (x + MX) / (2 * MX) * (w - 8), Y = y => 4 + (MY - y) / (2 * MY) * (h - 8);
    for (const j of p.jug) {
      c.fillStyle = j.eq === 0 ? p.eq[0].datos.uniforme.c1 : p.eq[1].datos.uniforme.c1;
      c.strokeStyle = j.humano >= 0 ? COLOR_P[j.humano % 4] : 'rgba(0,0,0,.6)';
      c.lineWidth = j.humano >= 0 ? 2 : 1;
      c.beginPath(); c.arc(X(j.x), Y(j.y), j.humano >= 0 ? 3.4 : 2.6, 0, 7); c.fill(); c.stroke();
    }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(X(p.balon.x), Y(p.balon.y), 2.2, 0, 7); c.fill();
  }

  raiz.FutbolVista = { crearVista, escudoUrl, camisaUrl, dibujarEscudo, dibujarCamisa, dibujarRadar, hojaJugador, PIELES, COLOR_P, REDUCIR };
})(typeof window !== 'undefined' ? window : globalThis);
