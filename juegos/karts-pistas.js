/* Karts Turbo: definiciones de las pistas y de las copas (openspec: karts-pistas-mesoamericanas, karts-pistas-grandes).
   Script clásico sin DOM: lo cargan juegos.html y karts.html ANTES de arcade.js, y las pruebas de Deno.
   Cada pista: trazado (curva Catmull-Rom cerrada por `puntos`, `mitad` = medio ancho del camino), física (`fuera`,
   `lento` = tope fuera del camino, `agarre` 1 = asfalto, menos = resbala), colores del piso, `tema` (cielo de 360°),
   `decor` (adornos al azar: [nombre, ancho, alto, probabilidad acumulada]), `fijos` (adornos por tramo), `desc` y
   `mecanicas` (zonas deterministas sobre el camino). `sala: true` = se usa también en las partidas en sala (las 8
   desde juegos-en-vivo, igual que MAPAS_SALA de server/carreras.ts).
   karts-pistas-grandes: vueltas ≈ 3 veces más largas (escala ≈ 2.3× más tramos nuevos hacia el interior; radio mínimo ≥
   el de antes), `vueltas` por pista (2) y mecánicas escaladas. Los récords se guardan con VERSION_PISTAS (progreso
   `pistasV`); el servidor importa este archivo para validar los tiempos de las salas (server/carreras.ts). */
