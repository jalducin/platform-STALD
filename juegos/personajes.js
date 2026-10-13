/* Personajes de Arcade (openspec: personajes-xalli y personajes-estilo-karts): Xalli, Itzae, Yahui, Xochiquetzal,
   Xolo, Tlali, Tona y Kinich.
   Fuente única de sus datos (nombre, título, colores, partícula), de la preferencia del navegador y del dibujo de
   perfil que usan «Axo y los 12 mundos» (para jugar, la portada y el mapa) y «Karts Turbo» (tarjetas del selector).
   El piloto de espaldas en el kart vive en karts.html porque depende de su modelo 3D.

   Personajes.LISTA                       [{ id, nombre, titulo, personalidad, peso, emoji, particula, estela, firma,
                                          encuadre, kart, piel }] (en el orden de los selectores)
   Personajes.masa(id), repartoChoque(ma, mb)   peso estilo karts: solo reparte el empuje de los choques
   Personajes.piloto(id)                  cabeza de espaldas en el kart (y accesorio) de los personajes nuevos; null
                                          para las 4 originales (esas viven en karts.html)
   Personajes.pintarParticula(c, forma, x, y, r, rot, color)   huellitas, notas, gotas o pelotitas (false si no es nueva)
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
      personalidad: 'Tranquilo y valiente; cuida los canales', peso: 'medio', estela: ['#c8f5ff', '#7dd3fc'], encuadre: [62, 116],
      kart: { cuerpo: '#14b8a6', acento: '#ff7f6e', oscuro: '#0f5f59', ropa: '#ffa3c7' },
      piel: {
        base: { cuerpo: '#ffa3c7', sombra: '#ef75a8', vientre: '#ffdae9', bran: '#ff6f91', bran2: '#ffc4d3', halo: 'rgba(255,120,150,.32)', linea: '#b23a72', equipo: '#14b8a6', equipo2: '#0f766e', oro: '#f2c14e', jade: '#34d399' },
        grande: { cuerpo: '#ff98c1', sombra: '#e8649c', vientre: '#ffd3e5', bran: '#ff6f91', bran2: '#ffc4d3', halo: 'rgba(255,120,150,.4)', linea: '#a8326a', equipo: '#14b8a6', equipo2: '#0f766e', oro: '#f2c14e', jade: '#34d399', manchas: '#2dd4bf' },
        fuego: { cuerpo: '#ffb07a', sombra: '#f2793f', vientre: '#ffe4c8', bran: '#ff5a1f', bran2: '#ffd23f', halo: 'rgba(255,140,40,.4)', linea: '#ad4518', equipo: '#14b8a6', equipo2: '#0f766e', oro: '#ffd23f', jade: '#34d399' },
      },
    },
    {
      id: 'itzae', nombre: 'Itzae', titulo: 'Cronista del Sol', emoji: '☀️', particula: 'glifos', firma: '#14b8a6',
      personalidad: 'Curioso; anota todo en su códice', peso: 'ligero', estela: ['#f5c542', '#ffe08a'], encuadre: [64, 126],
      kart: { cuerpo: '#d97706', acento: '#facc15', oscuro: '#6b3410', ropa: '#d08a2c' },
      piel: {
        base: { piel: '#b8784e', piel2: '#8f5a36', pelo: '#1b1410', ropa: '#d08a2c', ropa2: '#9a5a14', banda: '#14b8a6', pluma: ['#14b8a6', '#22c55e', '#0e7490'], punta: '#f5c542', oro: '#f5c542', oro2: '#b7791f', amate: '#d9b77a', linea: '#5a3418' },
        fuego: { piel: '#b8784e', piel2: '#8f5a36', pelo: '#1b1410', ropa: '#e8590c', ropa2: '#9a2f05', banda: '#facc15', pluma: ['#fb923c', '#facc15', '#ef4444'], punta: '#fff3b0', oro: '#ffd23f', oro2: '#c2410c', amate: '#f3d29a', linea: '#5a2410' },
      },
    },
    {
      id: 'yahui', nombre: 'Yahui', titulo: 'Guerrero Jaguar de las Nubes', emoji: '🐆', particula: 'hojas', firma: '#e9a83a',
      personalidad: 'Fuerte y noble; nunca se rinde', peso: 'pesado', estela: ['#22c55e', '#84cc16'], encuadre: [72, 126],
      kart: { cuerpo: '#eab308', acento: '#1f2430', oscuro: '#1f2430', manchas: '#4a2a10', ropa: '#e9a83a' },
      piel: {
        base: { pelaje: '#e9a83a', pelaje2: '#c47f1e', crema: '#f6e7c8', manchas: '#4a2a10', ojo: '#f5d142', obsidiana: '#1f2430', brillo: '#7c8597', jade: '#10b981', pluma: ['#16a34a', '#22c55e', '#0f766e'], ropa: '#0f766e', oro: '#f2c14e', linea: '#6b3f0e' },
        fuego: { pelaje: '#f59e0b', pelaje2: '#d9480f', crema: '#ffe8c2', manchas: '#5a1a05', ojo: '#fff3b0', obsidiana: '#1f2430', brillo: '#7c8597', jade: '#facc15', pluma: ['#ef4444', '#fb923c', '#facc15'], ropa: '#b91c1c', oro: '#ffd23f', linea: '#7a2a05' },
      },
    },
    {
      id: 'xochiquetzal', nombre: 'Xochiquetzal', titulo: 'Señora de la Niebla y las Flores', emoji: '🌺', particula: 'petalos', firma: '#db2777',
      personalidad: 'Serena y misteriosa; deja flores al pasar', peso: 'medio', estela: ['#f59e0b', '#db2777', '#a855f7'], encuadre: [64, 126],
      kart: { cuerpo: '#c026d3', acento: '#f59e0b', oscuro: '#5b1260', ropa: '#f5f0e6' },
      piel: {
        base: { piel: '#a86b45', pelo: '#1f1630', pelo2: '#3b2a55', mascara: '#b07a45', mascara2: '#7a4a22', ojo: '#5eead4', huipil: '#f5f0e6', huipil2: '#d9d2c3', flor: ['#f59e0b', '#db2777', '#a855f7'], hoja: '#16a34a', niebla: 'rgba(94,234,212,', linea: '#4a2e1c' },
        fuego: { piel: '#a86b45', pelo: '#1f1630', pelo2: '#5a2a2a', mascara: '#c2410c', mascara2: '#7c2d12', ojo: '#fde68a', huipil: '#fff1e0', huipil2: '#f3c9a0', flor: ['#f97316', '#dc2626', '#facc15'], hoja: '#b45309', niebla: 'rgba(251,146,60,', linea: '#4a1e0c' },
      },
    },
    // ---- Personajes estilo karts (openspec: personajes-estilo-karts) ----
    {
      id: 'xolo', nombre: 'Xolo', titulo: 'Guía Veloz de los Caminos', emoji: '🐕', particula: 'huellas', firma: '#6b7a90',
      personalidad: 'Chiquito, rapidísimo y muy travieso', peso: 'ligero', estela: ['#f0a6b4', '#e2e8f0'], encuadre: [64, 124],
      kart: { cuerpo: '#059669', acento: '#f2c14e', oscuro: '#064e3b', ropa: '#6b7a90' },
      piel: {
        base: { piel: '#6b7a90', piel2: '#55637a', hocico: '#8492a8', manchas: '#d9a3ac', oreja: '#f0a6b4', copete: '#262b36', nariz: '#151821', jade: '#10b981', jade2: '#047857', oro: '#f2c14e', linea: '#2b3442' },
        fuego: { piel: '#a0705c', piel2: '#83533f', hocico: '#c08a6e', manchas: '#ffc08a', oreja: '#ffd166', copete: '#7c2d12', nariz: '#2a1208', jade: '#facc15', jade2: '#c2410c', oro: '#fff3b0', linea: '#4a1e0c' },
      },
    },
    {
      id: 'tlali', nombre: 'Tlali', titulo: 'Saltarina de los Valles', emoji: '🦗', particula: 'notas', firma: '#84cc16',
      personalidad: 'Chistosa y bailadora; salta de alegría', peso: 'ligero', estela: ['#e11d48', '#f59e0b', '#3b82f6'], encuadre: [68, 124],
      kart: { cuerpo: '#84cc16', acento: '#e11d48', oscuro: '#3f6212', ropa: '#e11d48' },
      piel: {
        base: { cuerpo: '#84cc16', cuerpo2: '#65a30d', panza: '#d9f99d', ojo: '#2a3a10', sombrero: '#f3d58a', sombrero2: '#c9a24f', bordado: ['#e11d48', '#f59e0b', '#3b82f6', '#a855f7'], rebozo: '#e11d48', linea: '#3f6212' },
        fuego: { cuerpo: '#fb923c', cuerpo2: '#ea580c', panza: '#fed7aa', ojo: '#431407', sombrero: '#fde68a', sombrero2: '#d97706', bordado: ['#dc2626', '#facc15', '#f97316', '#fff3b0'], rebozo: '#dc2626', linea: '#7c2d12' },
      },
    },
    {
      id: 'tona', nombre: 'Tona', titulo: 'Sabia de la Costa', emoji: '🐢', particula: 'gotas', firma: '#5f8a3a',
      personalidad: 'Grande, fuerte y paciente; sabe muchas historias', peso: 'pesado', estela: ['#7dd3fc', '#38bdf8'], encuadre: [62, 124],
      kart: { cuerpo: '#0369a1', acento: '#fcd34d', oscuro: '#0c4a6e', ropa: '#7cc0a5' },
      piel: {
        base: { caparazon: '#5f8a3a', caparazon2: '#3f6b2a', placa: '#86a95a', borde: '#d6c27a', piel: '#7cc0a5', piel2: '#5a9a82', manchas: '#3d7a63', peto: '#efe2b0', ceja: '#f1f5f9', jade: '#10b981', jade2: '#065f46', oro: '#e0b54a', concha: '#f8ead8', concha2: '#e8a98f', pluma: ['#0ea5e9', '#14b8a6'], linea: '#26422e' },
        fuego: { caparazon: '#b45309', caparazon2: '#7c2d12', placa: '#f59e0b', borde: '#fde68a', piel: '#f0a070', piel2: '#d97745', manchas: '#b4532a', peto: '#fff1d6', ceja: '#fff7ed', jade: '#facc15', jade2: '#c2410c', oro: '#fff3b0', concha: '#fff1e0', concha2: '#fb923c', pluma: ['#ef4444', '#facc15'], linea: '#4a1e0c' },
      },
    },
    {
      id: 'kinich', nombre: 'Kinich', titulo: 'Estratega del Juego de Pelota', emoji: '⚫', particula: 'pelotas', firma: '#dc2626',
      personalidad: 'Astuto; siempre tiene un plan', peso: 'medio', estela: ['#2b2118', '#57534e'], encuadre: [68, 126],
      kart: { cuerpo: '#dc2626', acento: '#f5f5f4', oscuro: '#7f1d1d', ropa: '#a96a3f' },
      piel: {
        base: { piel: '#a96a3f', piel2: '#8a5230', pelo: '#16110d', banda: '#dc2626', pluma: ['#0f766e', '#14b8a6', '#22c55e'], pintura: '#dc2626', yugo: '#f5f5f4', yugo2: '#a8a29e', taparrabo: '#dc2626', taparrabo2: '#991b1b', rodillera: '#7c4a1e', pelota: '#2b2118', oro: '#f2c14e', jade: '#10b981', linea: '#4a2a14' },
        fuego: { piel: '#a96a3f', piel2: '#8a5230', pelo: '#16110d', banda: '#f97316', pluma: ['#ef4444', '#fb923c', '#facc15'], pintura: '#facc15', yugo: '#fff7ed', yugo2: '#fdba74', taparrabo: '#ea580c', taparrabo2: '#9a3412', rodillera: '#7c2d12', pelota: '#3a1a0a', oro: '#fff3b0', jade: '#facc15', linea: '#4a1e0c' },
      },
    },
  ];
  // Peso estilo karts: solo reparte el empuje de los choques entre karts (no cambia velocidad, aceleración ni tiempos).
  const MASA = { ligero: 0.8, medio: 1, pesado: 1.25 };
  const POR_ID = Object.fromEntries(LISTA.map(p => [p.id, p]));
  const normalizar = id => (POR_ID[id] ? id : POR_OMISION);
  const masa = id => MASA[POR_ID[normalizar(id)].peso];
  // Fracción del empuje de un choque que se lleva cada kart: cada uno se mueve según la masa del otro.
  const repartoChoque = (ma, mb) => [mb / (ma + mb), ma / (ma + mb)];

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

  // ================= Personajes estilo karts (openspec: personajes-estilo-karts) =================
  const paleta = (id, o) => POR_ID[id].piel[o.poder === 'fuego' ? 'fuego' : 'base'];
  const poligono = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  // Flamita del chile (sin vaivén con movimiento reducido).
  function flamita(c, x, y, o, tam) {
    const fl = o.quieto ? 1 : 0.8 + 0.25 * Math.sin((o.t || 0) * 18 + x);
    tam = tam || 1;
    c.fillStyle = '#ffb703'; elipse(c, x, y - 1.1 * tam * fl, 0.8 * tam, 1.6 * tam * fl); c.fill();
    c.fillStyle = '#fff3b0'; elipse(c, x, y - 0.8 * tam * fl, 0.35 * tam, 0.8 * tam * fl); c.fill();
  }
  const conCara = pose => pose === 'gana' || pose === 'dano' || pose === 'pierde';

  // ---------- Xolo: xoloitzcuintle chiquito y travieso ----------
  function pintarXolo(c, o) {
    const p = paleta('xolo', o), t = o.t || 0, pose = o.pose, q = postura(o), linea = p.linea;
    const ritmo = pose === 'camina' ? 14 : 4;
    const wig = o.quieto ? 0 : Math.sin(t * ritmo) * 0.5;
    // Cola delgada que se menea, con su mechón
    let meneo = 0;
    if (!o.quieto) meneo = Math.sin(t * (pose === 'camina' ? 15 : 6)) * 1.1;
    const cola = new Path2D(); cola.moveTo(-2.2, -5.4); cola.quadraticCurveTo(-6.4, -6.2 + meneo * 0.4, -6.1, -10.4 + meneo);
    c.lineCap = 'round';
    c.strokeStyle = linea; c.lineWidth = 1.25; c.stroke(cola);
    c.strokeStyle = p.piel; c.lineWidth = 0.75; c.stroke(cola);
    c.fillStyle = p.copete; elipse(c, -6.1, -10.7 + meneo, 0.55, 0.9, 0.3); c.fill();
    // Brazo de atrás
    const pata = (m, col) => { c.fillStyle = col; elipse(c, m.x + 0.3, m.y, 0.95, 0.7); c.fill(); };
    pata(miembro(c, -0.7, -8.1, q.brazoB, 2.7, 1.2, p.piel2, linea), p.piel2);
    // Piernas cortitas
    const cad = -3.7;
    pata(miembro(c, -0.9, cad, q.piernaB + (q.dobla ? 0.4 : 0), 3.0, 1.45, p.piel2, linea), p.piel2);
    pata(miembro(c, 0.9, cad, q.piernaA, 3.0, 1.45, p.piel, linea), p.piel);
    // Torso con manchas rosas (como la piel de los xolos) y pancita
    rrect(c, -2.5, -8.6, 5.0, 5.0, 2); relleno(c, p.piel, linea);
    c.fillStyle = p.hocico; elipse(c, 1.2, -6.1, 1.3, 1.9); c.fill();
    c.fillStyle = p.manchas; for (const [x, y, r] of [[-1.5, -7.4, 0.6], [-0.4, -5.0, 0.45], [-1.8, -5.4, 0.35]]) { elipse(c, x, y, r, r * 0.8); c.fill(); }
    // Collar de cuentas de jade con dije de oro
    c.fillStyle = p.jade2; rrect(c, -2.3, -9.3, 4.9, 1.1, 0.55); c.fill();
    for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? p.jade2 : p.jade; elipse(c, -1.8 + k * 1.0, -8.75, 0.48, 0.48); c.fill(); }
    c.fillStyle = p.oro; elipse(c, 1.6, -7.8, 0.55, 0.65); c.fill(); c.strokeStyle = linea; c.lineWidth = 0.2; c.stroke();
    // Oreja de atrás (grande y puntiaguda: su silueta)
    poligono(c, [[-1.9, -14.0], [-3.5 + wig * 0.4, -19.4 + wig], [-0.1, -15.5]]); relleno(c, p.piel2, linea, 0.35);
    // Cabeza, hocico y nariz
    elipse(c, 0.4, -12.3, 3.7, 3.4); relleno(c, p.piel, linea);
    elipse(c, 3.5, -11.4, 2.1, 1.45, 0.1); relleno(c, p.hocico, linea, 0.3);
    c.fillStyle = p.nariz; elipse(c, 5.35, -11.8, 0.72, 0.55); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; elipse(c, 5.15, -12.0, 0.22, 0.15); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; elipse(c, -0.6, -14.6, 1.6, 0.6); c.fill();
    c.fillStyle = p.manchas; elipse(c, -1.8, -12.0, 0.9, 0.7); c.fill();
    // Oreja de adelante con su interior rosa
    poligono(c, [[0.0, -15.0], [1.0 + wig * 0.4, -20.2 + wig], [2.6, -14.6]]); relleno(c, p.piel, linea, 0.35);
    poligono(c, [[0.7, -15.1], [1.15 + wig * 0.4, -18.6 + wig], [2.0, -14.9]]); c.fillStyle = p.oreja; c.fill();
    // Copete despeinado
    c.fillStyle = p.copete;
    for (const [x, y, a] of [[-0.9, -15.6, -0.5], [-0.2, -16.0, 0], [0.5, -15.7, 0.5]]) { elipse(c, x, y, 0.45, 1.0, a); c.fill(); }
    if (o.poder === 'fuego') { flamita(c, -3.5 + wig * 0.4, -19.4 + wig, o, 0.7); flamita(c, 1.0 + wig * 0.4, -20.2 + wig, o, 0.7); }
    // Ojos traviesos y lengüita de fuera
    cara(c, o, [[1.4, -12.9], [3.2, -13.0]], conCara(pose) ? [3.4, -10.3] : null, '#14161c');
    if (!conCara(pose)) {
      c.strokeStyle = '#14161c'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(2.4, -10.6); c.quadraticCurveTo(3.4, -10.0, 4.6, -10.7); c.stroke();
      c.fillStyle = '#f472b6'; elipse(c, 3.6, -9.7, 0.6, 0.85); c.fill();
      c.strokeStyle = '#be185d'; c.lineWidth = 0.15; c.beginPath(); c.moveTo(3.6, -10.2); c.lineTo(3.6, -9.2); c.stroke();
    }
    // Brazo de adelante
    pata(miembro(c, 0.9, -8.1, q.brazoA, 2.7, 1.2, p.piel, linea), p.piel);
  }

  // ---------- Tlali: chapulina oaxaqueña con sombrero bordado ----------
  // Antenas largas que se mecen (salen de debajo del sombrero).
  function antenasTlali(c, p, o, linea) {
    const v = o.quieto ? 0 : Math.sin((o.t || 0) * 5) * 0.6;
    c.lineCap = 'round';
    for (const [dx, dv] of [[0, 0], [0.9, 0.5]]) {
      const ant = new Path2D(); ant.moveTo(0.6 + dx, -15.2); ant.quadraticCurveTo(-1.6 + dx, -21.4 + v, -6.6 + dx, -19.6 + v + dv);
      c.strokeStyle = linea; c.lineWidth = 0.75; c.stroke(ant);
      c.strokeStyle = p.cuerpo2; c.lineWidth = 0.42; c.stroke(ant);
      c.fillStyle = p.cuerpo2; elipse(c, -6.6 + dx, -19.6 + v + dv, 0.5, 0.5); c.fill();
      if (o.poder === 'fuego') flamita(c, -6.6 + dx, -19.6 + v + dv, o, 0.55);
    }
  }
  // Pata grande de saltar en «Z» (muslo y canilla); al saltar se estira.
  function pataSaltoTlali(c, p, o, linea) {
    const pose = o.pose, salta = pose === 'salta';
    const camina = pose === 'camina' ? Math.sin(o.fase || 0) * 0.5 : 0;
    const cad = [-1.2, -4.6], rodilla = salta ? [-5.4, -5.4] : [-4.6, -9.3 + camina];
    const pie = salta ? [-8.2, -1.6] : [-3.4, -0.3];
    const ang = Math.atan2(rodilla[1] - cad[1], rodilla[0] - cad[0]), largo = Math.hypot(rodilla[0] - cad[0], rodilla[1] - cad[1]);
    elipse(c, (cad[0] + rodilla[0]) / 2, (cad[1] + rodilla[1]) / 2, largo / 2 + 0.5, 1.35, ang); relleno(c, p.cuerpo, linea, 0.4);
    c.strokeStyle = 'rgba(30,50,5,.4)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(cad[0] - 0.5, cad[1] - 0.5); c.lineTo(rodilla[0] + 0.5, rodilla[1] + 0.3); c.stroke();
    c.strokeStyle = linea; c.lineWidth = 0.95; c.beginPath(); c.moveTo(rodilla[0], rodilla[1]); c.lineTo(pie[0], pie[1]); c.stroke();
    c.strokeStyle = p.cuerpo2; c.lineWidth = 0.55; c.stroke();
    c.fillStyle = p.cuerpo2; elipse(c, pie[0] + 0.5, pie[1], 0.9, 0.4); c.fill();
  }
  // Ojote brillante con pestañas y sonrisa de oreja a oreja (o la expresión de la pose).
  function caraTlali(c, p, o, linea) {
    if (conCara(o.pose)) { cara(c, o, [[2.5, -12.6]], [3.1, -10.3], '#1a2408', 1.3); return; }
    const parpadea = !o.quieto && ((o.t || 0) % 3.7) < 0.12;
    if (parpadea) { c.strokeStyle = p.ojo; c.lineWidth = 0.5; c.beginPath(); c.moveTo(1.4, -12.6); c.lineTo(3.6, -12.6); c.stroke(); }
    else {
      elipse(c, 2.5, -12.6, 1.35, 1.65); relleno(c, p.ojo, linea, 0.25);
      c.fillStyle = '#fff'; elipse(c, 2.95, -13.2, 0.5, 0.55); c.fill(); elipse(c, 2.1, -12.0, 0.22, 0.22); c.fill();
    }
    c.strokeStyle = p.ojo; c.lineWidth = 0.3; // pestañas
    for (const a of [-0.9, -0.5, -0.1]) { c.beginPath(); c.moveTo(2.5 + Math.cos(a - 1.2) * 1.4, -12.6 + Math.sin(a - 1.2) * 1.7); c.lineTo(2.5 + Math.cos(a - 1.2) * 2.1, -12.6 + Math.sin(a - 1.2) * 2.4); c.stroke(); }
    c.fillStyle = '#7f1d1d'; c.beginPath(); c.moveTo(1.6, -10.6); c.quadraticCurveTo(3.4, -8.9, 4.5, -10.9); c.closePath(); c.fill();
    c.fillStyle = '#f87171'; elipse(c, 3.1, -9.9, 0.55, 0.3); c.fill();
  }
  // Sombrero de ala ancha con banda bordada de flores.
  function sombreroTlali(c, p, linea) {
    c.save(); c.translate(0.9, -15.2); c.rotate(-0.08);
    elipse(c, 0, 0.2, 6.0, 1.15); relleno(c, p.sombrero2, linea, 0.4);
    elipse(c, 0, 0, 5.7, 0.95); c.fillStyle = p.sombrero; c.fill();
    c.beginPath(); c.moveTo(-2.7, 0); c.bezierCurveTo(-2.6, -3.4, 2.6, -3.4, 2.7, 0); c.closePath(); relleno(c, p.sombrero, linea, 0.4);
    c.fillStyle = p.bordado[0]; c.fillRect(-2.6, -1.05, 5.2, 0.8);
    p.bordado.forEach((col, k) => { c.fillStyle = col; elipse(c, -4.6 + k * 3.05, 0.1, 0.45, 0.32); c.fill(); });
    c.fillStyle = p.bordado[1]; for (const x of [-1.6, 0, 1.6]) { elipse(c, x, -0.65, 0.3, 0.3); c.fill(); }
    c.restore();
  }
  function pintarTlali(c, o) {
    const p = paleta('tlali', o), q = postura(o), linea = p.linea;
    antenasTlali(c, p, o, linea);
    // Abdomen alargado con rayas
    elipse(c, -3.3, -5.8, 3.4, 1.8, -0.3); relleno(c, p.cuerpo2, linea, 0.4);
    c.strokeStyle = 'rgba(30,50,5,.35)'; c.lineWidth = 0.3;
    for (const x of [-5.2, -4.0, -2.8]) { c.beginPath(); c.moveTo(x, -7.4 + (x + 5) * 0.3); c.lineTo(x + 0.5, -4.5 + (x + 5) * 0.3); c.stroke(); }
    // Bracito de atrás
    miembro(c, -0.4, -8.0, q.brazoB, 2.6, 0.85, p.cuerpo2, linea);
    pataSaltoTlali(c, p, o, linea);
    // Patitas para caminar
    const piernaA = q.piernaA, piernaB = q.piernaB + (q.dobla ? 0.4 : 0);
    for (const [x, a, col] of [[-0.5, piernaB, p.cuerpo2], [0.7, piernaA, p.cuerpo]]) {
      const m = miembro(c, x, -4.2, a, 3.7, 0.85, col, linea);
      c.fillStyle = p.rebozo; elipse(c, m.x + 0.4, m.y - 0.25, 0.85, 0.42); c.fill(); // zapatitos
    }
    // Torso con pancita y rebozo bordado cruzado
    rrect(c, -1.8, -8.7, 3.9, 4.8, 1.6); relleno(c, p.cuerpo, linea);
    c.fillStyle = p.panza; elipse(c, 0.9, -6.4, 1.1, 1.9); c.fill();
    c.strokeStyle = p.rebozo; c.lineWidth = 1.0; c.lineCap = 'butt'; c.beginPath(); c.moveTo(-1.8, -8.4); c.lineTo(2.1, -4.8); c.stroke();
    c.fillStyle = p.bordado[1]; for (let k = 0; k < 3; k++) { elipse(c, -0.9 + k * 1.2, -7.6 + k * 1.1, 0.28, 0.28); c.fill(); }
    // Cabeza grande con ojote brillante y sonrisa de oreja a oreja
    elipse(c, 1.0, -12.0, 3.6, 3.3); relleno(c, p.cuerpo, linea);
    c.fillStyle = p.panza; elipse(c, 2.6, -10.6, 1.8, 1.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; elipse(c, -0.2, -14.0, 1.4, 0.5); c.fill();
    caraTlali(c, p, o, linea);
    c.fillStyle = 'rgba(244,114,182,.55)'; elipse(c, 1.2, -10.7, 0.75, 0.45); c.fill();
    sombreroTlali(c, p, linea);
    // Bracito de adelante (saluda al festejar)
    miembro(c, 1.0, -8.0, q.brazoA, 2.6, 0.85, p.cuerpo, linea);
  }

  // ---------- Tona: tortuga marina sabia con yelmo de jade y concha ----------
  // Caparazón grande con placas hexagonales (centrado en su espalda).
  function caparazonTona(c, p, linea) {
    c.save(); c.translate(-1.8, -7.4); c.rotate(-0.12);
    elipse(c, 0, 0, 4.4, 5.4); relleno(c, p.caparazon, linea, 0.5);
    c.strokeStyle = p.borde; c.lineWidth = 0.55; elipse(c, 0, 0, 4.0, 5.0); c.stroke();
    c.fillStyle = p.placa;
    for (const [x, y, rx, ry] of [[0.2, -2.6, 1.5, 1.2], [0.4, 0, 1.6, 1.25], [0.2, 2.6, 1.5, 1.2], [-2.2, -1.3, 1, 1.3], [-2.2, 1.4, 1, 1.3]]) {
      c.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry); }
      c.closePath(); c.fill();
      c.strokeStyle = p.caparazon2; c.lineWidth = 0.25; c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,.28)'; elipse(c, -1.0, -3.6, 1.8, 0.7, -0.5); c.fill();
    c.restore();
  }
  // Ojos sabios de párpado medio y cejas blancas (o la expresión de la pose).
  function ojosTona(c, p, o, linea) {
    if (conCara(o.pose)) { cara(c, o, [[3.3, -12.9], [4.9, -12.9]], [4.6, -10.9], '#14140f'); return; }
    for (const x of [3.3, 4.9]) {
      c.fillStyle = '#14140f'; elipse(c, x, -12.8, 0.7, 0.85); c.fill();
      c.fillStyle = '#fff'; elipse(c, x + 0.25, -12.55, 0.22, 0.22); c.fill();
      c.fillStyle = p.piel; c.beginPath(); c.ellipse(x, -12.95, 0.85, 0.7, 0, Math.PI, Math.PI * 2); c.fill(); // párpado
      c.strokeStyle = linea; c.lineWidth = 0.25; c.beginPath(); c.moveTo(x - 0.8, -12.95); c.lineTo(x + 0.8, -12.95); c.stroke();
      c.strokeStyle = p.ceja; c.lineWidth = 0.55; c.beginPath(); c.moveTo(x - 0.8, -14.0); c.quadraticCurveTo(x, -14.5, x + 0.8, -14.1); c.stroke();
    }
    c.strokeStyle = '#14140f'; c.lineWidth = 0.4; c.beginPath(); c.arc(4.4, -11.6, 0.9, Math.PI * 0.25, Math.PI * 0.75); c.stroke();
  }
  function pintarTona(c, o) {
    const p = paleta('tona', o), q = postura(o), linea = p.linea;
    // Aleta y pata de atrás
    miembro(c, -0.2, -8.3, q.brazoB * 0.8, 3.3, 2.0, p.piel2, linea);
    const cad = -3.1;
    miembro(c, -1.4, cad, q.piernaB * 0.7 + (q.dobla ? 0.3 : 0), 2.8, 2.1, p.piel2, linea);
    caparazonTona(c, p, linea);
    // Pata de adelante
    miembro(c, 1.2, cad, q.piernaA * 0.7, 2.8, 2.1, p.piel, linea);
    // Peto (pecho) con sus franjas
    elipse(c, 1.5, -6.6, 2.7, 3.9); relleno(c, p.peto, linea, 0.4);
    c.strokeStyle = 'rgba(120,100,40,.45)'; c.lineWidth = 0.25;
    for (const y of [-8.4, -6.6, -4.8]) { c.beginPath(); c.moveTo(-0.6, y); c.lineTo(3.8, y + 0.2); c.stroke(); }
    // Cuello y cabeza con pico
    rrect(c, 1.0, -11.2, 2.8, 3.2, 1.2); relleno(c, p.piel, linea, 0.35);
    elipse(c, 2.9, -12.6, 3.3, 2.9); relleno(c, p.piel, linea);
    c.fillStyle = p.manchas; for (const [x, y, r] of [[0.8, -12.0, 0.5], [1.6, -14.2, 0.45], [0.6, -13.6, 0.35], [2.0, -10.7, 0.35]]) { elipse(c, x, y, r, r * 0.8); c.fill(); }
    c.fillStyle = p.piel2; c.beginPath(); c.moveTo(5.4, -12.9); c.quadraticCurveTo(6.7, -12.4, 6.0, -11.3); c.lineTo(5.0, -11.6); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; elipse(c, 1.8, -14.6, 1.4, 0.5); c.fill();
    ojosTona(c, p, o, linea);
    // Yelmo de jade con cresta de concha, plumas y orejera (zapoteca)
    for (const [k, a] of [[0, -2.5], [1, -2.15]]) {
      c.save(); c.translate(1.6, -16.4); c.rotate(a + (o.quieto ? 0 : Math.sin((o.t || 0) * 3 + k) * 0.05));
      elipse(c, 2.4, 0, 2.6, 0.8); relleno(c, p.pluma[k], 'rgba(5,30,40,.5)', 0.25); c.restore();
    }
    c.fillStyle = p.jade; c.beginPath(); c.arc(2.9, -12.6, 3.45, Math.PI * 1.08, Math.PI * 1.86); c.arc(2.9, -12.6, 2.55, Math.PI * 1.86, Math.PI * 1.08, true); c.closePath(); c.fill();
    c.strokeStyle = p.jade2; c.lineWidth = 0.25; c.stroke();
    c.fillStyle = p.oro; for (const a of [1.25, 1.5, 1.75]) { elipse(c, 2.9 + Math.cos(Math.PI * a) * 2.95, -12.6 + Math.sin(Math.PI * a) * 2.95, 0.3, 0.3); c.fill(); }
    elipse(c, 2.4, -16.6, 1.3, 1.25); relleno(c, p.concha, p.concha2, 0.35);
    c.strokeStyle = p.concha2; c.lineWidth = 0.3; c.beginPath(); for (let k = 0; k <= 20; k++) { const a = k * 0.6, r = 0.15 + k * 0.05; c.lineTo(2.4 + Math.cos(a) * r, -16.6 + Math.sin(a) * r); } c.stroke();
    if (o.poder === 'fuego') flamita(c, 2.4, -17.7, o, 0.8);
    elipse(c, 0.7, -11.9, 0.95, 0.95); relleno(c, p.jade, p.oro, 0.35);
    c.fillStyle = p.jade2; elipse(c, 0.7, -11.9, 0.35, 0.35); c.fill();
    // Aleta de adelante (ancha)
    const m = miembro(c, 1.6, -8.3, q.brazoA * 0.8, 3.3, 2.0, p.piel, linea);
    c.fillStyle = p.manchas; elipse(c, (1.6 + m.x) / 2, (-8.3 + m.y) / 2, 0.4, 0.4); c.fill();
  }

  // ---------- Kinich: jugador de pelota maya, astuto ----------
  function pintarKinich(c, o) {
    const p = paleta('kinich', o), t = o.t || 0, pose = o.pose, q = postura(o), linea = p.linea;
    const v = o.quieto ? 0 : Math.sin(t * 3) * 0.05;
    // Pluma larga de quetzal que sale del moño hacia atrás
    c.save(); c.translate(-0.3, -16.4); c.rotate(-2.75 + v + segunPose(pose, 0.15, -0.15, 0));
    elipse(c, 3.8, 0, 4.2, 0.9, 0.05); relleno(c, p.pluma[0], 'rgba(5,30,20,.5)', 0.3);
    elipse(c, 4.6, 0.1, 3.0, 0.5, 0.05); c.fillStyle = p.pluma[1]; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.2; c.beginPath(); c.moveTo(0.4, 0); c.lineTo(7.6, 0.25); c.stroke();
    if (o.poder === 'fuego') flamita(c, 8.1, 0.2, o, 0.6);
    c.restore();
    // Brazo de atrás con muñequera
    miembro(c, -0.6, -8.0, q.brazoB, 3.2, 1.35, p.piel2, linea);
    // Piernas: rodillera de cuero en la de adelante y sandalias
    const cad = -4.2;
    const pierna = (x, a, col, rodilla) => {
      miembro(c, x, cad, a, 3.5, 1.55, col, linea);
      if (rodilla) { c.save(); c.translate(x, cad); c.rotate(a); rrect(c, -1.05, 1.0, 2.1, 1.3, 0.5); relleno(c, p.rodillera, linea, 0.25); c.restore(); }
      const px = x - Math.sin(a) * 3.4, py = cad + Math.cos(a) * 3.4;
      c.fillStyle = '#5b3a1e'; rrect(c, px - 0.8, py - 0.4, 2.2, 0.9, 0.4); c.fill();
    };
    pierna(-0.9, q.piernaB + (q.dobla ? 0.4 : 0), p.piel2, false);
    pierna(1.0, q.piernaA, p.piel, true);
    // Torso y pectoral de jade
    rrect(c, -2.4, -8.9, 5.2, 4.8, 1.5); relleno(c, p.piel, linea);
    c.strokeStyle = p.oro; c.lineWidth = 0.3; c.beginPath(); c.arc(0.6, -9.6, 2.1, 0.4, 2.7); c.stroke();
    c.fillStyle = p.jade; elipse(c, 0.6, -7.6, 0.6, 0.7); c.fill();
    // Yugo protector en la cadera (lo usan los jugadores de pelota) y taparrabo rojo
    c.fillStyle = p.taparrabo; c.beginPath(); c.moveTo(0.3, -3.6); c.lineTo(2.6, -3.6); c.lineTo(2.3, -1.4); c.lineTo(0.6, -1.4); c.closePath(); c.fill();
    c.fillStyle = p.taparrabo2; c.fillRect(0.6, -2.2, 1.7, 0.4);
    rrect(c, -3.0, -5.4, 6.4, 1.9, 0.9); relleno(c, p.yugo, linea, 0.4);
    c.strokeStyle = p.yugo2; c.lineWidth = 0.3;
    for (const x of [-1.8, 0.2, 2.2]) { c.beginPath(); c.arc(x, -4.45, 0.45, 0.2, Math.PI * 1.6); c.stroke(); } // volutas talladas
    // Cabeza: pelo negro, moño alto con cinta roja, banda y orejera de jade
    elipse(c, 0.4, -12.2, 3.9, 3.8); relleno(c, p.pelo, linea);
    elipse(c, 1.4, -11.7, 3.1, 3.2); c.fillStyle = p.piel; c.fill();
    c.fillStyle = p.pelo; c.beginPath(); c.moveTo(-1.8, -14.7); c.quadraticCurveTo(2.0, -16.2, 4.4, -13.4); c.quadraticCurveTo(2.4, -14.0, 0.2, -13.6); c.closePath(); c.fill();
    elipse(c, -0.3, -16.3, 1.35, 1.2); relleno(c, p.pelo, linea, 0.3);
    c.fillStyle = p.banda; c.fillRect(-1.1, -15.4, 1.8, 0.7);
    c.fillStyle = p.banda; c.beginPath(); c.arc(0.4, -12.2, 4.2, Math.PI * 1.12, Math.PI * 1.92); c.arc(0.4, -12.2, 3.5, Math.PI * 1.92, Math.PI * 1.12, true); c.closePath(); c.fill();
    c.fillStyle = p.piel2; elipse(c, -1.4, -11.6, 0.9, 1.2); c.fill();
    elipse(c, -1.4, -10.9, 0.55, 0.55); relleno(c, p.jade, p.oro, 0.25);
    // Pintura roja sobre los ojos y mirada astuta (ceja levantada, sonrisa de lado)
    c.fillStyle = p.pintura; c.globalAlpha *= 0.55; rrect(c, 0.8, -12.9, 3.8, 0.8, 0.4); c.fill(); c.globalAlpha /= 0.55;
    if (conCara(pose)) cara(c, o, [[1.6, -12.4], [3.5, -12.4]], [2.8, -10.1], '#20100a');
    else {
      for (const x of [1.6, 3.5]) {
        c.fillStyle = '#20100a'; elipse(c, x, -12.35, 0.75, 0.55); c.fill();
        c.fillStyle = '#fff'; elipse(c, x + 0.3, -12.5, 0.2, 0.17); c.fill();
      }
      c.strokeStyle = '#20100a'; c.lineWidth = 0.45;
      c.beginPath(); c.moveTo(0.8, -13.4); c.lineTo(2.3, -13.3); c.stroke();
      c.beginPath(); c.moveTo(2.8, -13.6); c.quadraticCurveTo(3.6, -14.3, 4.4, -13.7); c.stroke(); // ceja levantada
      c.lineWidth = 0.45; c.beginPath(); c.moveTo(2.0, -10.4); c.quadraticCurveTo(3.0, -10.0, 3.9, -10.9); c.stroke(); // sonrisa de lado
    }
    // Brazo de adelante con muñequera y la pelota de hule
    const mano = miembro(c, 1.0, -8.0, q.brazoA, 3.2, 1.35, p.piel, linea);
    c.save(); c.translate(1.0, -8.0); c.rotate(q.brazoA); c.fillStyle = p.yugo; c.fillRect(-0.75, 2.0, 1.5, 0.6); c.restore();
    let bola = { x: mano.x + 0.9, y: mano.y - 0.6 };
    if (pose === 'pierde') bola = { x: 4.6, y: -1.3 };
    else if (pose === 'camina') bola = { x: mano.x + 0.9, y: mano.y - 0.6 - Math.abs(Math.sin(o.fase || 0)) * 0.8 };
    elipse(c, bola.x, bola.y, 1.45, 1.45); relleno(c, p.pelota, '#000', 0.25);
    c.fillStyle = 'rgba(255,255,255,.45)'; elipse(c, bola.x - 0.45, bola.y - 0.5, 0.45, 0.32); c.fill();
  }

  const DIBUJOS = { xalli: pintarXalli, itzae: pintarItzae, yahui: pintarYahui, xochiquetzal: pintarXochiquetzal, xolo: pintarXolo, tlali: pintarTlali, tona: pintarTona, kinich: pintarKinich };
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
    const [dx, dy] = POR_ID[id].encuadre;
    const x = c.getContext('2d'); x.translate(dx, dy); const e = 5.6; x.scale(e, e);
    pintar(x, id, { pose, fase: 0, t: 0.5, poder, quieto: true });
    return (retratos[k] = c.toDataURL());
  }

  // ================= Piloto de espaldas en Karts (personajes nuevos; openspec: personajes-estilo-karts) =================
  // Mismas reglas que pintarCabeza de karts.html: S(x, y, z) → { x, y, d } en el sprite (d mayor = más lejos de la
  // cámara); HC = centro de la cabeza; cr y sr = coseno y seno del ángulo kart–cámara (cr < 0.35: se ve la cara).
  const capsula = (c, a, b, ancho, color) => { c.strokeStyle = color; c.lineWidth = ancho; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
  const circulo = (c, q, r, color, linea) => { c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); if (linea) { c.strokeStyle = linea; c.lineWidth = 0.4; c.stroke(); } };
  const llenar = (c, pts, color, linea) => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fillStyle = color; c.fill(); if (linea) { c.strokeStyle = linea; c.lineWidth = 0.4; c.stroke(); } };
  const R_CABEZA = 5.0;
  function caraPiloto(c, h, cr, sr, fondo, tinta, brillo) {
    if (cr >= 0.35) return;
    const ox = h.x + sr * R_CABEZA * 0.42, k = Math.max(0.35, Math.min(1, -cr + 0.6));
    if (fondo) { c.fillStyle = fondo; c.beginPath(); c.ellipse(ox, h.y + 0.6, R_CABEZA * 0.62 * k, R_CABEZA * 0.68, 0, 0, Math.PI * 2); c.fill(); }
    for (const s of [-1, 1]) {
      const x = ox + sr * 0.6 + s * R_CABEZA * 0.28 * k;
      c.fillStyle = tinta; c.beginPath(); c.ellipse(x, h.y - 0.1, 0.55, 0.75, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = brillo || '#ffffff'; c.beginPath(); c.arc(x + 0.15, h.y - 0.35, 0.22, 0, Math.PI * 2); c.fill();
    }
  }
  const PILOTOS = {
    xolo: {
      cabeza(c, S, cr, sr, HC) {
        const p = POR_ID.xolo.piel.base, H = (dx, dy, dz) => S(HC[0] + dx, HC[1] + dy, HC[2] + dz), h = H(0, 0, 0);
        const orejas = [-1, 1].map(l => ({ pts: [H(-0.4, l * 1.6, 3.6), H(-1.2, l * 5.2, 10.2), H(-0.4, l * 4.4, 1.6)], int: [H(-0.2, l * 2.3, 3.4), H(-0.9, l * 4.8, 8.6), H(-0.2, l * 3.9, 2.4)] }));
        const oreja = o => { llenar(c, o.pts, p.piel, p.linea); if (cr < 0.35) llenar(c, o.int, p.oreja); };
        const detras = H(-1.2, 0, 10).d > h.d;
        if (detras) orejas.forEach(oreja);
        circulo(c, H(0, 0, -4.2), 2.6, p.jade, p.jade2); // collar
        circulo(c, h, R_CABEZA, p.piel, p.linea);
        c.fillStyle = p.manchas; const m = H(-3.2 * Math.max(0, cr), 1.8, 1.4); c.beginPath(); c.arc(m.x, m.y, 0.9, 0, Math.PI * 2); c.fill();
        for (const dy of [-0.8, 0, 0.8]) circulo(c, H(-0.3, dy, 4.6), 0.75, p.copete);
        if (cr < 0.35) { const n = H(4.6, 0, -1.2); circulo(c, H(3.6, 0, -1.0), 2.0, p.hocico); circulo(c, n, 0.75, p.nariz); }
        caraPiloto(c, h, cr, sr, null, '#14161c');
        if (!detras) orejas.forEach(oreja);
        return true;
      },
    },
    tlali: {
      cabeza(c, S, cr, sr, HC) {
        const p = POR_ID.tlali.piel.base, H = (dx, dy, dz) => S(HC[0] + dx, HC[1] + dy, HC[2] + dz), h = H(0, 0, 0);
        const antenas = [-1, 1].map(l => [H(0.4, l * 1.2, 3.6), H(-3.5, l * 2.4, 11.5), H(-8, l * 4.2, 9.5)]);
        const antena = ([a, m, b]) => {
          for (const [ancho, col] of [[1.1, p.linea], [0.65, p.cuerpo2]]) { c.strokeStyle = col; c.lineWidth = ancho; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(m.x, m.y, b.x, b.y); c.stroke(); }
          circulo(c, b, 0.7, p.cuerpo2);
        };
        const detras = H(-6, 0, 10).d > h.d;
        if (detras) antenas.forEach(antena);
        circulo(c, h, R_CABEZA, p.cuerpo, p.linea);
        if (cr < 0.35) { // ojotes con pestañas y sonrisa
          const ox = h.x + sr * R_CABEZA * 0.4;
          for (const s of [-1, 1]) { const x = ox + s * 1.8; c.fillStyle = p.ojo; c.beginPath(); c.ellipse(x, h.y - 0.2, 1.2, 1.5, 0, 0, Math.PI * 2); c.fill(); circulo(c, { x: x + 0.4, y: h.y - 0.8 }, 0.45, '#ffffff'); }
          c.fillStyle = '#7f1d1d'; c.beginPath(); c.ellipse(ox, h.y + 2.4, 1.4, 0.7, 0, 0, Math.PI); c.fill();
        }
        // Sombrero de ala ancha bordado (su silueta desde atrás)
        const ala = [], copa = [];
        for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; ala.push(H(Math.cos(a) * 7.6, Math.sin(a) * 7.6, 3.4)); copa.push(H(Math.cos(a) * 3.4, Math.sin(a) * 3.4, 6.6)); }
        llenar(c, ala, p.sombrero, p.sombrero2);
        for (let k = 0; k < 20; k += 2) { const q = ala[k], b = H(0, 0, 3.4), x = b.x + (q.x - b.x) * 0.78, y = b.y + (q.y - b.y) * 0.78; circulo(c, { x, y }, 0.65, p.bordado[(k / 2) % 4]); }
        llenar(c, copa, p.sombrero, p.sombrero2);
        const banda = H(0, 0, 4.6); c.fillStyle = p.bordado[0]; c.beginPath(); c.ellipse(banda.x, banda.y, 3.5, 1.2, 0, 0, Math.PI * 2); c.fill();
        if (!detras) antenas.forEach(antena);
        return true;
      },
    },
    tona: {
      cabeza(c, S, cr, sr, HC) {
        const p = POR_ID.tona.piel.base, H = (dx, dy, dz) => S(HC[0] + dx, HC[1] + dy, HC[2] + dz), h = H(0, 0, 0);
        const plumas = [-1, 1].map((l, k) => ({ a: H(-1.0, l * 0.8, 5.2), b: H(-5.6, l * 2.6, 11), col: p.pluma[k] }));
        const detras = plumas[0].b.d > h.d;
        const penacho = () => plumas.forEach(f => { capsula(c, f.a, f.b, 2.6, 'rgba(5,30,40,.5)'); capsula(c, f.a, f.b, 2.0, f.col); });
        if (detras) penacho();
        circulo(c, h, R_CABEZA, p.piel, p.linea);
        c.fillStyle = p.manchas; for (const [dy, dz] of [[-2.2, 1.6], [2.0, 2.2], [0, -2.4], [2.8, -1.0]]) { const m = H(-3.4 * Math.max(0, cr), dy, dz); c.beginPath(); c.arc(m.x, m.y, 0.6, 0, Math.PI * 2); c.fill(); }
        c.strokeStyle = p.jade; c.lineWidth = 1.5; c.beginPath(); c.arc(h.x, h.y, R_CABEZA - 0.8, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        caraPiloto(c, h, cr, sr, null, '#14140f');
        for (const l of [-1, 1]) { const q = H(0, l * 4.9, -0.4); circulo(c, q, 1.5, p.jade, p.oro); circulo(c, q, 0.55, p.jade2); } // orejeras
        const cresta = H(0, 0, 5.6); circulo(c, cresta, 1.9, p.concha, p.concha2);
        c.strokeStyle = p.concha2; c.lineWidth = 0.35; c.beginPath(); for (let k = 0; k <= 16; k++) { const a = k * 0.7, r = 0.2 + k * 0.08; c.lineTo(cresta.x + Math.cos(a) * r, cresta.y + Math.sin(a) * r); } c.stroke();
        if (!detras) penacho();
        return true;
      },
      // Caparazón sobre el respaldo (se ordena por su profundidad como una cara más del kart).
      extra: {
        en: [-10.6, 0, 15],
        pintar(c, S) {
          const p = POR_ID.tona.piel.base, borde = [], placa = [];
          for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; borde.push(S(-10.4, Math.cos(a) * 7.4, 15 + Math.sin(a) * 5.4)); placa.push(S(-10.9, Math.cos(a) * 4.5, 15 + Math.sin(a) * 3.3)); }
          llenar(c, borde, p.caparazon, p.linea);
          llenar(c, placa, p.placa, p.caparazon2);
          const centro = S(-10.9, 0, 15);
          c.strokeStyle = p.caparazon2; c.lineWidth = 0.4;
          for (let k = 0; k < 24; k += 4) { const q = placa[k], b = borde[k]; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(b.x, b.y); c.stroke(); }
          c.beginPath(); c.moveTo(centro.x, placa[6].y); c.lineTo(centro.x, placa[18].y); c.stroke();
          c.strokeStyle = p.borde; c.lineWidth = 0.6; c.beginPath(); borde.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.stroke();
        },
      },
    },
    kinich: {
      cabeza(c, S, cr, sr, HC) {
        const p = POR_ID.kinich.piel.base, H = (dx, dy, dz) => S(HC[0] + dx, HC[1] + dy, HC[2] + dz), h = H(0, 0, 0);
        const pl = { a: H(-0.8, 0, 6.2), m: H(-6, 0.8, 9.5), b: H(-11, 1.6, 7.5) };
        const pluma = () => {
          for (const [ancho, col] of [[2.6, 'rgba(5,30,20,.5)'], [2.0, p.pluma[0]], [1.0, p.pluma[1]]]) { c.strokeStyle = col; c.lineWidth = ancho; c.lineCap = 'round'; c.beginPath(); c.moveTo(pl.a.x, pl.a.y); c.quadraticCurveTo(pl.m.x, pl.m.y, pl.b.x, pl.b.y); c.stroke(); }
        };
        const detras = pl.m.d > h.d;
        if (detras) pluma();
        circulo(c, h, R_CABEZA, p.pelo, p.linea);
        c.strokeStyle = p.banda; c.lineWidth = 1.3; c.beginPath(); c.arc(h.x, h.y, R_CABEZA - 0.7, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        if (cr < 0.35) {
          const ox = h.x + sr * R_CABEZA * 0.42, k = Math.max(0.35, Math.min(1, -cr + 0.6));
          c.fillStyle = p.piel; c.beginPath(); c.ellipse(ox, h.y + 0.8, R_CABEZA * 0.62 * k, R_CABEZA * 0.66, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = p.pintura; c.fillRect(ox - R_CABEZA * 0.6 * k, h.y - 0.9, R_CABEZA * 1.2 * k, 1.4);
          caraPiloto(c, h, cr, sr, null, '#20100a');
        }
        for (const l of [-1, 1]) circulo(c, H(0, l * 4.8, -0.6), 0.9, p.jade, p.oro);
        const mono = H(-0.4, 0, 5.4); circulo(c, mono, 2.0, p.pelo, p.linea);
        c.fillStyle = p.banda; c.fillRect(mono.x - 2, mono.y + 0.6, 4, 1);
        if (!detras) pluma();
        return true;
      },
      // Pelota de hule amarrada detrás del asiento.
      extra: {
        en: [-11.5, 7.5, 9],
        pintar(c, S) {
          const p = POR_ID.kinich.piel.base, b = S(-11.5, 7.5, 9), a = S(-8, 5, 11);
          c.strokeStyle = p.yugo2; c.lineWidth = 0.7; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
          circulo(c, b, 3.0, p.pelota, '#000000');
          c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(b.x - 1, b.y - 1.1, 1, 0.7, 0, 0, Math.PI * 2); c.fill();
        },
      },
    },
  };
  const piloto = id => PILOTOS[id] || null;

  // ================= Partículas de los personajes nuevos (las usan Axo y Karts) =================
  // Dibuja la partícula centrada en (x, y) con tamaño r y giro rot; devuelve false si la forma no es de las nuevas.
  function pintarParticula(c, forma, x, y, r, rot, color) {
    const dib = {
      huellas() { // huellita: cojín y tres deditos
        c.fillStyle = color; elipse(c, 0, r * 0.25, r * 0.62, r * 0.5); c.fill();
        for (const [dx, dy] of [[-0.55, -0.45], [0, -0.7], [0.55, -0.45]]) { elipse(c, dx * r, dy * r, r * 0.25, r * 0.3); c.fill(); }
      },
      notas() { // corchea
        c.fillStyle = color; c.strokeStyle = color; c.lineWidth = Math.max(0.2, r * 0.22);
        elipse(c, -r * 0.3, r * 0.5, r * 0.5, r * 0.36, -0.4); c.fill();
        c.beginPath(); c.moveTo(r * 0.15, r * 0.45); c.lineTo(r * 0.15, -r * 1.2); c.quadraticCurveTo(r * 0.9, -r * 0.8, r * 0.75, -r * 0.2); c.stroke();
      },
      gotas() { // gota de agua con brillo
        c.fillStyle = color; c.beginPath(); c.moveTo(0, -r * 1.3); c.quadraticCurveTo(r * 0.9, -r * 0.1, r * 0.6, r * 0.45); c.arc(0, r * 0.3, r * 0.62, 0.2, Math.PI - 0.2); c.quadraticCurveTo(-r * 0.9, -r * 0.1, 0, -r * 1.3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.7)'; elipse(c, -r * 0.2, r * 0.1, r * 0.16, r * 0.26); c.fill();
      },
      pelotas() { // pelotita de hule
        c.fillStyle = color; elipse(c, 0, 0, r * 0.75, r * 0.75); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; elipse(c, -r * 0.25, -r * 0.25, r * 0.22, r * 0.16); c.fill();
      },
    }[forma];
    if (!dib) return false;
    c.save(); c.translate(x, y); c.rotate(forma === 'pelotas' ? 0 : rot * 0.3); dib(); c.restore();
    return true;
  }

  g.Personajes = { LISTA, POR_OMISION, CLAVE, MASA, porId: id => POR_ID[normalizar(id)], normalizar, preferencia, pintar, retrato, masa, repartoChoque, piloto, pintarParticula };
})(typeof window !== 'undefined' ? window : globalThis);
