/* Karts Turbo: definiciones de las pistas y de las copas (openspec: karts-pistas-mesoamericanas).
   Script clásico sin DOM: lo cargan juegos.html y karts.html ANTES de arcade.js, y las pruebas de Deno.
   Cada pista: trazado (curva Catmull-Rom cerrada por `puntos`, `mitad` = medio ancho del camino), física (`fuera`,
   `lento` = tope fuera del camino, `agarre` 1 = asfalto, menos = resbala), colores del piso, `tema` (cielo de 360°),
   `decor` (adornos al azar: [nombre, ancho, alto, probabilidad acumulada]), `fijos` (adornos por tramo), `desc` y
   `mecanicas` (zonas deterministas sobre el camino). `sala: true` = se usa también en las partidas en sala (las 4 de
   siempre, igual que MAPAS_SALA de server/carreras.ts). */
(function (raiz) {
  'use strict';

  const PISTAS = [
    { id: 'pradera', nombre: 'Circuito Pradera', emoji: '🌳', sala: true, desc: 'Lomas verdes, flores y globos: la pista para empezar.',
      mitad: 58, fuera: 'pasto', lento: 0.55, agarre: 1,
      color: { fondo: '#4caf50', fondo2: '#43a047', camino: '#5b5f66', borde1: '#e53935', borde2: '#ffffff', linea: '#f5f5f5' },
      tema: { cielo: ['#2f7fe0', '#86c5f5', '#dff1fd'], bruma: '#d6ecfb', lejos: '#7fa9c9', cerca: '#3f9a4a', cerca2: '#2c7a36', franja: '#3fa046', sol: '#fffbe0', nubes: 1 },
      decor: [['arbol', 46, 62, 0.55], ['arbusto', 26, 17, 0.85], ['globo', 20, 52, 1]],
      puntos: [[560, 265], [800, 230], [1300, 260], [1620, 420], [1650, 760], [1420, 930], [1080, 860], [860, 1040], [520, 1120], [260, 940], [230, 620], [320, 300]] },
    { id: 'desierto', nombre: 'Cañón del Desierto', emoji: '🌵', sala: true, desc: 'Arena que frena, cactus y mesetas al atardecer.',
      mitad: 54, fuera: 'arena', lento: 0.45, agarre: 0.95,
      color: { fondo: '#e9c27a', fondo2: '#ddb067', camino: '#8a6a4a', borde1: '#b5462e', borde2: '#f3e3c3', linea: '#f3e3c3' },
      tema: { cielo: ['#e8662a', '#f7ae6b', '#ffe9c7'], bruma: '#f8dcb4', lejos: '#c88b5c', cerca: '#a5532e', cerca2: '#7e3c1f', franja: '#d8aa62', sol: '#fff6c2', nubes: 0 },
      decor: [['cactus', 22, 46, 0.5], ['rocaDesierto', 40, 24, 0.85], ['mesa', 70, 44, 1]],
      puntos: [[550, 240], [760, 200], [1180, 270], [1560, 220], [1740, 470], [1660, 780], [1320, 860], [1060, 1060], [700, 1180], [400, 1150], [230, 900], [240, 560], [340, 280]] },
    { id: 'hielo', nombre: 'Lago Helado', emoji: '❄️', sala: true, desc: 'El hielo resbala: frena antes de cada curva.',
      mitad: 60, fuera: 'nieve', lento: 0.5, agarre: 0.55,
      color: { fondo: '#eef6fb', fondo2: '#e1eef7', camino: '#9cc9e8', borde1: '#3d7dbf', borde2: '#ffffff', linea: '#ffffff' },
      tema: { cielo: ['#3f9fdc', '#a6daf6', '#effaff'], bruma: '#e6f4fc', lejos: '#9dbcd8', cerca: '#f4f9fd', cerca2: '#a9c9e2', franja: '#dce9f3', sol: '#ffffff', nubes: 1 },
      decor: [['pino', 38, 66, 0.6], ['muneco', 18, 30, 0.75], ['bloque', 26, 22, 1]],
      puntos: [[460, 320], [620, 220], [1040, 320], [1420, 210], [1720, 470], [1640, 880], [1280, 1080], [920, 900], [600, 1100], [280, 1010], [190, 720], [300, 420]] },
    { id: 'volcan', nombre: 'Volcán Rugiente', emoji: '🌋', sala: true, desc: 'Charcos de lava a las orillas: no te salgas.',
      mitad: 54, fuera: 'roca', lento: 0.5, agarre: 0.95, lava: true,
      color: { fondo: '#3b2a2a', fondo2: '#33231f', camino: '#2b2b30', borde1: '#ff6d00', borde2: '#ffd180', linea: '#ffab40' },
      tema: { cielo: ['#12060d', '#4a1416', '#a9381c'], bruma: '#6b2416', lejos: '#3b1c24', cerca: '#1f1218', cerca2: '#120a0e', franja: '#2c1f1e', sol: null, nubes: 0 },
      decor: [['rocaVolcan', 40, 28, 0.5], ['obsidiana', 26, 40, 0.8], ['fumarola', 24, 30, 1]],
      puntos: [[510, 255], [720, 210], [1080, 380], [1440, 250], [1740, 470], [1680, 820], [1380, 950], [1100, 1200], [700, 1180], [450, 1240], [220, 1000], [300, 660], [300, 300]] },

    // ---------- Pistas mesoamericanas (solo carrera rápida y Copa Mesoamericana) ----------
    { id: 'tenochtitlan', nombre: 'Calzadas de Tenochtitlan', emoji: '🛶', civ: 'Mexica', desc: 'Calzadas sobre el lago y chinampas. ¡Cuidado con la trajinera!',
      mitad: 56, fuera: 'agua', lento: 0.42, agarre: 1,
      color: { fondo: '#2b8a96', fondo2: '#23798a', camino: '#c39a5f', borde1: '#a4502a', borde2: '#f1e3c4', linea: '#f6ead0' },
      tema: { cielo: ['#3a86c8', '#9fd0ea', '#eaf6f4'], bruma: '#d5ebe7', lejos: '#7d97b0', cerca: '#4f8f6a', cerca2: '#2f6b4c', franja: '#25818f', sol: '#fff7d6', nubes: 1 },
      decor: [['ahuejote', 18, 72, 0.5], ['maiz', 24, 26, 0.85], ['canoa', 46, 18, 1]],
      fijos: [],
      mecanicas: [{ tipo: 'trajinera', cerca: [1070, 930], periodo: 5.2 }],
      puntos: [[480, 260], [960, 250], [1440, 260], [1700, 420], [1650, 700], [1380, 760], [1120, 800], [1040, 1050], [820, 1200], [480, 1170], [280, 960], [250, 620], [310, 360]] },
    { id: 'teotihuacan', nombre: 'Calzada de los Muertos', emoji: '🔺', civ: 'Teotihuacana', desc: 'Entre las pirámides del Sol y de la Luna. Pisa las rampas de velocidad.',
      mitad: 58, fuera: 'tierra', lento: 0.5, agarre: 1,
      color: { fondo: '#b98b5e', fondo2: '#a87a50', camino: '#8f877e', borde1: '#b0302a', borde2: '#ece0c9', linea: '#ece0c9' },
      tema: { cielo: ['#2d6fb8', '#8ec1e6', '#f2e8d5'], bruma: '#efe2cc', lejos: '#8a8f9a', cerca: '#9a7a58', cerca2: '#7a5c40', franja: '#ad8155', sol: '#fff3c4', nubes: 1 },
      decor: [['maguey', 28, 24, 0.5], ['nopal', 22, 30, 0.8], ['plataforma', 84, 34, 1]],
      fijos: [{ img: 'serpiente', w: 26, h: 22, desde: [680, 294], hasta: [1580, 300], cada: 11, lado: 1.0 }],
      mecanicas: [{ tipo: 'turbo', cerca: [920, 290], lado: -0.35, r: 22 }, { tipo: 'turbo', cerca: [1160, 290], lado: 0.35, r: 22 }, { tipo: 'turbo', cerca: [1400, 294], lado: -0.35, r: 22 }],
      puntos: [[600, 296], [900, 290], [1250, 290], [1600, 300], [1760, 480], [1640, 680], [1300, 700], [1080, 820], [1120, 1060], [880, 1200], [520, 1160], [300, 960], [260, 600], [340, 330]] },
    { id: 'chichen', nombre: 'Sacbé de Chichén Itzá', emoji: '🐍', civ: 'Maya', desc: 'Camino blanco en la selva, salto sobre el cenote y juego de pelota.',
      mitad: 56, fuera: 'selva', lento: 0.5, agarre: 1,
      color: { fondo: '#2f6b2f', fondo2: '#285e28', camino: '#ddd2b6', borde1: '#2f6b5f', borde2: '#f4ecd8', linea: '#b6a77f' },
      tema: { cielo: ['#2a7fc0', '#86c7e8', '#e8f4ea'], bruma: '#d6ead6', lejos: '#5f8f6a', cerca: '#2f6f3a', cerca2: '#1f5129', franja: '#347a34', sol: '#fffbe0', nubes: 1 },
      decor: [['ceiba', 56, 76, 0.45], ['palma', 30, 56, 0.85], ['estela', 18, 36, 1]],
      fijos: [{ img: 'muroPelota', medio: 'muroAro', w: 40, h: 34, desde: [1440, 1150], hasta: [850, 1160], cada: 5, lado: 1.15 }],
      mecanicas: [{ tipo: 'salto', cerca: [1731, 540], lado: 0, r: 30 }, { tipo: 'cenote', cerca: [1731, 635], lado: 0, r: 42 }],
      puntos: [[620, 296], [900, 290], [1150, 310], [1500, 280], [1720, 420], [1730, 700], [1700, 950], [1500, 1140], [1150, 1160], [800, 1160], [520, 1110], [370, 920], [460, 700], [380, 500], [440, 330]] },
    { id: 'laventa', nombre: 'Selva de La Venta', emoji: '🗿', civ: 'Olmeca', desc: 'Cabezas colosales, un río y lodo que te frena en la selva.',
      mitad: 58, fuera: 'selva', lento: 0.5, agarre: 0.95,
      color: { fondo: '#245a2c', fondo2: '#1e4d25', camino: '#6e5a44', borde1: '#2f3437', borde2: '#a4ab9f', linea: '#c9b48a' },
      tema: { cielo: ['#4f7f8f', '#a9c9c4', '#e3eee6'], bruma: '#cfe0d6', lejos: '#4c6b58', cerca: '#1f4d2a', cerca2: '#143a1e', franja: '#2a6431', sol: '#f5f5dc', nubes: 1 },
      decor: [['helecho', 28, 22, 0.45], ['cacao', 36, 48, 0.85], ['altar', 48, 30, 1]],
      fijos: [{ img: 'cabezaColosal', w: 48, h: 54, desde: [500, 275], hasta: [1700, 640], cada: 34, lado: 1.9 }],
      mecanicas: [{ tipo: 'lodo', cerca: [1000, 300], lado: 0.35, r: 40 }, { tipo: 'lodo', cerca: [1600, 940], lado: -0.3, r: 42 }, { tipo: 'lodo', cerca: [800, 1150], lado: 0.3, r: 40 }],
      rio: [[150, 760], [600, 700], [1000, 900], [1450, 980], [1900, 760]],
      puntos: [[560, 268], [850, 262], [1150, 380], [1450, 260], [1720, 420], [1740, 680], [1560, 840], [1600, 1060], [1320, 1200], [950, 1100], [650, 1200], [350, 1080], [260, 760], [290, 460], [400, 300]] },
  ];

  const COPAS = [
    { id: 'fiesta', nombre: 'Copa Fiesta', emoji: '🏆', desc: 'Pradera, desierto, hielo y volcán', pistas: ['pradera', 'desierto', 'hielo', 'volcan'] },
    { id: 'mesoamericana', nombre: 'Copa Mesoamericana', emoji: '🌽', desc: 'De La Venta a Tenochtitlan', pistas: ['laventa', 'teotihuacan', 'chichen', 'tenochtitlan'] },
  ];
  const copaPorId = id => COPAS.find(c => c.id === id) || COPAS[0]; // sin id (progreso viejo) → Copa Fiesta

  // Punto a un lado de la muestra i (lado > 0 = derecha del sentido de la carrera), igual que karts.html.
  function puntoEn(M, i, lado) {
    const n = M.pts.length, p = M.pts[((i % n) + n) % n];
    return { x: p.x - Math.sin(p.a) * lado, y: p.y + Math.cos(p.a) * lado };
  }
  function muestraMasCercana(M, x, y) {
    let mejor = 0, md = Infinity;
    M.pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < md) { md = d; mejor = i; } });
    return mejor;
  }
  // Zonas de las mecánicas en el mapa: { tipo, idx, x, y, r, ... } (lado en veces la mitad del camino).
  function colocarMecanicas(pista, M) {
    return (pista.mecanicas || []).map(m => {
      const idx = muestraMasCercana(M, m.cerca[0], m.cerca[1]), lado = (m.lado || 0) * pista.mitad;
      const p = puntoEn(M, idx, lado);
      return { ...m, idx, x: p.x, y: p.y, r: m.r || 20, a: M.pts[idx].a };
    });
  }
  // Tramos de adornos fijos: posiciones a ambos lados entre `desde` y `hasta`, cada `cada` muestras.
  function colocarFijos(pista, M) {
    const out = [], n = M.pts.length;
    for (const f of pista.fijos || []) {
      const i0 = muestraMasCercana(M, f.desde[0], f.desde[1]), i1 = muestraMasCercana(M, f.hasta[0], f.hasta[1]);
      const largo = (i1 - i0 + n) % n, medio = Math.round(largo / 2 / f.cada) * f.cada; // `medio`: adorno distinto al centro
      for (let d = 0; d <= largo; d += f.cada) {
        const img = f.medio && d === medio ? f.medio : f.img;
        for (const s of [-1, 1]) { const p = puntoEn(M, i0 + d, s * (pista.mitad * f.lado + f.w * 0.3)); out.push({ x: p.x, y: p.y, img, w: f.w, h: f.h, idx: (i0 + d) % n }); }
      }
    }
    return out;
  }
  // Lado (px desde el centro del camino) de la trajinera en el tiempo t: va y viene por el canal.
  const ladoTrajinera = (z, t) => Math.sin((t % z.periodo) / z.periodo * Math.PI * 2) * (z.ancho || 140);
  // Escala y desplazamiento para dibujar el trazado en un minimapa de w×h con margen m (sin deformar, centrado).
  function encuadrarMinimapa(pts, w, h, m) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const esc = Math.min((w - 2 * m) / (x1 - x0), (h - 2 * m) / (y1 - y0));
    return { esc, ox: (w - (x1 - x0) * esc) / 2 - x0 * esc, oy: (h - (y1 - y0) * esc) / 2 - y0 * esc };
  }

  raiz.KartsPistas = { PISTAS, COPAS, copaPorId, puntoEn, colocarMecanicas, colocarFijos, ladoTrajinera, encuadrarMinimapa };
})(typeof window !== 'undefined' ? window : globalThis);