(function (raiz) {
  'use strict';

  const PISTAS = [
    { id: 'pradera', nombre: 'Circuito Pradera', emoji: '🌳', sala: true, desc: 'Lomas verdes, flores y globos: la pista para empezar.',
      mitad: 58, fuera: 'pasto', lento: 0.55, agarre: 1,
      color: { fondo: '#4caf50', fondo2: '#43a047', camino: '#5b5f66', borde1: '#e53935', borde2: '#ffffff', linea: '#f5f5f5' },
      tema: { cielo: ['#2f7fe0', '#86c5f5', '#dff1fd'], bruma: '#d6ecfb', lejos: '#7fa9c9', cerca: '#3f9a4a', cerca2: '#2c7a36', franja: '#3fa046', sol: '#fffbe0', nubes: 1 },
      decor: [['arbol', 46, 62, 0.55], ['arbusto', 26, 17, 0.85], ['globo', 20, 52, 1]],
      vueltas: 2, puntos: [[1070, 382], [1638, 321], [2795, 370], [3541, 743], [3611, 1536], [3075, 1932], [2632, 1581], [2314, 1127], [1784, 936], [1318, 1254], [1529, 1648], [1784, 2049], [1254, 2452], [733, 2355], [298, 1986], [312, 1239], [796, 1182], [957, 872], [588, 588], [664, 336]] },
    { id: 'desierto', nombre: 'Cañón del Desierto', emoji: '🌵', sala: true, desc: 'Arena que frena, cactus y mesetas al atardecer.',
      mitad: 54, fuera: 'arena', lento: 0.45, agarre: 0.95,
      color: { fondo: '#e9c27a', fondo2: '#ddb067', camino: '#8a6a4a', borde1: '#b5462e', borde2: '#f3e3c3', linea: '#f3e3c3' },
      tema: { cielo: ['#e8662a', '#f7ae6b', '#ffe9c7'], bruma: '#f8dcb4', lejos: '#c88b5c', cerca: '#a5532e', cerca2: '#7e3c1f', franja: '#d8aa62', sol: '#fff6c2', nubes: 0 },
      decor: [['cactus', 22, 46, 0.5], ['rocaDesierto', 40, 24, 0.85], ['mesa', 70, 44, 1]],
      vueltas: 2, puntos: [[1046, 393], [1527, 321], [2515, 463], [3402, 317], [3821, 930], [3635, 1653], [3056, 1519], [2632, 1042], [2093, 855], [1784, 1360], [2208, 1731], [2236, 2306], [1387, 2594], [645, 2566], [330, 2004], [807, 1699], [902, 1298], [376, 1063], [503, 534]] },
    { id: 'hielo', nombre: 'Lago Helado', emoji: '❄️', sala: true, desc: 'El hielo resbala: frena antes de cada curva.',
      mitad: 60, fuera: 'nieve', lento: 0.5, agarre: 0.55,
      color: { fondo: '#eef6fb', fondo2: '#e1eef7', camino: '#9cc9e8', borde1: '#3d7dbf', borde2: '#ffffff', linea: '#ffffff' },
      tema: { cielo: ['#3f9fdc', '#a6daf6', '#effaff'], bruma: '#e6f4fc', lejos: '#9dbcd8', cerca: '#f4f9fd', cerca2: '#a9c9e2', franja: '#dce9f3', sol: '#ffffff', nubes: 1 },
      decor: [['pino', 38, 66, 0.6], ['muneco', 18, 30, 0.75], ['bloque', 26, 22, 1]],
      vueltas: 2, puntos: [[953, 566], [1383, 324], [2357, 638], [3307, 228], [4075, 899], [3881, 1939], [2938, 2477], [2500, 1840], [2610, 1290], [2060, 1015], [1565, 1400], [1730, 1950], [1292, 2454], [497, 2215], [309, 1585], [652, 1268], [566, 808]] },
    { id: 'volcan', nombre: 'Volcán Rugiente', emoji: '🌋', sala: true, desc: 'Charcos de lava a las orillas: no te salgas.',
      mitad: 54, fuera: 'roca', lento: 0.5, agarre: 0.95, lava: true,
      color: { fondo: '#3b2a2a', fondo2: '#33231f', camino: '#2b2b30', borde1: '#ff6d00', borde2: '#ffd180', linea: '#ffab40' },
      tema: { cielo: ['#12060d', '#4a1416', '#a9381c'], bruma: '#6b2416', lejos: '#3b1c24', cerca: '#1f1218', cerca2: '#120a0e', franja: '#2c1f1e', sol: null, nubes: 0 },
      decor: [['rocaVolcan', 40, 28, 0.5], ['obsidiana', 26, 40, 0.8], ['fumarola', 24, 30, 1]],
      vueltas: 2, puntos: [[989, 407], [1497, 333], [2313, 704], [3178, 416], [3912, 918], [3820, 1770], [3035, 2079], [2652, 1596], [2082, 1326], [1335, 1579], [1695, 2103], [1857, 2453], [1389, 2665], [846, 2747], [228, 2207], [400, 1297], [901, 1217], [1025, 848], [502, 676], [560, 441]] },

    // ---------- Pistas mesoamericanas (carrera rápida, Copa Mesoamericana y, desde juegos-en-vivo, salas) ----------
    { id: 'tenochtitlan', nombre: 'Calzadas de Tenochtitlan', emoji: '🛶', sala: true, civ: 'Mexica', desc: 'Calzadas sobre el lago y chinampas. ¡Cuidado con la trajinera!',
      mitad: 56, fuera: 'agua', lento: 0.42, agarre: 1,
      color: { fondo: '#2b8a96', fondo2: '#23798a', camino: '#c39a5f', borde1: '#a4502a', borde2: '#f1e3c4', linea: '#f6ead0' },
      tema: { cielo: ['#3a86c8', '#9fd0ea', '#eaf6f4'], bruma: '#d5ebe7', lejos: '#7d97b0', cerca: '#4f8f6a', cerca2: '#2f6b4c', franja: '#25818f', sol: '#fff7d6', nubes: 1 },
      decor: [['ahuejote', 18, 72, 0.5], ['maiz', 24, 26, 0.85], ['canoa', 46, 18, 1]],
      fijos: [],
      // karts-pistas-grandes: 3 canales con trajinera (periodos distintos para que no crucen a la vez)
      mecanicas: [{ tipo: 'trajinera', cerca: [2740, 1500], periodo: 5.2 }, { tipo: 'trajinera', cerca: [1570, 1883], periodo: 4.6 }, { tipo: 'trajinera', cerca: [1082, 2557], periodo: 5.8 }],
      vueltas: 2, puntos: [[826, 323], [1936, 300], [3023, 323], [3648, 689], [3512, 1351], [2885, 1467], [2291, 1558], [1964, 1132], [1340, 1028], [998, 1474], [1370, 1800], [2036, 2100], [1655, 2555], [745, 2468], [387, 1966], [695, 1527], [279, 1105], [440, 543]] },
    { id: 'teotihuacan', nombre: 'Calzada de los Muertos', emoji: '🔺', sala: true, civ: 'Teotihuacana', desc: 'Entre las pirámides del Sol y de la Luna. Pisa las rampas de velocidad.',
      mitad: 58, fuera: 'tierra', lento: 0.5, agarre: 1,
      color: { fondo: '#b98b5e', fondo2: '#a87a50', camino: '#8f877e', borde1: '#b0302a', borde2: '#ece0c9', linea: '#ece0c9' },
      tema: { cielo: ['#2d6fb8', '#8ec1e6', '#f2e8d5'], bruma: '#efe2cc', lejos: '#8a8f9a', cerca: '#9a7a58', cerca2: '#7a5c40', franja: '#ad8155', sol: '#fff3c4', nubes: 1 },
      decor: [['maguey', 28, 24, 0.5], ['nopal', 22, 30, 0.8], ['plataforma', 84, 34, 1]],
      fijos: [{ img: 'serpiente', w: 26, h: 22, desde: [1240, 305], hasta: [3378, 303], cada: 18, lado: 1.0 }],
      // karts-pistas-grandes: 4 rampas en la Calzada de los Muertos, 3 en la recta baja y 2 en la del costado
      mecanicas: [{ tipo: 'turbo', cerca: [1983, 306], lado: -0.35, r: 22 }, { tipo: 'turbo', cerca: [2363, 301], lado: 0.35, r: 22 }, { tipo: 'turbo', cerca: [2743, 297], lado: -0.35, r: 22 }, { tipo: 'turbo', cerca: [3123, 284], lado: 0.35, r: 22 },
        { tipo: 'turbo', cerca: [1764, 2105], lado: 0.35, r: 22 }, { tipo: 'turbo', cerca: [1719, 1853], lado: -0.35, r: 22 }, { tipo: 'turbo', cerca: [1664, 1604], lado: 0.35, r: 22 },
        { tipo: 'turbo', cerca: [305, 1475], lado: -0.35, r: 22 }, { tipo: 'turbo', cerca: [294, 1095], lado: 0.35, r: 22 }],
      vueltas: 2, puntos: [[1100, 314], [1798, 309], [2642, 300], [3454, 324], [3831, 747], [3579, 1260], [2748, 1265], [2188, 1476], [2405, 2224], [1852, 2472], [1733, 1905], [1477, 1156], [849, 1212], [1130, 1926], [869, 2407], [394, 1877], [300, 1030], [551, 475]] },
    { id: 'chichen', nombre: 'Sacbé de Chichén Itzá', emoji: '🐍', sala: true, civ: 'Maya', desc: 'Camino blanco en la selva, salto sobre el cenote y juego de pelota.',
      mitad: 56, fuera: 'selva', lento: 0.5, agarre: 1,
      color: { fondo: '#2f6b2f', fondo2: '#285e28', camino: '#ddd2b6', borde1: '#2f6b5f', borde2: '#f4ecd8', linea: '#b6a77f' },
      tema: { cielo: ['#2a7fc0', '#86c7e8', '#e8f4ea'], bruma: '#d6ead6', lejos: '#5f8f6a', cerca: '#2f6f3a', cerca2: '#1f5129', franja: '#347a34', sol: '#fffbe0', nubes: 1 },
      decor: [['ceiba', 56, 76, 0.45], ['palma', 30, 56, 0.85], ['estela', 18, 36, 1]],
      fijos: [{ img: 'muroPelota', medio: 'muroAro', w: 40, h: 34, desde: [2163, 2431], hasta: [1250, 2421], cada: 5, lado: 1.15 }],
      // karts-pistas-grandes: dos rampas con su cenote (la recta del costado y la recta baja, antes del juego de pelota)
      mecanicas: [{ tipo: 'salto', cerca: [3609, 1067], lado: 0, r: 30 }, { tipo: 'cenote', cerca: [3606, 1163], lado: 0, r: 42 },
        { tipo: 'salto', cerca: [2651, 2434], lado: 0, r: 30 }, { tipo: 'cenote', cerca: [2555, 2433], lado: 0, r: 42 }],
      vueltas: 2, puntos: [[905, 339], [1583, 324], [2197, 352], [2293, 905], [2081, 1446], [2610, 1730], [2995, 1235], [3028, 652], [3358, 388], [3600, 652], [3591, 1316], [3519, 1921], [3035, 2381], [2188, 2430], [1341, 2430], [663, 2309], [300, 1849], [518, 1316], [324, 832], [469, 421]] },
    { id: 'laventa', nombre: 'Selva de La Venta', emoji: '🗿', sala: true, civ: 'Olmeca', desc: 'Cabezas colosales, un río y lodo que te frena en la selva.',
      mitad: 58, fuera: 'selva', lento: 0.5, agarre: 0.95,
      color: { fondo: '#245a2c', fondo2: '#1e4d25', camino: '#6e5a44', borde1: '#2f3437', borde2: '#a4ab9f', linea: '#c9b48a' },
      tema: { cielo: ['#4f7f8f', '#a9c9c4', '#e3eee6'], bruma: '#cfe0d6', lejos: '#4c6b58', cerca: '#1f4d2a', cerca2: '#143a1e', franja: '#2a6431', sol: '#f5f5dc', nubes: 1 },
      decor: [['helecho', 28, 22, 0.45], ['cacao', 36, 48, 0.85], ['altar', 48, 30, 1]],
      fijos: [{ img: 'cabezaColosal', w: 48, h: 54, desde: [1100, 300], hasta: [3804, 539], cada: 34, lado: 1.9 }, { img: 'cabezaColosal', w: 48, h: 54, desde: [2790, 2577], hasta: [1157, 1462], cada: 34, lado: 1.9 }],
      // karts-pistas-grandes: 7 zonas de lodo repartidas en la vuelta
      mecanicas: [{ tipo: 'lodo', cerca: [2211, 564], lado: 0.35, r: 40 }, { tipo: 'lodo', cerca: [3804, 539], lado: -0.3, r: 42 }, { tipo: 'lodo', cerca: [3788, 1473], lado: 0.3, r: 40 },
        { tipo: 'lodo', cerca: [3043, 2542], lado: -0.3, r: 42 }, { tipo: 'lodo', cerca: [2047, 1669], lado: 0.3, r: 40 }, { tipo: 'lodo', cerca: [1186, 1724], lado: -0.3, r: 42 },
        { tipo: 'lodo', cerca: [333, 1739], lado: 0.3, r: 40 }],
      rio: [[100, 1650], [800, 1500], [1500, 1650], [2300, 1350], [3100, 1150], [4100, 1250]],
      vueltas: 2, puntos: [[1026, 320], [1728, 232], [2454, 662], [3180, 228], [3905, 657], [3912, 1346], [3446, 1704], [3543, 2236], [2865, 2575], [1970, 2346], [2060, 1730], [1730, 1070], [1180, 1180], [1180, 1840], [960, 2423], [518, 2284], [300, 1510], [373, 784], [639, 397]] },
  ];

  const VERSION_PISTAS = 2; // karts-pistas-grandes: sube cuando los trazados cambian tanto que los récords no se comparan

  const COPAS = [
    { id: 'fiesta', nombre: 'Copa Fiesta', emoji: '🏆', desc: 'Pradera, desierto, hielo y volcán', pistas: ['pradera', 'desierto', 'hielo', 'volcan'] },
    { id: 'mesoamerica', nombre: 'Copa Mesoamericana', emoji: '🌽', desc: 'De La Venta a Tenochtitlan', pistas: ['laventa', 'teotihuacan', 'chichen', 'tenochtitlan'] },
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

  raiz.KartsPistas = { PISTAS, COPAS, VERSION_PISTAS, copaPorId, puntoEn, colocarMecanicas, colocarFijos, ladoTrajinera, encuadrarMinimapa };
})(typeof window !== 'undefined' ? window : globalThis);
