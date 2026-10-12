/* Personajes de Arcade (openspec: personajes-xalli): Xalli, Itzae, Yahui y Xochiquetzal.
   Fuente única de sus datos (nombre, título, colores, partícula), de la preferencia del navegador y del dibujo de
   perfil que usan «Axo y los 12 mundos» (para jugar, la portada y el mapa) y «Karts Turbo» (tarjetas del selector).
   El piloto de espaldas en el kart vive en karts.html porque depende de su modelo 3D.

   Personajes.LISTA                       [{ id, nombre, titulo, emoji, particula, firma, kart, piel }]
   Personajes.normalizar(id)              id válido o 'xalli'
   Personajes.preferencia([id])           lee o guarda localStorage.arcade_personaje (sin almacenamiento → 'xalli')
   Personajes.pintar(c, id, o)            dibuja de perfil, pies en el origen, mirando a la derecha, ~15 px de alto;
                                          o = { pose, fase, t, poder, quieto } (poses de Axo: quieto, camina, salta,
                                          cae, aterriza, dano, pierde, gana; poder: base, grande o fuego)
   Personajes.retrato(id, pose, poder)    data URL de 128×128 (en caché) para la portada, el mapa y los selectores
   Todo con trazos de canvas, sin imágenes. Con `quieto` (movimiento reducido) no hay vaivén. */
