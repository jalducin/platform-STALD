// Arte de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §8): fondos con paralaje, enemigos y jefes dibujados
// con trazos de canvas, en el estilo de caricatura de Axo y Karts (juegos/personajes.js). Sin imágenes ni DOM al
// cargar: lo pueden cargar la página y las pruebas. juegos/brigada.html usa estas funciones si existen y, si no, las
// suyas (todas son opcionales):
//   BrigadaArte.enemigo(ctx, tipo, cuadro)        en el origen = pies del enemigo, mirando a la derecha (la página voltea
//                                                 y pre-dibuja). Cabe en (w + 30) × (h + 18) del tipo con el origen en
//                                                 ((w + 30) / 2, h + 14). cuadro: 0–1 como la página (torreta 1 = carga,
//                                                 saltabot y gelatino 1 = en el aire); patrulla, dron y escudobot aceptan
//                                                 0–3 (`cuadros[tipo]`) para un paso más suave.
//   BrigadaArte.jefe(ctx, j, t)                   en coordenadas del mundo, con el jefe del motor (x, y = base, w, h, fase,
//                                                 faseT, aviso, oculto, golpeT, hp, hpMax, objX). Avisa cada ataque con un
//                                                 globo «!» y un brillo (los primeros AVISO_S s de la fase o mientras
//                                                 j.aviso) y se enoja (vapor y chispas) con menos de la mitad de vida.
//   BrigadaArte.fondoLejos(ctx, clave, paleta)    tira de 512 × 200 que se repite sin costura; el horizonte en y = 200.
//   BrigadaArte.fondoMedio(ctx, clave, paleta)    igual, la capa de en medio (paralaje 0.5).
// Movimiento reducido (prefers-reduced-motion): el jefe no se bambolea ni echa chispas (las animaciones usan t = 0).
// Nada de violencia realista: los robots son de hojalata y caricatura; los escenarios, sin caricaturas de personas.
(function (raiz) {
  'use strict';
  const AVISO_S = 0.45;
  const TAU = Math.PI * 2;
  const reducido = () => {
    try { return !!(raiz.matchMedia && raiz.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
  };

  // ================= Ayudantes de trazo =================
  function elipse(c, x, y, rx, ry, a0, a1) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, a0 || 0, a1 === undefined ? TAU : a1); }
  function rrect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function llenar(c, color, linea, ancho) { c.fillStyle = color; c.fill(); if (linea) { c.strokeStyle = linea; c.lineWidth = ancho || 0.8; c.stroke(); } }
  function poli(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
  function degradado(c, y0, y1, a, b) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function estrella(c, x, y, r, puntas, adentro) {
    c.beginPath();
    for (let k = 0; k < puntas * 2; k++) { const a = -Math.PI / 2 + k * Math.PI / puntas, rr = k % 2 ? r * (adentro || 0.45) : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  // Ojo de caricatura: blanco, pupila hacia `mira` (−1 izquierda) y ceja enojada opcional.
  function ojo(c, x, y, r, mira, ceja, tinta) {
    elipse(c, x, y, r, r * 1.1); llenar(c, '#fff', tinta || '#1f2937', Math.max(0.5, r * 0.18));
    c.fillStyle = tinta || '#1f2937'; elipse(c, x + mira * r * 0.35, y + r * 0.1, r * 0.5, r * 0.58); c.fill();
    c.fillStyle = '#fff'; elipse(c, x + mira * r * 0.2, y - r * 0.2, r * 0.18, r * 0.18); c.fill();
    if (!ceja) return;
    c.strokeStyle = tinta || '#1f2937'; c.lineWidth = Math.max(0.8, r * 0.3); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - r * 1.05, y - r * (1.25 + 0.35 * mira * ceja)); c.lineTo(x + r * 1.05, y - r * (1.25 - 0.35 * mira * ceja)); c.stroke();
  }
  // Tornillo / remache decorativo.
  function remache(c, x, y, r) { c.fillStyle = 'rgba(255,255,255,.55)'; elipse(c, x, y, r, r); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; elipse(c, x + r * 0.3, y + r * 0.3, r * 0.5, r * 0.5); c.fill(); }
  // Engrane (para chispas y adornos).
  function engrane(c, x, y, r, dientes, rot, color) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.beginPath();
    for (let k = 0; k < dientes * 2; k++) { const a = k * Math.PI / dientes, rr = k % 2 ? r * 0.78 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = color; c.fill();
    c.fillStyle = 'rgba(0,0,0,.3)'; elipse(c, 0, 0, r * 0.32, r * 0.32); c.fill();
    c.restore();
  }

  // Dibuja f en x y, si se sale de la tira de 512, también del otro lado (para que se repita sin costura).
  const PER = 512;
  function envolver(x, medio, f) {
    f(x);
    if (x - medio < 0) f(x + PER);
    if (x + medio > PER) f(x - PER);
  }
  // Perfil periódico (sin costura) con armónicos enteros de la tira.
  const perfil = (base, ondas) => x => ondas.reduce((y, [a, k, f]) => y + a * Math.sin(TAU * k * x / PER + f), base);
  function sierra(c, color, fy, desde) {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, 200);
    for (let x = 0; x <= PER; x += 4) c.lineTo(x, fy(x));
    c.lineTo(PER, desde || 200); c.lineTo(PER, 200); c.closePath(); c.fill();
  }
  function nube(c, x, y, s, color) {
    c.fillStyle = color || 'rgba(255,255,255,.75)';
    for (const [dx, dy, r] of [[-14, 2, 9], [-4, -4, 12], [9, -2, 10], [18, 3, 7]]) { elipse(c, x + dx * s, y + dy * s, r * s, r * s * 0.85); c.fill(); }
    c.fillRect(x - 16 * s, y + 2 * s, 36 * s, 7 * s);
  }

  // ================= Fondos lejanos (paralaje 0.2) =================
  const LEJOS = {
    // Montañas de la Sierra con neblina, ceibas en silueta y una pirámide escalonada lejana entre la bruma.
    selva(c, P) {
      for (const [x, y, s] of [[60, 34, 1], [230, 20, 0.8], [410, 44, 1.1]]) envolver(x, 36 * s, xx => nube(c, xx, y, s));
      sierra(c, 'rgba(91,154,139,.55)', perfil(108, [[18, 1, 0.4], [10, 3, 1.2], [5, 7, 2]]));
      // Pirámide escalonada (silueta respetuosa, sin adornos inventados)
      c.fillStyle = 'rgba(74,128,108,.75)';
      for (let k = 0; k < 6; k++) { const w = 108 - k * 16; c.fillRect(300 - w / 2, 150 - k * 11, w, 11); }
      c.fillRect(300 - 9, 150 - 6 * 11 - 8, 18, 9);
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(300 - 4, 150 - 6 * 11 + 1, 8, 66);
      sierra(c, P.lejos || '#5b9a8b', perfil(140, [[14, 2, 2.1], [8, 5, 0.3], [3, 11, 1]]));
      // Copas de ceiba en la loma
      c.fillStyle = 'rgba(47,107,79,.8)';
      for (const x of [40, 150, 470]) envolver(x, 30, xx => { c.fillRect(xx - 1.5, 120, 3, 26); elipse(c, xx, 118, 26, 9); c.fill(); elipse(c, xx - 10, 112, 12, 6); c.fill(); });
      // Neblina baja
      c.fillStyle = degradado(c, 150, 200, 'rgba(255,255,255,0)', 'rgba(236,253,245,.55)'); c.fillRect(0, 150, PER, 50);
    },
    // Mesas con estratos, sierra morada al fondo y el sol de la tarde.
    desierto(c, P) {
      const g = c.createRadialGradient(400, 50, 4, 400, 50, 60); g.addColorStop(0, 'rgba(255,247,214,1)'); g.addColorStop(0.35, 'rgba(255,237,180,.6)'); g.addColorStop(1, 'rgba(255,237,180,0)');
      c.fillStyle = g; c.fillRect(330, 0, 140, 120);
      c.fillStyle = '#fff7d6'; elipse(c, 400, 50, 18, 18); c.fill();
      sierra(c, 'rgba(167,139,250,.35)', perfil(132, [[16, 1, 2.6], [9, 4, 0.5], [4, 9, 1.7]]));
      const mesa = (x, w, h, color) => envolver(x + w / 2, w / 2 + 14, xx => {
        const x0 = xx - w / 2;
        c.fillStyle = color; poli(c, [[x0 - 14, 200], [x0, 200 - h], [x0 + w, 200 - h], [x0 + w + 14, 200]]); c.fill();
        c.fillStyle = 'rgba(255,255,255,.16)'; for (let k = 1; k < 4; k++) c.fillRect(x0 - 14 * (k * 0.22) + 2, 200 - h + k * h * 0.22, w + 28 * k * 0.22 - 4, 3);
        c.fillStyle = 'rgba(0,0,0,.12)'; poli(c, [[x0 + w, 200 - h], [x0 + w + 14, 200], [x0 + w - 8, 200]]); c.fill();
      });
      mesa(70, 120, 72, P.lejos || '#c7774a'); mesa(250, 80, 98, '#b8693f'); mesa(420, 110, 58, P.lejos || '#c7774a');
      c.fillStyle = 'rgba(255,240,200,.35)'; c.fillRect(0, 186, PER, 14);
    },
    // Volcán nevado lejano, rascacielos en silueta con ventanas y globos de aire.
    ciudad(c, P) {
      for (const [x, y, s] of [[90, 30, 1.1], [340, 46, 0.9]]) envolver(x, 40 * s, xx => nube(c, xx, y, s, 'rgba(255,255,255,.7)'));
      // Volcán con nieve (genérico)
      c.fillStyle = 'rgba(148,163,184,.55)'; poli(c, [[120, 200], [210, 92], [236, 92], [330, 200]]); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; poli(c, [[196, 108], [210, 92], [236, 92], [250, 108], [238, 104], [224, 112], [212, 103]]); c.fill();
      const colorEd = P.lejos || '#7f93b8';
      for (let k = 0; k < 16; k++) {
        const w = 22 + (k * 13) % 14, h = 46 + (k * 37) % 76, x = k * 32;
        c.fillStyle = colorEd; c.fillRect(x, 200 - h, w, h);
        if (k % 4 === 1) { c.fillRect(x + w / 2 - 1, 200 - h - 12, 2, 12); c.fillStyle = '#fca5a5'; elipse(c, x + w / 2, 200 - h - 13, 1.6, 1.6); c.fill(); }
        c.fillStyle = 'rgba(254,243,199,.45)';
        for (let j = 0; j < Math.floor((h - 10) / 12); j++) for (let f = 0; f < 2; f++) if ((k + j + f) % 3) c.fillRect(x + 4 + f * 9, 200 - h + 6 + j * 12, 4, 5);
      }
      // Globos de aire caliente
      for (const [x, y, col] of [[170, 40, '#f472b6'], [440, 62, '#facc15']]) {
        c.fillStyle = col; elipse(c, x, y, 7, 8.5); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 1.2, y - 8, 2.4, 15);
        c.strokeStyle = 'rgba(30,41,59,.6)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 4, y + 6); c.lineTo(x - 2, y + 12); c.moveTo(x + 4, y + 6); c.lineTo(x + 2, y + 12); c.stroke();
        c.fillStyle = '#7c4a24'; c.fillRect(x - 2.5, y + 12, 5, 3.5);
      }
    },
    // Estrellas, la Tierra con nubes y el horizonte de la Luna con cráteres.
    estacion(c, P) {
      for (let k = 0; k < 90; k++) {
        const x = (k * 97 + (k % 3) * 31) % PER, y = (k * 53) % 170, r = k % 9 === 0 ? 1.4 : 0.7;
        c.fillStyle = k % 7 ? 'rgba(255,255,255,.75)' : '#fde68a'; elipse(c, x, y, r, r); c.fill();
        if (k % 23 === 0) { c.fillRect(x - 3, y - 0.3, 6, 0.6); c.fillRect(x - 0.3, y - 3, 0.6, 6); }
      }
      const g = c.createRadialGradient(392, 56, 6, 404, 68, 46); g.addColorStop(0, '#93c5fd'); g.addColorStop(0.55, '#2563eb'); g.addColorStop(1, '#1e3a8a');
      c.fillStyle = 'rgba(147,197,253,.18)'; elipse(c, 404, 68, 52, 52); c.fill();
      c.fillStyle = g; elipse(c, 404, 68, 44, 44); c.fill();
      c.save(); elipse(c, 404, 68, 44, 44); c.clip();
      c.fillStyle = '#22c55e'; elipse(c, 390, 56, 15, 10); c.fill(); elipse(c, 420, 84, 12, 8); c.fill(); elipse(c, 378, 86, 7, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; elipse(c, 410, 44, 18, 3); c.fill(); elipse(c, 386, 74, 14, 2.5); c.fill(); elipse(c, 424, 66, 10, 2); c.fill();
      c.fillStyle = 'rgba(15,23,42,.35)'; elipse(c, 420, 76, 40, 44); c.fill();
      c.restore();
      sierra(c, P.lejos || '#3b3f6b', perfil(168, [[6, 1, 0.2], [4, 3, 1.4], [2, 8, 0.6]]));
      c.fillStyle = 'rgba(0,0,0,.2)';
      for (const [x, y, r] of [[60, 182, 10], [190, 190, 6], [300, 178, 12], [460, 186, 8]]) envolver(x, r, xx => { elipse(c, xx, y, r, r * 0.3); c.fill(); });
    },
  };

  // ================= Fondos medios (paralaje 0.5) =================
  function ceiba(c, x, s, P) {
    c.fillStyle = '#6b5442';
    c.beginPath(); c.moveTo(x - 34 * s, 200); c.quadraticCurveTo(x - 9 * s, 178, x - 8 * s, 70);
    c.lineTo(x + 8 * s, 70); c.quadraticCurveTo(x + 9 * s, 178, x + 34 * s, 200); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x - 5 * s, 80, 3 * s, 100);
    c.strokeStyle = '#5b4636'; c.lineWidth = 4 * s;
    c.beginPath(); c.moveTo(x, 84); c.quadraticCurveTo(x - 30 * s, 70, x - 52 * s, 62); c.moveTo(x, 78); c.quadraticCurveTo(x + 28 * s, 66, x + 50 * s, 58); c.stroke();
    c.fillStyle = P.medio || '#2f6b4f'; elipse(c, x, 58, 72 * s, 22 * s); c.fill();
    c.fillStyle = '#3c8a5f'; elipse(c, x - 30 * s, 50, 34 * s, 13 * s); c.fill(); elipse(c, x + 28 * s, 52, 32 * s, 12 * s); c.fill();
    c.fillStyle = '#58b07a'; elipse(c, x - 6 * s, 44, 24 * s, 8 * s); c.fill();
    // Lianas
    c.strokeStyle = '#3f7d4a'; c.lineWidth = 1.2;
    for (const dx of [-40, -12, 22, 46]) { c.beginPath(); c.moveTo(x + dx * s, 64); c.quadraticCurveTo(x + dx * s + 6, 100, x + dx * s - 2, 128 + (dx % 3) * 6); c.stroke(); }
  }
  function cafeto(c, x, y) {
    c.fillStyle = '#2f7d4a'; elipse(c, x, y, 16, 11); c.fill();
    c.fillStyle = '#3f9a5c'; elipse(c, x - 6, y - 4, 8, 5); c.fill();
    c.fillStyle = '#dc2626'; for (const [dx, dy] of [[-6, 2], [3, -2], [8, 4], [-1, 5]]) { elipse(c, x + dx, y + dy, 1.6, 1.6); c.fill(); }
  }
  function saguaro(c, x, h) {
    const verde = '#4d7c3a', claro = '#6da552';
    const brazo = (bx, by, lado, alto) => {
      c.strokeStyle = verde; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, by); c.lineTo(bx, by); c.lineTo(bx, by - alto); c.stroke();
      c.strokeStyle = claro; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx - lado * 1.5, by - 2); c.lineTo(bx - lado * 1.5, by - alto); c.stroke();
    };
    brazo(x - 15, 200 - h * 0.45, -1, h * 0.3); brazo(x + 14, 200 - h * 0.62, 1, h * 0.26);
    rrect(c, x - 6, 200 - h, 12, h, 6); llenar(c, verde);
    c.strokeStyle = claro; c.lineWidth = 1.2; for (const dx of [-2.5, 2]) { c.beginPath(); c.moveTo(x + dx, 200 - h + 5); c.lineTo(x + dx, 198); c.stroke(); }
    c.fillStyle = '#fef3c7'; for (let k = 0; k < 6; k++) c.fillRect(x - 6.5 + (k % 2) * 12.2, 200 - h + 8 + k * h / 7, 0.9, 0.9);
    c.fillStyle = '#f9a8d4'; elipse(c, x, 200 - h + 1, 3, 2); c.fill();
  }
  function casaAdobe(c, x, w, h, puerta, ventana) {
    c.fillStyle = '#d29a68'; rrect(c, x, 200 - h, w, h, 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(x + w - 8, 200 - h, 8, h);
    c.fillStyle = '#b77a48'; c.fillRect(x - 3, 200 - h - 4, w + 6, 5);
    c.fillStyle = '#7a4a24'; for (let k = 0; k < 4; k++) elipse(c, x + 6 + k * (w - 12) / 3, 200 - h + 4, 1.6, 1.6), c.fill(); // vigas
    rrect(c, x + puerta, 200 - 22, 13, 22, 3); llenar(c, '#6b3f1f');
    c.fillStyle = ventana; c.fillRect(x + w - 20, 200 - h + 12, 11, 10);
    c.strokeStyle = '#fef3c7'; c.lineWidth = 1; c.strokeRect(x + w - 20, 200 - h + 12, 11, 10);
    // Macetas
    c.fillStyle = '#c2410c'; c.fillRect(x + puerta - 9, 194, 6, 6); c.fillStyle = '#16a34a'; elipse(c, x + puerta - 6, 192, 5, 4); c.fill();
    c.fillStyle = '#f43f5e'; elipse(c, x + puerta - 6, 190, 1.6, 1.6); c.fill();
  }
  function fachada(c, x, w, h, color, k) {
    c.fillStyle = color; c.fillRect(x, 200 - h, w, h);
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x, 200 - h, w, 4);
    c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(x + w - 6, 200 - h, 6, h);
    // Tinaco y antena en la azotea
    if (k % 2 === 0) { c.fillStyle = '#334155'; rrect(c, x + 10, 200 - h - 12, 14, 12, 4); c.fill(); c.fillStyle = '#475569'; c.fillRect(x + 12, 200 - h - 2, 2, 2); c.fillRect(x + 20, 200 - h - 2, 2, 2); }
    else { c.strokeStyle = '#334155'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w - 18, 200 - h); c.lineTo(x + w - 18, 200 - h - 16); c.moveTo(x + w - 24, 200 - h - 12); c.lineTo(x + w - 12, 200 - h - 12); c.stroke(); }
    // Ventanas en arco con balcón y macetas
    for (let f = 0; f < 3; f++) {
      for (let j = 0; j < Math.floor((h - 40) / 32); j++) {
        const vx = x + 10 + f * 25, vy = 200 - h + 14 + j * 32;
        c.fillStyle = '#1e3a5f'; rrect(c, vx, vy, 13, 18, 6); c.fill();
        c.fillStyle = 'rgba(147,197,253,.5)'; c.fillRect(vx + 2, vy + 4, 3, 10);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(vx - 2, vy + 18, 17, 2);
        if ((f + j + k) % 2) { c.fillStyle = '#16a34a'; elipse(c, vx + 6.5, vy + 17, 7, 3); c.fill(); c.fillStyle = '#f43f5e'; elipse(c, vx + 3, vy + 15.5, 1.4, 1.4); c.fill(); elipse(c, vx + 10, vy + 15.5, 1.4, 1.4); c.fill(); }
      }
    }
    rrect(c, x + w / 2 - 8, 176, 16, 24, 7); llenar(c, '#7c4a24');
    c.fillStyle = '#fbbf24'; elipse(c, x + w / 2 + 4, 189, 1, 1); c.fill();
  }
  function papelPicado(c, x0, ancho, y0, colores, k) {
    c.strokeStyle = 'rgba(30,41,59,.45)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + ancho / 2, y0 + 14, x0 + ancho, y0); c.stroke();
    const n = Math.floor(ancho / 14);
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n, px = x0 + ancho * t, py = y0 + 14 * 2 * t * (1 - t);
      c.fillStyle = colores[(j + k) % colores.length];
      poli(c, [[px - 5, py], [px + 5, py], [px + 5, py + 9], [px + 2.5, py + 11], [px, py + 9], [px - 2.5, py + 11], [px - 5, py + 9]]); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; elipse(c, px, py + 4.5, 1.6, 1.6); c.fill();
    }
  }
  function modulo(c, x, w, P) {
    rrect(c, x, 70, w, 92, 14); llenar(c, P.medio || '#2a2f55', '#1f2547', 2);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 6, 76, w - 12, 6);
    for (let k = 0; k < Math.floor((w - 20) / 26); k++) {
      const vx = x + 14 + k * 26;
      elipse(c, vx + 8, 104, 9, 9); llenar(c, '#0f172a', '#94a3b8', 1.6);
      c.fillStyle = 'rgba(96,165,250,.45)'; elipse(c, vx + 8, 104, 6.5, 6.5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; elipse(c, vx + 5.5, 101.5, 2, 1.4); c.fill();
    }
    c.fillStyle = '#fbbf24'; for (let k = 0; k < w - 16; k += 12) c.fillRect(x + 8 + k, 140, 6, 3);
    c.fillStyle = '#22d3ee'; elipse(c, x + w - 10, 80, 2.4, 2.4); c.fill();
    c.fillStyle = '#f472b6'; elipse(c, x + 10, 80, 2.4, 2.4); c.fill();
  }

  const MEDIO = {
    selva(c, P) {
      for (const [x, s] of [[70, 1], [270, 1.15], [440, 0.9]]) envolver(x, 75 * s, xx => ceiba(c, xx, s, P));
      for (let x = 0; x < PER; x += 64) cafeto(c, x + 20, 190);
      c.fillStyle = '#2f7d4a'; for (let x = 0; x < PER; x += 26) { elipse(c, x, 199, 16, 9, Math.PI, TAU); c.fill(); }
      // Helechos y hojas grandes
      c.fillStyle = '#3f9a5c';
      for (const x of [140, 360, 500]) envolver(x, 20, xx => { for (const a of [-0.9, -0.4, 0.2, 0.7]) { c.save(); c.translate(xx, 200); c.rotate(a); elipse(c, 0, -14, 4, 15); c.fill(); c.restore(); } });
    },
    desierto(c, P) {
      saguaro(c, 50, 74); saguaro(c, 320, 58); saguaro(c, 470, 86);
      casaAdobe(c, 140, 64, 44, 12, '#3f6b8a'); casaAdobe(c, 214, 50, 34, 22, '#0e7490');
      // Ocotillo y biznaga
      c.strokeStyle = '#65743a'; c.lineWidth = 1.4;
      for (const x of [110, 395]) { for (const a of [-0.5, -0.25, 0, 0.25, 0.45]) { c.beginPath(); c.moveTo(x, 200); c.lineTo(x + Math.sin(a) * 40, 200 - Math.cos(a) * 40); c.stroke(); } c.fillStyle = '#ef4444'; elipse(c, x + Math.sin(-0.25) * 40, 160, 1.6, 2.4); c.fill(); }
      for (const x of [290, 430]) { elipse(c, x, 194, 7, 7); llenar(c, '#6da552'); c.fillStyle = '#facc15'; elipse(c, x, 187, 2.4, 1.6); c.fill(); }
      c.fillStyle = P.medio || '#a35f3a'; for (const [x, r] of [[20, 8], [260, 6], [370, 10]]) { elipse(c, x, 200, r * 1.6, r, Math.PI, TAU); c.fill(); }
    },
    ciudad(c) {
      const colores = ['#f472b6', '#facc15', '#38bdf8', '#4ade80', '#fb923c', '#a78bfa'];
      const ancho = PER / 6;
      for (let k = 0; k < 6; k++) fachada(c, k * ancho, ancho + 0.5, 92 + (k * 29) % 50, colores[k], k);
      for (let k = 0; k < 6; k++) envolver(k * ancho + 40 + ancho / 2, ancho / 2, x => papelPicado(c, x - ancho / 2, ancho, 66 + (k % 2) * 12, colores, k));
      // Faroles
      for (const x of [43, 215, 387]) { c.fillStyle = '#1f2937'; c.fillRect(x - 1, 160, 2, 40); rrect(c, x - 4, 154, 8, 8, 2); c.fill(); c.fillStyle = '#fde68a'; elipse(c, x, 158, 2.6, 2.6); c.fill(); }
    },
    estacion(c, P) {
      c.fillStyle = '#1f2547'; c.fillRect(0, 150, PER, 50);
      modulo(c, 6, 150, P); modulo(c, 262, 120, P);
      // Invernadero lunar con plantas
      c.fillStyle = 'rgba(165,243,252,.18)'; elipse(c, 200, 162, 40, 38, Math.PI, TAU); c.fill();
      c.strokeStyle = 'rgba(165,243,252,.7)'; c.lineWidth = 1.4; elipse(c, 200, 162, 40, 38, Math.PI, TAU); c.stroke();
      for (const a of [-0.6, 0, 0.6]) { c.beginPath(); c.moveTo(200, 124); c.quadraticCurveTo(200 + a * 40, 140, 200 + a * 66, 162); c.stroke(); }
      c.fillStyle = '#22c55e'; for (const [x, h] of [[184, 14], [198, 20], [214, 12]]) { rrect(c, x - 2, 162 - h, 4, h, 2); c.fill(); elipse(c, x, 162 - h, 6, 4); c.fill(); }
      c.fillStyle = '#475569'; c.fillRect(150, 160, 112, 4);
      // Tubos y antena parabólica
      c.strokeStyle = '#64748b'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 172); c.lineTo(PER, 172); c.moveTo(0, 186); c.lineTo(PER, 186); c.stroke();
      c.fillStyle = '#334155'; for (let x = 20; x < PER; x += 64) c.fillRect(x, 168, 6, 22);
      c.fillStyle = '#94a3b8'; c.fillRect(440, 120, 3, 50); elipse(c, 441, 116, 16, 7, Math.PI * 0.9, Math.PI * 2.1); c.fill();
      c.fillStyle = '#f472b6'; elipse(c, 441, 108, 2, 2); c.fill();
    },
  };

  // ================= Enemigos =================
  const ACERO = '#a8b4c4', ACERO2 = '#6b7a90', OSCURO = '#1f2937', TINTA = '#1e293b';
  // Paso de 4 cuadros (0–3) o de 2 (0–1): balanceo de las piernas.
  const paso4 = f => [0, 1, 0, -1][f % 4];
  const DIBUJO_ENEMIGO = {
    // Patrullabot: robotito de hojalata con visor, antena de foco y lanzatuercas.
    patrulla(c, f) {
      const s = paso4(f), sube = Math.abs(s) * 0.8;
      c.fillStyle = 'rgba(0,0,0,.2)'; elipse(c, 0, 0, 9, 1.6); c.fill();
      for (const [dx, k] of [[-3.5, s], [3.5, -s]]) { rrect(c, dx - 2.2 + k * 1.5, -9, 4.4, 9, 1.5); llenar(c, OSCURO); rrect(c, dx - 3 + k * 1.5, -2, 6, 2.5, 1); llenar(c, '#374151'); }
      c.save(); c.translate(0, -sube);
      rrect(c, -8, -21, 16, 13, 4); llenar(c, ACERO2, TINTA, 0.8);
      c.fillStyle = '#f59e0b'; c.fillRect(-8, -12.5, 16, 2);
      remache(c, -5, -18, 0.9); remache(c, -5, -15, 0.9);
      rrect(c, -7, -29, 14, 9, 4); llenar(c, ACERO, TINTA, 0.8);
      rrect(c, -2, -27, 9, 5, 2.5); llenar(c, '#0f172a');
      c.fillStyle = '#22d3ee'; elipse(c, 3.5, -24.5, 2, 1.8); c.fill(); c.fillStyle = '#fff'; elipse(c, 3, -25.3, 0.7, 0.6); c.fill();
      c.strokeStyle = TINTA; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-3, -29); c.lineTo(-4, -33); c.stroke();
      c.fillStyle = f % 2 ? '#fde047' : '#f59e0b'; elipse(c, -4, -33.5, 1.6, 1.6); c.fill();
      // Brazo con lanzatuercas
      rrect(c, 4, -18, 9, 4, 2); llenar(c, '#475569', TINTA, 0.6);
      engrane(c, 13, -16, 2.4, 6, 0.3 * f, '#cbd5e1');
      c.restore();
    },
    // Dron zumbador: un ojo grande, hélices que giran y la boquilla de la gota.
    dron(c, f) {
      const giro = f % 4;
      c.strokeStyle = TINTA; c.lineWidth = 1; c.beginPath(); c.moveTo(-7, -9); c.lineTo(-7, -13); c.moveTo(7, -9); c.lineTo(7, -13); c.stroke();
      c.fillStyle = 'rgba(203,213,225,.9)';
      for (const hx of [-7, 7]) { const a = [10, 6, 2, 6][giro]; rrect(c, hx - a, -14.5, a * 2, 1.8, 0.9); c.fill(); elipse(c, hx, -13.6, 1.3, 1.3); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,.15)'; elipse(c, 0, -1, 7, 1.2); c.fill();
      elipse(c, 0, -7, 10.5, 5.5); llenar(c, ACERO, TINTA, 0.8);
      c.fillStyle = '#f97316'; c.fillRect(-10, -6.5, 20, 1.8);
      c.fillStyle = 'rgba(255,255,255,.45)'; elipse(c, -4, -10, 4, 1.4); c.fill();
      ojo(c, 4, -7.5, 2.6, 1, 0, TINTA);
      rrect(c, -2, -2.5, 4, 2.5, 1); llenar(c, '#475569');
      c.fillStyle = '#38bdf8'; elipse(c, 0, 0.6, 1.1, 1.4); c.fill();
    },
    // Torreta tuerca: base de tuerca, cúpula y cañoncito. Cuadro 1 = carga (brilla antes de disparar).
    torreta(c, f) {
      c.fillStyle = 'rgba(0,0,0,.2)'; elipse(c, 0, 0, 12, 1.8); c.fill();
      poli(c, [[-11, 0], [-8, -7], [8, -7], [11, 0]]); llenar(c, OSCURO);
      for (const dx of [-6, 0, 6]) remache(c, dx, -3.5, 1);
      elipse(c, 0, -7, 8.5, 8, Math.PI, TAU); llenar(c, ACERO, TINTA, 0.8);
      c.fillStyle = 'rgba(255,255,255,.45)'; elipse(c, -3, -11.5, 3, 1.4); c.fill();
      rrect(c, 2, -15, 12, 4.5, 2); llenar(c, ACERO2, TINTA, 0.7);
      c.fillStyle = OSCURO; elipse(c, 14, -12.8, 1.4, 2.2); c.fill();
      c.fillStyle = f ? '#f87171' : '#7f1d1d'; elipse(c, 0, -9.5, 2.6, 2.6); c.fill();
      if (!f) return;
      const g = c.createRadialGradient(15, -12.8, 0.5, 15, -12.8, 7); g.addColorStop(0, 'rgba(254,240,138,.95)'); g.addColorStop(1, 'rgba(248,113,113,0)');
      c.fillStyle = g; elipse(c, 15, -12.8, 7, 7); c.fill();
      c.fillStyle = '#fde047'; estrella(c, 0, -9.5, 4.2, 4, 0.35); c.fill();
    },
    // Saltabot: resorte y cabeza redonda de un ojo. Cuadro 1 = estirado en el aire.
    saltabot(c, f) {
      const alto = f ? 9 : 4;
      c.fillStyle = 'rgba(0,0,0,.2)'; elipse(c, 0, 0, 6, 1.2); c.fill();
      c.fillStyle = OSCURO; rrect(c, -4, -2, 8, 2, 1); c.fill();
      c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-3, -2);
      for (let k = 1; k <= 5; k++) c.lineTo(k % 2 ? 3 : -3, -2 - k * alto / 5);
      c.stroke();
      const y = -2 - alto - 6;
      elipse(c, 0, y, 7, 6.5); llenar(c, '#84cc16', '#365314', 0.8);
      c.fillStyle = 'rgba(255,255,255,.4)'; elipse(c, -3, y - 3, 2.4, 1.2); c.fill();
      ojo(c, 2, y - 0.5, 2.8, 1, f ? 0 : 1, TINTA);
      c.fillStyle = '#365314'; c.fillRect(-1, y + 3.5, 4, 1);
    },
    // Escudobot: robot grande con escudo azul al frente (por eso hay que saltarlo o usar un globo).
    escudobot(c, f) {
      const s = paso4(f), sube = Math.abs(s) * 0.7;
      c.fillStyle = 'rgba(0,0,0,.2)'; elipse(c, 0, 0, 12, 1.8); c.fill();
      for (const [dx, k] of [[-5, s], [3, -s]]) { rrect(c, dx - 2.6 + k * 1.4, -9, 5.2, 9, 1.6); llenar(c, OSCURO); }
      c.save(); c.translate(0, -sube);
      rrect(c, -11, -23, 19, 15, 4); llenar(c, ACERO2, TINTA, 0.8);
      c.fillStyle = '#ef4444'; c.fillRect(-11, -14, 19, 2);
      remache(c, -8, -20, 1); remache(c, 4, -20, 1);
      rrect(c, -8, -31, 14, 9, 4); llenar(c, ACERO, TINTA, 0.8);
      ojo(c, 1, -26.5, 2.2, 1, 1, TINTA);
      // Escudo
      c.save(); c.translate(10, -14);
      rrect(c, -3.5, -13, 8, 26, 4); llenar(c, '#2563eb', '#fde047', 1.4);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-2, -10, 2, 18);
      c.fillStyle = '#fde047'; estrella(c, 0.5, 0, 3, 5); c.fill();
      c.restore();
      c.restore();
    },
    // Gelatino invasor: gelatina de tres ojos con antena. Cuadro 1 = estirado en el salto.
    alien(c, f) {
      const sx = f ? 0.86 : 1.1, sy = f ? 1.2 : 0.92;
      c.fillStyle = 'rgba(0,0,0,.2)'; elipse(c, 0, 0, 8, 1.4); c.fill();
      c.save(); c.scale(sx, sy);
      c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-10, -16, 0, -16); c.quadraticCurveTo(10, -16, 9, 0);
      for (let k = 0; k < 4; k++) c.quadraticCurveTo(9 - k * 4.5 - 2.25, 2, 9 - (k + 1) * 4.5, 0);
      c.closePath(); llenar(c, 'rgba(74,222,128,.92)', '#15803d', 0.9);
      c.fillStyle = 'rgba(255,255,255,.45)'; elipse(c, -4, -12, 3.2, 1.6); c.fill();
      c.fillStyle = 'rgba(21,128,61,.35)'; elipse(c, 2, -4, 2, 2); c.fill(); elipse(c, -5, -3, 1.2, 1.2); c.fill();
      for (const [ex, r] of [[-3.5, 1.8], [1, 2.2], [5.2, 1.6]]) ojo(c, ex, -9, r, 1, 0, '#1e1b4b');
      c.strokeStyle = '#15803d'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(3, -19, 1, -21); c.stroke();
      c.fillStyle = '#facc15'; elipse(c, 1, -21.5, 1.6, 1.6); c.fill();
      c.restore();
    },
  };
  function enemigo(c, tipo, cuadro) {
    const f = DIBUJO_ENEMIGO[tipo];
    if (!f) return false;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    f(c, Math.max(0, Math.floor(Number(cuadro) || 0)));
    c.restore();
    return true;
  }

  // ================= Jefes =================
  // Datos comunes del cuadro: caja, brillo al recibir golpe, enojo (menos de la mitad de vida) y aviso de ataque.
  function estadoJefe(j, t) {
    const quieto = reducido();
    const ataque = j.fase && j.fase !== 'pausa' && j.fase !== 'entrada';
    return {
      x0: j.x - j.w / 2, y0: j.y - j.h, brillo: j.golpeT > 0, enojo: j.hp < j.hpMax / 2,
      aviso: !!j.aviso || (ataque && j.faseT < AVISO_S), a: quieto ? 0 : t, quieto, ceja: j.hp < j.hpMax / 2 ? 1 : 0.4,
    };
  }
  const tono = (s, normal, golpe) => (s.brillo ? golpe : normal);
  // Globo «!» encima del jefe y un halo: el aviso de cada ataque.
  function globoAviso(c, x, y, a) {
    const p = 1 + 0.12 * Math.sin(a * 18);
    c.save(); c.translate(x, y); c.scale(p, p);
    rrect(c, -7, -16, 14, 14, 6); llenar(c, '#fef08a', '#b45309', 1.2);
    poli(c, [[-3, -2.5], [3, -2.5], [0, 2.5]]); llenar(c, '#fef08a');
    c.fillStyle = '#b91c1c'; c.fillRect(-1.2, -13.5, 2.4, 6.5); elipse(c, 0, -4.8, 1.3, 1.3); c.fill();
    c.restore();
  }
  function halo(c, j, s) {
    const g = c.createRadialGradient(j.x, j.y - j.h / 2, Math.min(j.w, j.h) * 0.3, j.x, j.y - j.h / 2, Math.max(j.w, j.h) * 0.75);
    g.addColorStop(0, 'rgba(254,240,138,0)'); g.addColorStop(1, 'rgba(250,204,21,' + (0.28 + 0.12 * Math.sin(s.a * 20)).toFixed(3) + ')');
    c.fillStyle = g; elipse(c, j.x, j.y - j.h / 2, j.w * 0.75, j.h * 0.75); c.fill();
  }
  // Enojo: vapor y chispas de engrane (sin chispas con movimiento reducido).
  function enojo(c, x, y, s) {
    for (let k = 0; k < 3; k++) {
      const ph = s.quieto ? (k + 0.5) / 3 : (s.a * 0.9 + k / 3) % 1;
      c.fillStyle = 'rgba(241,245,249,' + (0.7 * (1 - ph)).toFixed(3) + ')';
      elipse(c, x + k * 5 - 5 + ph * 6, y - ph * 18, 3 + ph * 4, 3 + ph * 4); c.fill();
    }
    if (s.quieto) return;
    for (let k = 0; k < 2; k++) engrane(c, x - 8 + k * 16 + Math.sin(s.a * 7 + k) * 3, y + 8 + Math.cos(s.a * 9 + k) * 3, 2, 6, s.a * 5, '#fbbf24');
  }
  function sombra(c, x, y, w) { c.fillStyle = 'rgba(0,0,0,.22)'; elipse(c, x, y, w / 2, 3.5); c.fill(); }
  function oruga(c, x, y, w, h, a) {
    rrect(c, x, y, w, h, h / 2); llenar(c, '#1f2937', '#0b1220', 1);
    c.fillStyle = '#4b5563'; const off = (a * 40) % 8;
    for (let px = x + 4 + off; px < x + w - 4; px += 8) c.fillRect(px, y + 1.5, 3, h - 3);
    for (let k = 0; k < Math.floor(w / 14); k++) { elipse(c, x + 7 + k * 14, y + h / 2, h * 0.3, h * 0.3); llenar(c, '#6b7280', '#111827', 0.6); }
  }

  // Escape del tractor: humo gris; naranja cuando avisa la embestida.
  function humoEscape(c, x, y, s) {
    const color = s.aviso ? '251,146,60' : '209,213,219', alfa = s.aviso ? 0.85 : 0.7;
    for (let k = 0; k < 3; k++) {
      const ph = s.quieto ? (k + 0.5) / 3 : (s.a * 1.4 + k / 3) % 1;
      c.fillStyle = 'rgba(' + color + ',' + (alfa * (1 - ph)).toFixed(3) + ')';
      elipse(c, x + ph * 8, y - ph * 22, 4 + ph * 5, 4 + ph * 5); c.fill();
    }
  }
  // Rodillo tragahojas (gira, con dientes de goma) y hojitas que vuelan hacia él.
  function rodilloTragahojas(c, rx, ry, s) {
    elipse(c, rx, ry, 17, 24); llenar(c, '#6b7280', '#1f2937', 1.2);
    for (let k = 0; k < 8; k++) {
      const an = s.a * 5 + k * Math.PI / 4;
      if (Math.cos(an) >= 0) { rrect(c, rx - 18, ry + Math.sin(an) * 20 - 2, 8, 4, 2); llenar(c, '#e5e7eb', '#475569', 0.5); }
    }
    c.fillStyle = '#4ade80';
    for (let k = 0; k < 4; k++) {
      const ph = s.quieto ? k / 4 : (s.a * 0.7 + k / 4) % 1;
      c.save(); c.translate(rx - 26 - (1 - ph) * 30, ry - 14 + k * 8 + Math.sin(ph * 6) * 4); c.rotate(ph * 6); elipse(c, 0, 0, 3.4, 1.6); c.fill(); c.restore();
    }
  }
  // Escorpión escondido en la arena: montículo, polvito y la punta de la cola asomando.
  function escorpionEscondido(c, j, s) {
    const x = j.objX || j.x, base = j.y;
    c.fillStyle = '#d6a86a'; elipse(c, x, base, 28, 8, Math.PI, TAU); c.fill();
    c.fillStyle = 'rgba(214,168,106,.7)';
    for (let k = 0; k < 4; k++) { elipse(c, x - 20 + k * 13, base - 6 - Math.abs(Math.sin(s.a * 6 + k)) * 6, 4, 3); c.fill(); }
    c.fillStyle = '#fde047'; elipse(c, x + 6, base - 10, 3.5, 3.5); c.fill();
  }
  // Pinza del escorpión: brazo y tenaza de juguete de dos mitades que se abren `abre` rad.
  function pinza(c, x0, base, py, abre, cuerpo) {
    c.strokeStyle = '#334155'; c.lineWidth = 6; c.beginPath(); c.moveTo(x0 + 18, base - 26); c.quadraticCurveTo(x0 + 14, py, x0 + 4, py); c.stroke();
    c.strokeStyle = cuerpo; c.lineWidth = 4; c.stroke();
    c.save(); c.translate(x0 + 2, py);
    elipse(c, 0, 0, 7, 6); llenar(c, cuerpo, '#334155', 1);
    for (const lado of [-1, 1]) {
      c.save(); c.rotate(lado * abre);
      c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-10, lado * 9, -18, lado * 3); c.quadraticCurveTo(-11, lado * 3, -6, 0); c.closePath();
      llenar(c, cuerpo, '#334155', 1);
      c.restore();
    }
    c.restore();
  }
  // Cola en arco con foco: amarillo; rojo y con brillo cuando va a lanzar el rayo.
  function colaEscorpion(c, x0, base, s, cuerpo, rojo) {
    const vaiven = s.quieto ? 0 : Math.sin(s.a * 3) * 3, fx = x0 + 90, fy = base - 66 + vaiven;
    c.strokeStyle = '#475569'; c.lineWidth = 10; c.beginPath(); c.moveTo(x0 + 98, base - 26); c.quadraticCurveTo(x0 + 134, base - 74, x0 + 92, fy); c.stroke();
    c.strokeStyle = cuerpo; c.lineWidth = 7; c.stroke();
    if (rojo) { const g = c.createRadialGradient(fx, fy, 1, fx, fy, 16); g.addColorStop(0, 'rgba(254,202,202,.95)'); g.addColorStop(1, 'rgba(248,113,113,0)'); c.fillStyle = g; elipse(c, fx, fy, 16, 16); c.fill(); }
    elipse(c, fx, fy, 6, 6); llenar(c, rojo ? '#f87171' : '#fde047', '#334155', 1);
  }
  // La reina gelatina con corona, dentro de la cúpula (origen = centro de la cúpula).
  function reinaGelatina(c, s) {
    c.beginPath(); c.moveTo(-18, 2); c.quadraticCurveTo(-20, -26, 0, -27); c.quadraticCurveTo(20, -26, 18, 2); c.closePath(); llenar(c, 'rgba(74,222,128,.95)', '#15803d', 1);
    c.fillStyle = 'rgba(255,255,255,.4)'; elipse(c, -8, -18, 5, 2.4); c.fill();
    const ceja = s.enojo ? 1 : 0;
    for (const [ex, r] of [[-8, 3.4], [0, 4], [8, 3.2]]) ojo(c, ex, -12, r, -1, ceja, '#1e1b4b');
    const boca = s.enojo ? Math.PI : 0;
    c.fillStyle = '#be185d'; c.beginPath(); c.arc(0, -4, 3.4, boca, boca + Math.PI); c.fill();
    poli(c, [[-10, -26], [-10, -34], [-5, -29], [0, -37], [5, -29], [10, -34], [10, -26]]); llenar(c, '#fbbf24', '#b45309', 0.8);
    c.fillStyle = '#f472b6'; elipse(c, 0, -30, 1.8, 1.8); c.fill();
  }
  // Anillo de luces del platillo que gira (rojas y naranjas cuando se enoja).
  function lucesPlatillo(c, x, y, w, s) {
    const colores = s.enojo ? ['#fb923c', '#f43f5e'] : ['#22d3ee', '#fde047'];
    for (let k = 0; k < 10; k++) {
      const an = s.a * 1.5 + k * Math.PI / 5;
      if (Math.sin(an) <= -0.2) continue;
      c.fillStyle = colores[k % 2];
      elipse(c, x + Math.cos(an) * (w / 2 - 8), y + 20 + Math.sin(an) * 7, 3.2, 2.6); c.fill();
    }
  }

  const DIBUJO_JEFE = {
    // Tractor Tragahojas: rodillo con dientes de goma que «se traga» hojas, cabina con carita y escape humeante.
    tractor(c, j, s) {
      const { x0, y0, a } = s, w = j.w, base = j.y;
      sombra(c, j.x, base, w);
      oruga(c, x0 + 8, base - 20, w - 14, 20, a);
      rrect(c, x0 + 22, y0 + 26, w - 26, base - 20 - (y0 + 26), 10); llenar(c, tono(s, '#eab308', '#fef9c3'), '#713f12', 1.2);
      c.fillStyle = '#65a30d'; c.fillRect(x0 + 22, y0 + 40, w - 26, 5);
      for (let k = 0; k < 4; k++) remache(c, x0 + 32 + k * 18, y0 + 52, 1.4);
      // Cabina con carita
      rrect(c, x0 + 52, y0 + 2, 44, 30, 8); llenar(c, tono(s, '#84cc16', '#ecfccb'), '#365314', 1.2);
      rrect(c, x0 + 57, y0 + 7, 34, 18, 5); llenar(c, '#bae6fd', '#0c4a6e', 0.8);
      ojo(c, x0 + 66, y0 + 15, 3.4, -1, s.ceja); ojo(c, x0 + 80, y0 + 15, 3.4, -1, s.ceja);
      c.strokeStyle = '#0c4a6e'; c.lineWidth = 1; c.beginPath(); c.arc(x0 + 73, y0 + 22, 3, s.enojo ? Math.PI * 1.15 : 0.2, s.enojo ? Math.PI * 1.85 : Math.PI - 0.2); c.stroke();
      rrect(c, x0 + w - 18, y0 + 6, 7, 22, 2); llenar(c, '#374151');
      humoEscape(c, x0 + w - 14, y0 + 4, s);
      rodilloTragahojas(c, x0 + 16, base - 32, s);
      if (s.enojo) enojo(c, x0 + 74, y0 - 4, s);
    },
    // Excavadora: brazo con cucharón, cabina con carita y torreta de luz que gira cuando avisa.
    excavadora(c, j, s) {
      const { x0, y0, a } = s, w = j.w, base = j.y;
      sombra(c, j.x, base, w);
      oruga(c, x0 + 12, base - 18, w - 22, 18, a);
      rrect(c, x0 + 24, y0 + 22, w - 30, base - 18 - (y0 + 22), 7); llenar(c, tono(s, '#f97316', '#ffedd5'), '#7c2d12', 1.2);
      // Franja de precaución (rayas diagonales dentro de una banda)
      c.save(); c.beginPath(); c.rect(x0 + 26, base - 27, w - 34, 7); c.clip();
      c.fillStyle = '#facc15'; c.fillRect(x0 + 26, base - 27, w - 34, 7);
      c.fillStyle = '#1f2937'; for (let px = x0 + 20; px < x0 + w; px += 10) { poli(c, [[px, base - 20], [px + 5, base - 20], [px + 12, base - 27], [px + 7, base - 27]]); c.fill(); }
      c.restore();
      rrect(c, x0 + 46, y0 + 6, 32, 26, 6); llenar(c, tono(s, '#fb923c', '#fff7ed'), '#7c2d12', 1);
      rrect(c, x0 + 50, y0 + 10, 24, 14, 4); llenar(c, '#bae6fd', '#0c4a6e', 0.7);
      ojo(c, x0 + 57, y0 + 17, 3, -1, s.ceja); ojo(c, x0 + 68, y0 + 17, 3, -1, s.ceja);
      // Torreta de luz
      rrect(c, x0 + 58, y0, 8, 6, 2); llenar(c, s.aviso && Math.floor(a * 10) % 2 ? '#fde047' : '#f59e0b', '#7c2d12', 0.6);
      if (s.aviso) { c.fillStyle = 'rgba(253,224,71,.35)'; poli(c, [[x0 + 62, y0 + 3], [x0 + 62 + Math.cos(a * 8) * 30, y0 - 6], [x0 + 62 + Math.cos(a * 8 + 0.4) * 30, y0 + 6]]); c.fill(); }
      // Brazo y cucharón
      const ang = -0.65 + Math.sin(a * 2) * (s.aviso ? 0.35 : 0.12);
      c.save(); c.translate(x0 + 30, y0 + 30); c.rotate(ang);
      rrect(c, -44, -4, 46, 8, 3); llenar(c, '#ea580c', '#7c2d12', 1);
      c.translate(-44, 0); c.rotate(0.9);
      rrect(c, -2, -3, 24, 6, 3); llenar(c, '#c2410c', '#7c2d12', 0.8);
      poli(c, [[20, -8], [34, -2], [30, 12], [16, 10]]); llenar(c, '#6b7280', '#1f2937', 1);
      c.fillStyle = '#e5e7eb'; for (let k = 0; k < 3; k++) poli(c, [[30 - k * 5, 11], [28 - k * 5, 15], [26 - k * 5, 11]]), c.fill();
      c.restore();
      if (s.aviso) { c.fillStyle = 'rgba(214,211,209,.65)'; for (let k = 0; k < 3; k++) { elipse(c, x0 + 4 - k * 10, base - 4 - k * 2, 10 - k * 2, 5); c.fill(); } }
      if (s.enojo) enojo(c, x0 + 62, y0 - 4, s);
    },
    // Escorpión de Hojalata: pinzas al frente, patitas y cola con foco; escondido, solo asoma la punta de la cola.
    escorpion(c, j, s) {
      const { x0, a } = s, base = j.y;
      if (j.oculto) { escorpionEscondido(c, j, s); return; }
      const cuerpo = tono(s, '#94a3b8', '#f1f5f9');
      sombra(c, j.x, base, j.w);
      // Patas
      c.strokeStyle = '#334155'; c.lineWidth = 2.6;
      for (let k = 0; k < 4; k++) { const m = s.quieto ? 0 : Math.sin(a * 10 + k * 1.6) * 2; c.beginPath(); c.moveTo(x0 + 36 + k * 16, base - 16); c.lineTo(x0 + 30 + k * 16 + m, base - 8); c.lineTo(x0 + 32 + k * 16 + m, base); c.stroke(); }
      // Cuerpo segmentado
      for (let k = 0; k < 5; k++) { rrect(c, x0 + 22 + k * 15, base - 36 + Math.abs(k - 2) * 1.5, 17, 24 - Math.abs(k - 2) * 2, 7); llenar(c, cuerpo, '#334155', 1); }
      for (let k = 0; k < 5; k++) remache(c, x0 + 30 + k * 15, base - 30, 1.2);
      // Cabeza con ojos
      rrect(c, x0 + 12, base - 34, 18, 20, 7); llenar(c, cuerpo, '#334155', 1);
      ojo(c, x0 + 17, base - 27, 3, -1, s.ceja); ojo(c, x0 + 25, base - 28, 2.6, -1, s.ceja);
      // Pinzas (se abren al avisar)
      const abre = s.aviso || j.fase === 'pinzas' ? 0.5 + 0.2 * Math.sin(a * 16) : 0.2;
      for (const py of [base - 12, base - 44]) pinza(c, x0, base, py, abre, cuerpo);
      colaEscorpion(c, x0, base, s, cuerpo, j.fase === 'cola' || s.aviso);
      if (s.enojo) enojo(c, x0 + 22, base - 46, s);
    },
    // Grúa robot: mástil de celosía, cabina con carita arriba y gancho que se balancea.
    grua(c, j, s) {
      const { x0, y0, a } = s, base = j.y, w = j.w;
      sombra(c, j.x, base, w + 20);
      oruga(c, x0 + 4, base - 14, w - 8, 14, a);
      c.strokeStyle = tono(s, '#eab308', '#fef9c3'); c.lineWidth = 3;
      const mx = x0 + 22;
      c.strokeRect(mx, y0 + 28, 20, base - 14 - (y0 + 28));
      c.lineWidth = 1.6; c.beginPath(); for (let yy = y0 + 28; yy < base - 14; yy += 12) { c.moveTo(mx, yy); c.lineTo(mx + 20, Math.min(base - 14, yy + 12)); c.moveTo(mx + 20, yy); c.lineTo(mx, Math.min(base - 14, yy + 12)); } c.stroke();
      // Pluma hacia la izquierda con contrapeso
      c.strokeStyle = '#ca8a04'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(mx + 30, y0 + 8); c.lineTo(mx - 50, y0 + 12); c.moveTo(mx + 30, y0 + 16); c.lineTo(mx - 50, y0 + 14); c.stroke();
      rrect(c, mx + 26, y0 + 4, 12, 14, 2); llenar(c, '#475569', '#1f2937', 0.8);
      // Cabina con carita
      rrect(c, x0 + 6, y0, 52, 28, 7); llenar(c, tono(s, '#facc15', '#fefce8'), '#713f12', 1.2);
      rrect(c, x0 + 11, y0 + 5, 30, 15, 4); llenar(c, '#bae6fd', '#0c4a6e', 0.7);
      ojo(c, x0 + 19, y0 + 12.5, 3, -1, s.ceja); ojo(c, x0 + 32, y0 + 12.5, 3, -1, s.ceja);
      c.fillStyle = s.aviso && Math.floor(a * 10) % 2 ? '#ef4444' : '#7f1d1d'; elipse(c, x0 + 50, y0 + 6, 2.6, 2.6); c.fill();
      // Gancho: se balancea; al avisar se recoge hacia atrás
      const jalon = j.fase === 'gancho' && s.aviso ? -10 : 0;
      const hx = mx - 46 + jalon + (s.quieto ? 0 : Math.sin(a * 2) * 5), hy = y0 + 58 + (s.quieto ? 0 : Math.cos(a * 2) * 3);
      c.strokeStyle = '#374151'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(mx - 46, y0 + 13); c.lineTo(hx, hy); c.stroke();
      rrect(c, hx - 4, hy, 8, 6, 2); llenar(c, '#f59e0b', '#78350f', 0.8);
      c.strokeStyle = '#374151'; c.lineWidth = 2.2; c.beginPath(); c.arc(hx, hy + 10, 4, -Math.PI * 0.1, Math.PI * 1.1); c.stroke();
      if (s.enojo) enojo(c, x0 + 30, y0 - 6, s);
    },
    // Antenón: dirigible a rayas con plato de antena, hélices y góndola con carita.
    antenon(c, j, s) {
      const { a } = s, x = j.x, y = j.y - j.h / 2, w = j.w, h = j.h, fl = s.quieto ? 0 : Math.sin(a * 1.6) * 1.5;
      c.save(); c.translate(0, fl);
      // Plato de antena
      c.strokeStyle = '#475569'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y - h / 2 + 2); c.lineTo(x - 10, y - h / 2 - 14); c.stroke();
      elipse(c, x - 12, y - h / 2 - 18, 14, 6, Math.PI * 0.95, Math.PI * 2.05); llenar(c, '#e2e8f0', '#475569', 1);
      c.fillStyle = s.aviso ? '#f87171' : '#22d3ee'; elipse(c, x - 12, y - h / 2 - 25, 2.6, 2.6); c.fill();
      if (s.aviso) for (let k = 1; k <= 3; k++) { c.strokeStyle = 'rgba(248,113,113,' + (0.8 - k * 0.2) + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(x - 12, y - h / 2 - 25, k * 6 + ((a * 30) % 6), Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      // Globo con rayas
      c.save(); elipse(c, x, y, w / 2, h / 2); c.clip();
      c.fillStyle = tono(s, '#8b5cf6', '#ede9fe'); c.fillRect(x - w / 2, y - h / 2, w, h);
      c.fillStyle = tono(s, '#a78bfa', '#f5f3ff'); for (let k = -3; k <= 3; k += 2) c.fillRect(x + k * 18 - 9, y - h / 2, 18, h);
      c.fillStyle = 'rgba(255,255,255,.25)'; elipse(c, x - 22, y - 14, 46, 8); c.fill();
      c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(x - w / 2, y + h / 4, w, h / 4);
      c.restore();
      elipse(c, x, y, w / 2, h / 2); c.strokeStyle = '#4c1d95'; c.lineWidth = 1.4; c.stroke();
      // Aletas y hélice (atrás, a la derecha)
      poli(c, [[x + w / 2 - 14, y - 6], [x + w / 2 + 8, y - 22], [x + w / 2 + 6, y - 4]]); llenar(c, '#6d28d9', '#4c1d95', 1);
      poli(c, [[x + w / 2 - 14, y + 6], [x + w / 2 + 8, y + 22], [x + w / 2 + 6, y + 4]]); llenar(c, '#6d28d9', '#4c1d95', 1);
      const hel = s.quieto ? 8 : Math.abs(Math.sin(a * 20)) * 10;
      c.fillStyle = 'rgba(203,213,225,.85)'; elipse(c, x + w / 2 + 6, y, 1.6, hel); c.fill();
      // Góndola con carita y luces
      rrect(c, x - 26, y + h / 2 - 4, 52, 16, 7); llenar(c, '#334155', '#0f172a', 1);
      ojo(c, x - 8, y + h / 2 + 4, 3.2, -1, s.ceja); ojo(c, x + 6, y + h / 2 + 4, 3.2, -1, s.ceja);
      for (let k = 0; k < 5; k++) { c.fillStyle = (Math.floor(a * 4) + k) % 2 ? '#fde047' : '#f472b6'; elipse(c, x - 20 + k * 10, y + h / 2 + 11, 1.4, 1.4); c.fill(); }
      if (s.enojo) enojo(c, x + 30, y - h / 2 - 2, s);
      c.restore();
    },
    // Torre láser: columna con anillos y un ojo-esfera que se carga (rosa) antes de las columnas de luz.
    torre(c, j, s) {
      const { x0, y0, a } = s, w = j.w, base = j.y, cxm = x0 + w / 2;
      sombra(c, j.x, base, w + 10);
      rrect(c, x0 - 4, base - 14, w + 8, 14, 4); llenar(c, '#334155', '#0f172a', 1);
      rrect(c, x0 + 8, y0 + 40, w - 16, base - 14 - (y0 + 40), 6); llenar(c, tono(s, '#475569', '#e0e7ff'), '#1e293b', 1.2);
      for (let yy = y0 + 50, k = 0; yy < base - 18; yy += 16, k++) {
        rrect(c, x0 + 4, yy, w - 8, 5, 2.5); llenar(c, '#64748b', '#1e293b', 0.7);
        c.fillStyle = (Math.floor(a * 3) + k) % 3 ? '#22d3ee' : '#f472b6'; elipse(c, cxm, yy + 2.5, 1.6, 1.6); c.fill();
      }
      const carga = s.aviso || j.fase === 'columnas' || j.fase === 'orbes';
      elipse(c, cxm, y0 + 22, w / 2, 22); llenar(c, tono(s, '#6366f1', '#e0e7ff'), '#312e81', 1.4);
      c.fillStyle = 'rgba(255,255,255,.25)'; elipse(c, cxm - 8, y0 + 12, 9, 4); c.fill();
      const r = 9 + (carga && !s.quieto ? Math.sin(a * 16) * 2 : 0);
      if (carga) { const g = c.createRadialGradient(cxm, y0 + 22, 2, cxm, y0 + 22, 26); g.addColorStop(0, 'rgba(251,207,232,.9)'); g.addColorStop(1, 'rgba(244,114,182,0)'); c.fillStyle = g; elipse(c, cxm, y0 + 22, 26, 26); c.fill(); }
      ojo(c, cxm, y0 + 22, r, -1, s.enojo ? 1 : 0, carga ? '#9d174d' : '#1e1b4b');
      c.fillStyle = '#fde047'; for (const k of [-1, 1]) { elipse(c, cxm + k * (w / 2 - 2), y0 + 22, 2.4, 2.4); c.fill(); }
      if (s.enojo) enojo(c, cxm, y0 - 4, s);
    },
    // Reina Nodriza: platillo con cúpula; adentro, la reina gelatina con corona. Anillo de luces que gira.
    reina(c, j, s) {
      const { a } = s, x = j.x, y = j.y - j.h / 2, w = j.w;
      // Rayo tractor suave debajo
      c.fillStyle = 'rgba(167,139,250,' + (s.aviso ? 0.35 : 0.18) + ')'; poli(c, [[x - 20, y + 36], [x + 20, y + 36], [x + 40, j.y + 40], [x - 40, j.y + 40]]); c.fill();
      // Cúpula de cristal con la reina
      c.fillStyle = 'rgba(165,243,252,.28)'; elipse(c, x, y + 4, w / 2 - 20, 38, Math.PI, TAU); c.fill();
      const rb = s.quieto ? 0 : Math.sin(a * 3) * 1.5;
      c.save(); c.translate(x, y + 2 + rb); reinaGelatina(c, s); c.restore();
      c.strokeStyle = 'rgba(224,242,254,.9)'; c.lineWidth = 1.6; elipse(c, x, y + 4, w / 2 - 20, 38, Math.PI, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; elipse(c, x - 24, y - 20, 6, 10); c.fill();
      // Platillo
      elipse(c, x, y + 18, w / 2, 22); llenar(c, tono(s, '#6d28d9', '#ede9fe'), '#3b0764', 1.6);
      c.fillStyle = tono(s, '#8b5cf6', '#f5f3ff'); elipse(c, x, y + 12, w / 2 - 6, 9); c.fill();
      c.fillStyle = 'rgba(0,0,0,.22)'; elipse(c, x, y + 30, w / 2 - 12, 7); c.fill();
      lucesPlatillo(c, x, y, w, s);
      if (s.enojo) enojo(c, x + w / 2 - 14, y, s);
    },
  };
  function jefe(c, j, t) {
    const f = j && DIBUJO_JEFE[j.tipo];
    if (!f) return false;
    const s = estadoJefe(j, Number(t) || 0);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (s.aviso && !j.oculto) halo(c, j, s);
    f(c, j, s);
    if (s.aviso) globoAviso(c, j.oculto ? (j.objX || j.x) : j.x, (j.oculto ? j.y - 20 : j.y - j.h) - 6, s.a);
    c.restore();
    return true;
  }

  function fondo(tabla) {
    return (c, clave, paleta) => {
      const f = tabla[clave];
      if (!f) return false;
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      f(c, paleta || {});
      c.restore();
      return true;
    };
  }

  raiz.BrigadaArte = {
    AVISO_S,
    cuadros: { patrulla: 4, dron: 4, torreta: 2, saltabot: 2, escudobot: 4, alien: 2 },
    enemigo, jefe,
    fondoLejos: fondo(LEJOS), fondoMedio: fondo(MEDIO),
    claves: Object.keys(LEJOS), tiposEnemigo: Object.keys(DIBUJO_ENEMIGO), tiposJefe: Object.keys(DIBUJO_JEFE),
  };
})(typeof window !== 'undefined' ? window : globalThis);