(function (g) {
  'use strict';
  const CLAVE = 'arcade_personaje';
  const POR_OMISION = 'xalli';

  // piel: paletas por poder. kart: carrocería, acento, oscuro (alerón) y manchas (solo Yahui).
  const LISTA = [
    {
      id: 'xalli', nombre: 'Xalli', titulo: 'Guardián de los Canales', emoji: '🦎', particula: 'burbujas', firma: '#ff6f91',
      kart: { cuerpo: '#14b8a6', acento: '#ff7f6e', oscuro: '#0f5f59', ropa: '#ffa3c7' },
      piel: {
        base: { cuerpo: '#ffa3c7', sombra: '#ef75a8', vientre: '#ffdae9', bran: '#ff6f91', bran2: '#ffc4d3', halo: 'rgba(255,120,150,.32)', linea: '#b23a72', equipo: '#14b8a6', equipo2: '#0f766e', oro: '#f2c14e', jade: '#34d399' },
        grande: { cuerpo: '#ff98c1', sombra: '#e8649c', vientre: '#ffd3e5', bran: '#ff6f91', bran2: '#ffc4d3', halo: 'rgba(255,120,150,.4)', linea: '#a8326a', equipo: '#14b8a6', equipo2: '#0f766e', oro: '#f2c14e', jade: '#34d399', manchas: '#2dd4bf' },
        fuego: { cuerpo: '#ffb07a', sombra: '#f2793f', vientre: '#ffe4c8', bran: '#ff5a1f', bran2: '#ffd23f', halo: 'rgba(255,140,40,.4)', linea: '#ad4518', equipo: '#14b8a6', equipo2: '#0f766e', oro: '#ffd23f', jade: '#34d399' },
      },
    },
    {
      id: 'itzae', nombre: 'Itzae', titulo: 'Cronista del Sol', emoji: '☀️', particula: 'glifos', firma: '#14b8a6',
      kart: { cuerpo: '#d97706', acento: '#facc15', oscuro: '#6b3410', ropa: '#d08a2c' },
      piel: {
        base: { piel: '#b8784e', piel2: '#8f5a36', pelo: '#1b1410', ropa: '#d08a2c', ropa2: '#9a5a14', banda: '#14b8a6', pluma: ['#14b8a6', '#22c55e', '#0e7490'], punta: '#f5c542', oro: '#f5c542', oro2: '#b7791f', amate: '#d9b77a', linea: '#5a3418' },
        fuego: { piel: '#b8784e', piel2: '#8f5a36', pelo: '#1b1410', ropa: '#e8590c', ropa2: '#9a2f05', banda: '#facc15', pluma: ['#fb923c', '#facc15', '#ef4444'], punta: '#fff3b0', oro: '#ffd23f', oro2: '#c2410c', amate: '#f3d29a', linea: '#5a2410' },
      },
    },
    {
      id: 'yahui', nombre: 'Yahui', titulo: 'Guerrero Jaguar de las Nubes', emoji: '🐆', particula: 'hojas', firma: '#e9a83a',
      kart: { cuerpo: '#eab308', acento: '#1f2430', oscuro: '#1f2430', manchas: '#4a2a10', ropa: '#e9a83a' },
      piel: {
        base: { pelaje: '#e9a83a', pelaje2: '#c47f1e', crema: '#f6e7c8', manchas: '#4a2a10', ojo: '#f5d142', obsidiana: '#1f2430', brillo: '#7c8597', jade: '#10b981', pluma: ['#16a34a', '#22c55e', '#0f766e'], ropa: '#0f766e', oro: '#f2c14e', linea: '#6b3f0e' },
        fuego: { pelaje: '#f59e0b', pelaje2: '#d9480f', crema: '#ffe8c2', manchas: '#5a1a05', ojo: '#fff3b0', obsidiana: '#1f2430', brillo: '#7c8597', jade: '#facc15', pluma: ['#ef4444', '#fb923c', '#facc15'], ropa: '#b91c1c', oro: '#ffd23f', linea: '#7a2a05' },
      },
    },
    {
      id: 'xochiquetzal', nombre: 'Xochiquetzal', titulo: 'Señora de la Niebla y las Flores', emoji: '🌺', particula: 'petalos', firma: '#db2777',
      kart: { cuerpo: '#c026d3', acento: '#f59e0b', oscuro: '#5b1260', ropa: '#f5f0e6' },
      piel: {
        base: { piel: '#a86b45', pelo: '#1f1630', pelo2: '#3b2a55', mascara: '#b07a45', mascara2: '#7a4a22', ojo: '#5eead4', huipil: '#f5f0e6', huipil2: '#d9d2c3', flor: ['#f59e0b', '#db2777', '#a855f7'], hoja: '#16a34a', niebla: 'rgba(94,234,212,', linea: '#4a2e1c' },
        fuego: { piel: '#a86b45', pelo: '#1f1630', pelo2: '#5a2a2a', mascara: '#c2410c', mascara2: '#7c2d12', ojo: '#fde68a', huipil: '#fff1e0', huipil2: '#f3c9a0', flor: ['#f97316', '#dc2626', '#facc15'], hoja: '#b45309', niebla: 'rgba(251,146,60,', linea: '#4a1e0c' },
      },
    },
  ];
  const POR_ID = Object.fromEntries(LISTA.map(p => [p.id, p]));
  const normalizar = id => (POR_ID[id] ? id : POR_OMISION);

  function preferencia(id) {
    try {
      if (id === undefined) return normalizar(g.localStorage.getItem(CLAVE));
      g.localStorage.setItem(CLAVE, normalizar(id));
    } catch { /* sin almacenamiento (modo privado): se queda en memoria */ }
    return normalizar(id);
  }

  // ---------- Ayudantes de trazo ----------
  function elipse(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function relleno(c, color, linea, ancho) { c.fillStyle = color; c.fill(); if (linea) { c.strokeStyle = linea; c.lineWidth = ancho || 0.5; c.stroke(); } }
  // Miembro: cápsula de (x, y) con ángulo a (0 = abajo) y largo l.
  function miembro(c, x, y, a, l, ancho, color, linea) {
    c.save(); c.translate(x, y); c.rotate(a);
    rrect(c, -ancho / 2, 0, ancho, l, ancho / 2); relleno(c, color, linea, 0.35);
    c.restore();
    return { x: x - Math.sin(a) * l, y: y + Math.cos(a) * l };
  }
  // Ojos y boca comunes (mismo lenguaje que el Axo de siempre): ojos con brillo, felices al ganar, «> <» con daño.
  function cara(c, o, ojos, boca, tinta, r) {
    const pose = o.pose, t = o.t || 0;
    r = r || 1;
    c.strokeStyle = tinta; c.lineWidth = 0.55; c.fillStyle = tinta;
    const parpadea = !o.quieto && pose !== 'gana' && (t % 3.7) < 0.12;
    if (pose === 'dano') for (const [x, y] of ojos) { c.beginPath(); c.moveTo(x - 0.8, y - 0.8); c.lineTo(x + 0.6, y); c.lineTo(x - 0.8, y + 0.8); c.stroke(); }
    else if (pose === 'pierde') for (const [x, y] of ojos) { c.beginPath(); c.moveTo(x - 0.75, y - 0.75); c.lineTo(x + 0.75, y + 0.75); c.moveTo(x + 0.75, y - 0.75); c.lineTo(x - 0.75, y + 0.75); c.stroke(); }
    else if (pose === 'gana') for (const [x, y] of ojos) { c.beginPath(); c.arc(x, y + 0.45, 0.9 * r, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else if (parpadea) for (const [x, y] of ojos) { c.beginPath(); c.moveTo(x - 0.8, y); c.lineTo(x + 0.8, y); c.stroke(); }
    else for (const [x, y] of ojos) { elipse(c, x, y, 0.8 * r, 1.05 * r); c.fillStyle = tinta; c.fill(); c.fillStyle = '#fff'; elipse(c, x + 0.3, y - 0.42, 0.34 * r, 0.34 * r); c.fill(); }
    if (!boca) return;
    const [bx, by] = boca;
    if (pose === 'gana') { c.fillStyle = '#7f1d1d'; c.beginPath(); c.arc(bx, by - 0.3, 1.1, 0, Math.PI); c.fill(); }
    else if (pose === 'dano' || pose === 'pierde') { c.fillStyle = tinta; elipse(c, bx, by, 0.55, 0.45); c.fill(); }
    else { c.strokeStyle = tinta; c.lineWidth = 0.5; c.beginPath(); c.arc(bx, by - 0.6, 1.1, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
  }
  // Ángulos de brazos y piernas por pose (0 = colgando; positivo = hacia atrás).
  function postura(o) {
    const pose = o.pose, anda = pose === 'camina' ? Math.sin(o.fase || 0) : 0;
    const base = { piernaA: anda * 0.55, piernaB: -anda * 0.55, brazoA: -anda * 0.6 - 0.15, brazoB: anda * 0.6 + 0.2, dobla: 0 };
    if (pose === 'salta') return { piernaA: -0.55, piernaB: 0.35, brazoA: -2.5, brazoB: -2.2, dobla: 1 };
    if (pose === 'cae') return { piernaA: -0.25, piernaB: 0.3, brazoA: -1.5, brazoB: 1.6, dobla: 0 };
    if (pose === 'gana') return { piernaA: -0.2, piernaB: 0.2, brazoA: -2.7, brazoB: 2.7, dobla: 0 };
    if (pose === 'dano') return { piernaA: 0.25, piernaB: -0.1, brazoA: 0.7, brazoB: 0.9, dobla: 0 };
    if (pose === 'pierde') return { piernaA: -0.4, piernaB: 0.4, brazoA: -1.9, brazoB: 1.9, dobla: 0 };
    return base;
  }

  // Valor según la pose: al saltar, al caer o en cualquier otra.
  const segunPose = (pose, salta, cae, otra) => {
    if (pose === 'salta') return salta;
    return pose === 'cae' ? cae : otra;
  };

  // ---------- Xalli: el ajolote (el Axo de siempre con atuendo turquesa y jade) ----------
  function pintarXalli(c, o) {
    const p = (POR_ID.xalli.piel[o.poder] || POR_ID.xalli.piel.base), t = o.t || 0, pose = o.pose, quieto = o.quieto;
    const anda = pose === 'camina' ? Math.sin(o.fase || 0) : 0;
    // Cola con aleta
    let meneo = 0;
    if (!quieto) meneo = Math.sin(t * (pose === 'camina' ? 11 : 3)) * (pose === 'camina' ? 1.3 : 0.6);
    c.fillStyle = p.sombra; c.beginPath(); c.moveTo(-2.4, -6); c.quadraticCurveTo(-7.5, -9 + meneo, -10.4, -5.8 + meneo); c.quadraticCurveTo(-7, -2, -2.2, -2.6); c.closePath(); c.fill();
    c.strokeStyle = p.bran2; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-3.5, -6.6); c.quadraticCurveTo(-7.5, -9.2 + meneo, -10, -6 + meneo); c.stroke();
    if (o.poder === 'fuego') { const fl = quieto ? 1 : 0.8 + 0.25 * Math.sin(t * 18); c.fillStyle = '#ffb703'; elipse(c, -10.8, -7.6 + meneo, 1.3, 2.4 * fl, -0.5); c.fill(); c.fillStyle = '#fff3b0'; elipse(c, -10.6, -7 + meneo, 0.6, 1.2 * fl, -0.5); c.fill(); }
    // Patas
    c.fillStyle = p.sombra;
    const pata = (x, y) => { elipse(c, x, y, 1.7, 1.15); c.fill(); };
    if (pose === 'salta') { pata(-2.4, -1.8); pata(2.6, -2); }
    else if (pose === 'cae' || pose === 'pierde') { pata(-3.6, -0.9); pata(3.8, -0.9); }
    else { pata(-2.6 + anda * 1.4, -0.9 - Math.max(0, anda) * 1.1); pata(2.5 - anda * 1.4, -0.9 - Math.max(0, -anda) * 1.1); }
    // Cuerpo y panza
    elipse(c, 0, -4.4, 4.7, 3.7); relleno(c, p.cuerpo, p.linea);
    c.fillStyle = p.vientre; elipse(c, 1.1, -3.7, 2.9, 2.2); c.fill();
    if (p.manchas) { c.fillStyle = p.manchas; for (const [x, y] of [[-2.6, -6.4], [-1, -7.4], [-3.4, -4.6]]) { elipse(c, x, y, 0.65, 0.55); c.fill(); } }
    // Faja turquesa con hebilla de oro y faldellín de jade
    c.save(); elipse(c, 0, -4.4, 4.7, 3.7); c.clip();
    c.fillStyle = p.equipo; c.fillRect(-5, -2.7, 10, 1.25);
    c.fillStyle = p.oro; c.fillRect(-5, -2.75, 10, 0.3);
    c.restore();
    c.fillStyle = p.equipo2; c.beginPath(); c.moveTo(1.2, -1.6); c.lineTo(3.4, -1.6); c.lineTo(3, 0.2); c.lineTo(1.6, 0.2); c.closePath(); c.fill();
    c.fillStyle = p.jade; c.fillRect(1.75, -1.2, 1.1, 0.5);
    c.fillStyle = p.oro; elipse(c, 2.3, -2.1, 0.55, 0.55); c.fill();
    // Bracito con brazalete
    const brazo = (x, y, rot) => {
      c.fillStyle = p.sombra; elipse(c, x, y, 1.7, 0.95, rot); c.fill();
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = p.equipo; c.fillRect(-0.15, -1, 0.65, 2); c.fillStyle = p.oro; c.fillRect(0.5, -1, 0.2, 2); c.restore();
    };
    if (pose === 'gana') { brazo(3.3, -8.6, -1.2); brazo(-2.6, -8.6, 1.2); }
    else if (pose === 'salta') brazo(3.6, -7, -1);
    else if (pose === 'cae' || pose === 'dano' || pose === 'pierde') brazo(4.6, -5.4, -0.3);
    else brazo(3, -3.4 + anda * 0.4, 0.9);
    // Branquias coral translúcidas: halo suave y tres por lado que se mecen
    const barre = segunPose(pose, 0.3, -0.3, 0);
    const ramas = [[-4.7, -12.6, Math.PI + 0.6], [-5.5, -10.3, Math.PI + 0.12], [-4.9, -8.1, Math.PI - 0.38], [6.3, -12.6, -0.6], [7.1, -10.3, -0.12], [6.5, -8.1, 0.38]];
    const brillo = quieto ? 1 : 0.85 + 0.15 * Math.sin(t * 2.2);
    ramas.forEach(([x, y, ang], i) => {
      const lado = i < 3 ? -1 : 1, sw = quieto ? 0 : Math.sin(t * 4 + i * 1.3) * 0.13;
      c.save(); c.translate(x, y); c.rotate(ang + sw - lado * barre);
      c.globalAlpha *= brillo; c.fillStyle = p.halo; elipse(c, 2.1, 0, 3.4, 1.9); c.fill(); c.globalAlpha /= brillo;
      c.fillStyle = p.bran; elipse(c, 2, 0, 2.4, 1.05); c.fill();
      c.fillStyle = p.bran2; for (const [nx, ny] of [[1.1, -0.85], [2.3, -0.9], [3.4, -0.6]]) { elipse(c, nx, ny, 0.55, 0.55); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; elipse(c, 2.6, 0.15, 0.9, 0.3); c.fill();
      c.restore();
    });
    // Collar turquesa con borde de oro y jade (entre cabeza y cuerpo)
    c.fillStyle = p.equipo; c.beginPath(); c.moveTo(-3.6, -7.6); c.quadraticCurveTo(0.6, -5.2, 5, -7.4); c.lineTo(4.8, -6.3); c.quadraticCurveTo(0.6, -4.1, -3.4, -6.5); c.closePath(); c.fill();
    c.strokeStyle = p.oro; c.lineWidth = 0.35; c.beginPath(); c.moveTo(-3.4, -6.5); c.quadraticCurveTo(0.6, -4.1, 4.8, -6.3); c.stroke();
    c.fillStyle = p.jade; elipse(c, 1.4, -5.2, 0.85, 0.75); c.fill(); c.strokeStyle = p.oro; c.lineWidth = 0.3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; elipse(c, 1.15, -5.45, 0.28, 0.22); c.fill();
    // Cabeza
    elipse(c, 0.8, -10.2, 6.3, 4.8); relleno(c, p.cuerpo, p.linea);
    c.fillStyle = 'rgba(255,255,255,.4)'; elipse(c, -0.8, -13.2, 2.4, 0.95); c.fill();
    // Diadema de jade
    c.fillStyle = p.equipo; c.beginPath(); c.arc(0.8, -10.2, 5.6, Math.PI * 1.22, Math.PI * 1.56); c.arc(0.8, -10.2, 4.7, Math.PI * 1.56, Math.PI * 1.22, true); c.closePath(); c.fill();
    c.fillStyle = p.jade; elipse(c, 0.2, -15.1, 0.6, 0.5); c.fill();
    cara(c, o, [[-1.3, -10.5], [3.3, -10.5]], [1.1, -8.3], '#2a1222', 1.25);
    c.fillStyle = 'rgba(255,80,140,.45)'; elipse(c, -3.1, -8.7, 1, 0.6); c.fill(); elipse(c, 5.2, -8.7, 1, 0.6); c.fill();
  }

  // ---------- Itzae: joven astrónomo maya ----------
  function pintarItzae(c, o) {
    const p = POR_ID.itzae.piel[o.poder === 'fuego' ? 'fuego' : 'base'], t = o.t || 0, pose = o.pose, q = postura(o);
    const linea = p.linea;
    // Plumas del penacho (detrás de todo): abanico turquesa y verde con puntas doradas
    const vaiven = o.quieto ? 0 : Math.sin(t * 3) * 0.05;
    for (let k = 0; k < 7; k++) {
      const a = -2.75 + k * 0.29 + vaiven + segunPose(pose, 0.1, -0.12, 0), largo = 5.4 - Math.abs(k - 3) * 0.35;
      c.save(); c.translate(-0.2, -15.2); c.rotate(a);
      elipse(c, largo / 2 + 0.6, 0, largo / 2 + 0.5, 1.05); relleno(c, p.pluma[k % 3], 'rgba(10,40,40,.45)', 0.3);
      c.fillStyle = p.punta; elipse(c, largo + 0.7, 0, 0.75, 0.75); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.2; c.beginPath(); c.moveTo(1, 0); c.lineTo(largo, 0); c.stroke();
      c.restore();
    }
    // Brazo de atrás
    const hombroB = [-0.6, -7.9];
    miembro(c, hombroB[0], hombroB[1], q.brazoB, 3.3, 1.35, p.piel2, linea);
    // Piernas
    const cad = -4.1;
    miembro(c, -0.9, cad, q.piernaB + (q.dobla ? 0.4 : 0), 3.4, 1.55, p.piel2, linea);
    miembro(c, 1.0, cad, q.piernaA, 3.4, 1.55, p.piel, linea);
    for (const [hx, a] of [[-0.9, q.piernaB + (q.dobla ? 0.4 : 0)], [1.0, q.piernaA]]) { // sandalias
      const px = hx - Math.sin(a) * 3.3, py = cad + Math.cos(a) * 3.3;
      c.fillStyle = '#5b3a1e'; rrect(c, px - 0.8, py - 0.4, 2.2, 0.9, 0.4); c.fill();
    }
    // Faldellín y túnica ocre con banda turquesa y grecas
    c.fillStyle = p.ropa2; c.beginPath(); c.moveTo(-2.6, -4.6); c.lineTo(2.8, -4.6); c.lineTo(3.1, -2.7); c.lineTo(-2.9, -2.7); c.closePath(); c.fill();
    c.fillStyle = p.banda; c.beginPath(); c.moveTo(0.4, -3.6); c.lineTo(2.4, -3.6); c.lineTo(2.1, -1.6); c.lineTo(0.7, -1.6); c.closePath(); c.fill();
    rrect(c, -2.7, -8.8, 5.6, 4.8, 1.4); relleno(c, p.ropa, linea);
    c.fillStyle = p.banda; rrect(c, -2.5, -8.8, 5.2, 1.2, 0.6); c.fill();
    c.fillStyle = p.oro; c.fillRect(-2.4, -7.65, 5, 0.3);
    c.fillStyle = p.ropa2; for (let k = 0; k < 4; k++) c.fillRect(-2.1 + k * 1.3, -5.0, 0.7, 0.7);
    c.fillStyle = p.oro; c.fillRect(-2.6, -4.3, 5.6, 0.32);
    // Cabeza: pelo, cara, banda del penacho y disco solar
    elipse(c, 0.5, -12.2, 4.1, 4.0); relleno(c, p.pelo, linea);
    elipse(c, 1.4, -11.7, 3.2, 3.3); c.fillStyle = p.piel; c.fill();
    c.fillStyle = p.pelo; c.beginPath(); c.moveTo(-1.6, -14.6); c.quadraticCurveTo(2.2, -15.9, 4.4, -13.2); c.quadraticCurveTo(2.4, -13.9, 0.4, -13.4); c.closePath(); c.fill();
    c.fillStyle = p.piel2; elipse(c, -1.4, -11.6, 0.9, 1.2); c.fill(); // oreja
    c.fillStyle = p.oro; elipse(c, -1.5, -10.4, 0.45, 0.45); c.fill(); // arete
    c.fillStyle = p.banda; c.beginPath(); c.arc(0.5, -12.2, 4.35, Math.PI * 1.08, Math.PI * 1.95); c.arc(0.5, -12.2, 3.45, Math.PI * 1.95, Math.PI * 1.08, true); c.closePath(); c.fill();
    c.fillStyle = p.oro; for (const a of [1.2, 1.45, 1.7]) { elipse(c, 0.5 + Math.cos(Math.PI * a) * 3.9, -12.2 + Math.sin(Math.PI * a) * 3.9, 0.35, 0.35); c.fill(); }
    // Disco solar dorado (glifo) al frente del penacho
    const sx = 1.9, sy = -16.4;
    c.fillStyle = 'rgba(255,214,90,.35)'; elipse(c, sx, sy, 2.5, 2.5); c.fill();
    c.strokeStyle = p.oro; c.lineWidth = 0.45; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.moveTo(sx + Math.cos(a) * 1.6, sy + Math.sin(a) * 1.6); c.lineTo(sx + Math.cos(a) * 2.25, sy + Math.sin(a) * 2.25); } c.stroke();
    elipse(c, sx, sy, 1.55, 1.55); relleno(c, p.oro, p.oro2, 0.35);
    c.strokeStyle = p.oro2; c.lineWidth = 0.3; c.beginPath(); c.arc(sx, sy, 0.8, 0, Math.PI * 2); c.moveTo(sx - 0.35, sy); c.lineTo(sx + 0.35, sy); c.stroke();
    cara(c, o, [[1.5, -12.1], [3.4, -12.1]], [2.7, -10.0], '#2b160c');
    c.fillStyle = 'rgba(200,90,60,.35)'; elipse(c, 3.9, -10.9, 0.7, 0.4); c.fill();
    // Brazo de adelante con el códice de amate que brilla
    const mano = miembro(c, 0.9, -7.9, q.brazoA, 3.3, 1.35, p.piel, linea);
    c.fillStyle = p.oro; c.save(); c.translate(0.9, -7.9); c.rotate(q.brazoA); c.fillRect(-0.7, 2.2, 1.4, 0.45); c.restore();
    if (pose !== 'pierde') {
      const bx = mano.x + 0.6, by = mano.y - 0.6, brillo = o.quieto ? 0.45 : 0.4 + 0.15 * Math.sin(t * 3);
      c.fillStyle = 'rgba(255,224,120,' + brillo.toFixed(2) + ')'; elipse(c, bx, by, 3, 2.6); c.fill();
      c.save(); c.translate(bx, by); c.rotate(-0.15);
      rrect(c, -1.9, -1.4, 3.8, 2.6, 0.3); relleno(c, '#8b5e34');
      c.fillStyle = p.amate; c.fillRect(-1.7, -1.25, 1.6, 2.3); c.fillRect(0.1, -1.25, 1.6, 2.3);
      c.fillStyle = p.oro; elipse(c, 0.9, -0.15, 0.55, 0.55); c.fill();
      c.strokeStyle = '#8b5e34'; c.lineWidth = 0.2; c.beginPath(); c.moveTo(-1.5, -0.5); c.lineTo(-0.4, -0.5); c.moveTo(-1.5, 0.2); c.lineTo(-0.4, 0.2); c.stroke();
      c.restore();
    }
  }

  // ---------- Yahui: guerrero jaguar ----------
  function pintarYahui(c, o) {
    const p = POR_ID.yahui.piel[o.poder === 'fuego' ? 'fuego' : 'base'], t = o.t || 0, pose = o.pose, q = postura(o), linea = p.linea;
    const manchas = (lista, r) => { c.fillStyle = p.manchas; for (const [x, y] of lista) { elipse(c, x, y, r, r * 0.85); c.fill(); } };
    // Cola larga moteada, con punta oscura
    let meneo = 0;
    if (!o.quieto) meneo = Math.sin(t * (pose === 'camina' ? 9 : 2.5)) * 1.1;
    c.lineCap = 'round';
    const cola = new Path2D(); cola.moveTo(-2.6, -4.8); cola.bezierCurveTo(-7, -4.5, -9.5, -8 + meneo, -7.6, -11.2 + meneo);
    c.strokeStyle = linea; c.lineWidth = 2.1; c.stroke(cola);
    c.strokeStyle = p.pelaje; c.lineWidth = 1.5; c.stroke(cola);
    manchas([[-5.2, -5.1], [-7.4, -6.8 + meneo * 0.5], [-8.1, -9 + meneo * 0.8]], 0.42);
    c.fillStyle = p.manchas; elipse(c, -7.6, -11.2 + meneo, 0.85, 0.85); c.fill();
    if (o.poder === 'fuego') { const fl = o.quieto ? 1 : 0.8 + 0.25 * Math.sin(t * 18); c.fillStyle = '#ffb703'; elipse(c, -7.5, -12.6 + meneo, 0.9, 1.8 * fl); c.fill(); }
    // Brazo de atrás con brazalete de obsidiana
    const brazo = (x, y, a, color) => {
      const m = miembro(c, x, y, a, 3.4, 1.7, color, linea);
      c.save(); c.translate(x, y); c.rotate(a); rrect(c, -1.05, 1.5, 2.1, 1.35, 0.4); relleno(c, p.obsidiana); c.fillStyle = p.brillo; c.fillRect(-0.7, 1.75, 1.4, 0.25); c.restore();
      c.fillStyle = p.crema; elipse(c, m.x, m.y, 0.95, 0.95); c.fill();
    };
    brazo(-1.1, -8.1, q.brazoB, p.pelaje2);
    // Piernas
    const cad = -4.0;
    for (const [hx, a, col] of [[-1.2, q.piernaB + (q.dobla ? 0.4 : 0), p.pelaje2], [1.2, q.piernaA, p.pelaje]]) {
      const m = miembro(c, hx, cad, a, 3.3, 1.9, col, linea);
      c.fillStyle = p.crema; elipse(c, m.x + 0.4, m.y - 0.2, 1.2, 0.7); c.fill();
    }
    // Torso robusto: pelaje con rosetas, pecho crema y faldellín de jade
    rrect(c, -3.3, -9.0, 6.6, 5.4, 2); relleno(c, p.pelaje, linea);
    c.fillStyle = p.crema; elipse(c, 1.7, -6.6, 1.8, 2.2); c.fill();
    manchas([[-2.2, -7.9], [-1.0, -6.2], [-2.4, -5.0], [0.2, -8.3]], 0.45);
    c.fillStyle = p.ropa; c.beginPath(); c.moveTo(-3.2, -4.9); c.lineTo(3.3, -4.9); c.lineTo(3.0, -2.6); c.lineTo(-3.0, -2.6); c.closePath(); c.fill();
    c.fillStyle = p.oro; c.fillRect(-3.2, -4.95, 6.5, 0.35);
    c.fillStyle = p.jade; c.fillRect(0.6, -3.6, 1.6, 1.6); c.fillStyle = p.oro; c.fillRect(1.1, -3.1, 0.6, 0.6);
    // Pectoral de jade
    c.strokeStyle = p.oro; c.lineWidth = 0.35; c.beginPath(); c.arc(0.9, -9.6, 2.4, 0.35, 2.6); c.stroke();
    c.fillStyle = p.jade; elipse(c, 0.8, -7.4, 0.75, 0.75); c.fill();
    // Penacho de quetzal (detrás de la cabeza)
    const vaiven = o.quieto ? 0 : Math.sin(t * 3) * 0.06;
    [[-2.45, 6.8], [-2.15, 6.0], [-1.85, 5.2]].forEach(([a, l], k) => {
      c.save(); c.translate(-0.4, -15.4); c.rotate(a + vaiven);
      elipse(c, l / 2, 0.2 * k, l / 2, 0.95, 0.06); relleno(c, p.pluma[k], 'rgba(5,40,20,.5)', 0.3);
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 0.2; c.beginPath(); c.moveTo(0.5, 0); c.lineTo(l - 0.6, 0.15); c.stroke();
      c.restore();
    });
    // Cabeza de jaguar: orejas, hocico, rosetas y ojos ámbar
    for (const [x, y] of [[-1.9, -15.3], [1.6, -15.9]]) { elipse(c, x, y, 1.35, 1.25); relleno(c, p.pelaje, linea); c.fillStyle = p.manchas; elipse(c, x, y + 0.2, 0.6, 0.55); c.fill(); }
    elipse(c, 0.7, -12.2, 4.0, 3.7); relleno(c, p.pelaje, linea);
    manchas([[-1.8, -13.6], [-2.6, -11.6], [-0.4, -14.6], [-1.2, -10.4]], 0.4);
    // Banda de jade y oro en la frente
    c.fillStyle = p.jade; c.beginPath(); c.arc(0.7, -12.2, 4.05, Math.PI * 1.12, Math.PI * 1.88); c.arc(0.7, -12.2, 3.25, Math.PI * 1.88, Math.PI * 1.12, true); c.closePath(); c.fill();
    c.fillStyle = p.oro; elipse(c, 1.6, -15.6, 0.55, 0.55); c.fill();
    elipse(c, 3.2, -11.0, 2.0, 1.55); c.fillStyle = p.crema; c.fill();
    c.fillStyle = '#2b1608'; c.beginPath(); c.moveTo(4.2, -12.0); c.lineTo(5.3, -12.0); c.lineTo(4.75, -11.3); c.closePath(); c.fill();
    if (pose === 'gana' || pose === 'dano' || pose === 'pierde') cara(c, o, [[1.4, -12.6], [3.3, -12.7]], [3.8, -10.0], '#2b1608');
    else {
      const parpadea = !o.quieto && (t % 3.7) < 0.12;
      for (const [x, y] of [[1.4, -12.6], [3.3, -12.7]]) {
        if (parpadea) { c.strokeStyle = '#2b1608'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x - 0.7, y); c.lineTo(x + 0.7, y); c.stroke(); continue; }
        c.fillStyle = p.ojo; elipse(c, x, y, 0.78, 0.62, -0.15); c.fill();
        c.fillStyle = '#111'; elipse(c, x + 0.18, y, 0.26, 0.55); c.fill();
        c.fillStyle = '#fff'; elipse(c, x + 0.36, y - 0.28, 0.16, 0.16); c.fill();
        c.strokeStyle = '#2b1608'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(x - 0.9, y - 0.75); c.lineTo(x + 0.8, y - 0.55); c.stroke(); // ceja de guerrero
      }
      c.fillStyle = '#2b1608'; for (const [x, y] of [[3.0, -10.7], [3.6, -10.5], [3.3, -11.2]]) { elipse(c, x, y, 0.13, 0.13); c.fill(); } // bigotes
      c.strokeStyle = '#2b1608'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(4.7, -11.2); c.quadraticCurveTo(4.3, -10.3, 3.6, -10.5); c.stroke();
    }
    // Brazo de adelante
    brazo(1.4, -8.0, q.brazoA, p.pelaje);
  }

  // ---------- Xochiquetzal: huipil, máscara de madera, corona de flores y niebla ----------
  function flor(c, x, y, r, color, centro) {
    c.fillStyle = color;
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4; elipse(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.55); c.fill(); }
    c.fillStyle = centro; elipse(c, x, y, r * 0.38, r * 0.38); c.fill();
  }
  function pintarXochiquetzal(c, o) {
    const p = POR_ID.xochiquetzal.piel[o.poder === 'fuego' ? 'fuego' : 'base'], t = o.t || 0, pose = o.pose, q = postura(o), linea = p.linea;
    const vuela = o.quieto ? 0 : t;
    // Niebla que brilla (detrás)
    const niebla = (desde, hasta, alfa, ancho) => {
      c.strokeStyle = p.niebla + alfa + ')'; c.lineWidth = ancho; c.lineCap = 'round';
      c.beginPath(); for (let k = 0; k <= 16; k++) { const u = desde + (hasta - desde) * k / 16, x = Math.cos(u + vuela * 1.2) * 6.2, y = -6.5 + Math.sin(u * 2 + vuela * 0.8) * 2.2 - u * 0.25; if (k) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    };
    niebla(Math.PI * 0.9, Math.PI * 2.1, 0.22, 2.4); niebla(Math.PI * 0.9, Math.PI * 2.1, 0.45, 0.8);
    // Pelo largo detrás de la espalda
    c.fillStyle = p.pelo; c.beginPath(); c.moveTo(-3.4, -12.8); c.quadraticCurveTo(-4.6, -7.5, -3.6, -4.6); c.lineTo(-0.6, -5.2); c.lineTo(0.2, -11); c.closePath(); c.fill();
    // Brazo de atrás
    miembro(c, -0.7, -8.0, q.brazoB, 3.2, 1.3, p.piel, linea);
    // Falda larga con franja bordada (se mece al caminar) y pies
    const meneo = pose === 'camina' ? Math.sin(o.fase || 0) * 0.6 : segunPose(pose, -0.5, 0.6, 0);
    c.fillStyle = '#3b2416'; elipse(c, -1.2 + meneo, -0.45, 1.1, 0.5); c.fill(); elipse(c, 1.6 - meneo, -0.45, 1.1, 0.5); c.fill();
    c.beginPath(); c.moveTo(-2.7, -4.6); c.lineTo(2.9, -4.6); c.lineTo(3.7 - meneo * 0.4, -0.8); c.lineTo(-3.5 - meneo * 0.4, -0.8); c.closePath(); relleno(c, p.huipil, linea, 0.4);
    c.fillStyle = p.flor[1]; c.fillRect(-3.4 - meneo * 0.4, -1.9, 7.0, 0.55);
    c.fillStyle = p.flor[0]; c.fillRect(-3.45 - meneo * 0.4, -1.35, 7.1, 0.45);
    c.fillStyle = p.hoja; for (let k = 0; k < 4; k++) { elipse(c, -2.2 + k * 1.7 - meneo * 0.3, -2.6, 0.45, 0.25, 0.5); c.fill(); }
    // Huipil cuadrado con flores de cempasúchil bordadas
    rrect(c, -3.0, -9.0, 6.2, 5.0, 1.1); relleno(c, p.huipil, linea, 0.4);
    c.fillStyle = p.huipil2; c.fillRect(-3.0, -5.0, 6.2, 0.5);
    c.fillStyle = p.flor[1]; c.fillRect(-1.0, -9.0, 3.6, 0.55); c.fillRect(-1.0, -9.0, 0.5, 2.0); c.fillRect(2.1, -9.0, 0.5, 2.0);
    flor(c, 0.9, -6.3, 1.25, p.flor[0], '#b45309');
    flor(c, -1.9, -6.8, 0.85, p.flor[1], '#fde68a');
    flor(c, 2.4, -5.0, 0.75, p.flor[2], '#fde68a');
    c.fillStyle = p.hoja; elipse(c, -0.4, -5.2, 0.6, 0.3, -0.6); c.fill(); elipse(c, 2.1, -7.4, 0.55, 0.28, 0.6); c.fill();
    // Cabeza: pelo y máscara ritual de madera
    elipse(c, 0.4, -12.2, 3.9, 3.8); relleno(c, p.pelo, linea);
    c.fillStyle = p.pelo2; elipse(c, -0.6, -14.3, 1.8, 0.7, -0.2); c.fill();
    elipse(c, 1.8, -11.7, 2.7, 3.2, 0.08); relleno(c, p.mascara, p.mascara2, 0.4);
    c.strokeStyle = p.mascara2; c.lineWidth = 0.3;
    c.beginPath(); c.arc(1.6, -13.6, 0.8, Math.PI, Math.PI * 2.2); c.moveTo(0.5, -9.8); c.quadraticCurveTo(1.9, -9.0, 3.4, -9.9); c.stroke(); // tallado
    c.beginPath(); c.moveTo(3.6, -12.2); c.lineTo(4.4, -11.2); c.lineTo(3.7, -10.8); c.stroke(); // nariz tallada
    c.fillStyle = 'rgba(255,255,255,.25)'; elipse(c, 1.0, -13.4, 1, 0.45, -0.3); c.fill();
    // Ojos de la máscara: huecos con brillo turquesa (o la expresión de la pose)
    if (pose === 'gana' || pose === 'dano' || pose === 'pierde') cara(c, o, [[1.4, -12.0], [3.3, -12.0]], null, '#2a160c');
    else {
      const brillo = o.quieto ? 1 : 0.8 + 0.2 * Math.sin(t * 2.6);
      for (const [x, y] of [[1.4, -12.0], [3.3, -12.0]]) {
        c.fillStyle = '#2a160c'; elipse(c, x, y, 0.75, 0.55); c.fill();
        c.globalAlpha *= brillo; c.fillStyle = p.ojo; elipse(c, x + 0.1, y, 0.32, 0.32); c.fill(); c.globalAlpha /= brillo;
      }
    }
    // Corona de flores: cempasúchil, magenta y morado
    const corona = [[-2.8, -13.9, 1.05, 2], [-1.5, -15.4, 1.2, 0], [0.4, -16.2, 1.25, 1], [2.3, -15.8, 1.15, 0], [3.7, -14.6, 0.95, 1]];
    for (const [x, y, r, k] of corona) flor(c, x, y, r, p.flor[k], k === 0 ? '#b45309' : '#fde68a');
    c.fillStyle = p.hoja; elipse(c, -0.6, -16.2, 0.7, 0.3, -0.4); c.fill(); elipse(c, 3.2, -16.0, 0.6, 0.28, 0.5); c.fill();
    // Brazo de adelante con pulsera
    miembro(c, 1.1, -8.0, q.brazoA, 3.2, 1.3, p.piel, linea);
    c.save(); c.translate(1.1, -8.0); c.rotate(q.brazoA); c.fillStyle = p.flor[0]; c.fillRect(-0.7, 2.2, 1.4, 0.45); c.restore();
    // Niebla (por delante, más tenue)
    niebla(Math.PI * 1.95, Math.PI * 2.85, 0.35, 0.7);
  }

  const DIBUJOS = { xalli: pintarXalli, itzae: pintarItzae, yahui: pintarYahui, xochiquetzal: pintarXochiquetzal };
  function pintar(c, id, o) {
    o = o || {};
    c.save();
    c.lineJoin = c.lineCap = 'round';
    (DIBUJOS[id] || pintarXalli)(c, { pose: o.pose || 'quieto', fase: o.fase || 0, t: o.t || 0, poder: o.poder || 'base', quieto: !!o.quieto });
    c.restore();
  }

  const retratos = {};
  function retrato(id, pose, poder) {
    id = normalizar(id); pose = pose || 'quieto'; poder = poder || 'base';
    const k = id + '|' + pose + '|' + poder;
    if (retratos[k]) return retratos[k];
    const c = g.document.createElement('canvas'); c.width = c.height = 128;
    let dx = 64;
    if (id === 'xalli') dx = 62; else if (id === 'yahui') dx = 72;
    const x = c.getContext('2d'); x.translate(dx, id === 'xalli' ? 116 : 126); const e = 5.6; x.scale(e, e);
    pintar(x, id, { pose, fase: 0, t: 0.5, poder, quieto: true });
    return (retratos[k] = c.toDataURL());
  }

  g.Personajes = { LISTA, POR_OMISION, CLAVE, porId: id => POR_ID[normalizar(id)], normalizar, preferencia, pintar, retrato };
})(typeof window !== 'undefined' ? window : globalThis);
