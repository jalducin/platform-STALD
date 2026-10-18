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

    // ---------- karts-copa-reinos: Copa Reinos Antiguos (difícil), con tramos DENTRO de cada monumento ----------
    // `interiores`: tramos entre las muestras más cercanas a `desde` y `hasta`; `ancho` = medio ancho entre muros en veces
    // `mitad`; `muro` 0 = dos muros, 1 / -1 = solo el muro de ese lado (cámara abierta). `int` = colores del interior
    // (piso, juntas, muro, cielo de la bóveda y acento). `columnas` = columnas fijas en el camino (slalom), alternadas.
    // `adornos` = adornos sueltos en un punto. `bots` = multiplica la habilidad de los bots del modo individual.
    { id: 'giza', nombre: 'Gran Pirámide de Giza', emoji: '🔺', sala: true, trazado: 3, civ: 'Egipcia', desc: 'Arena del desierto y, adentro, la Gran Galería con bloques que caen.',
      mitad: 50, fuera: 'arena', lento: 0.45, agarre: 0.95, ritmoBots: 1.03,
      color: { fondo: '#e2c48a', fondo2: '#d4b277', camino: '#b39466', borde1: '#8a5a2b', borde2: '#f1e2c0', linea: '#f6ecd2' },
      tema: { cielo: ['#3b7fc4', '#9cc8e8', '#f4e4c4'], bruma: '#f0dcb8', lejos: '#c9a877', cerca: '#b88f5a', cerca2: '#9a7445', franja: '#d8b97f', sol: '#fff3c8', nubes: 0 },
      int: { piso: '#3b2d20', junta: '#20170e', muro: '#9a774c', cielo: ['#0c0805', '#24180f', '#3d2a18'], acento: '#c9a24f' },
      decor: [['palmaDatil', 30, 58, 0.45], ['rocaDesierto', 40, 24, 0.85], ['piramideChica', 96, 62, 1]],
      adornos: [{ img: 'esfingeGrande', x: 1350, y: 620, w: 120, h: 66 }],
      interiores: [{ nombre: 'Gran Galería', desde: [3150, 915], hasta: [800, 1050], ancho: 0.82, muro: 0 }, { nombre: 'Cámara del rey', desde: [800, 1050], hasta: [3150, 1590], ancho: 0.95, muro: 0 }],
      mecanicas: [{ tipo: 'arena', cerca: [1950, 322], lado: 0.4, r: 40 }, { tipo: 'arena', cerca: [2450, 340], lado: -0.4, r: 40 },
        { tipo: 'bloques', cerca: [2400, 935], lado: -0.4, r: 24, periodo: 3.8, desfase: 0 }, { tipo: 'bloques', cerca: [1950, 922], lado: 0.4, r: 24, periodo: 4.2, desfase: 1.3 },
        { tipo: 'bloques', cerca: [1500, 945], lado: -0.4, r: 24, periodo: 3.6, desfase: 2.1 }, { tipo: 'bloques', cerca: [2300, 1555], lado: 0, r: 24, periodo: 4.4, desfase: 0.7 },
        { tipo: 'arena', cerca: [2200, 2050], lado: 0.35, r: 40 }, { tipo: 'arena', cerca: [1500, 2100], lado: -0.35, r: 40 }, { tipo: 'arena', cerca: [350, 1300], lado: 0.3, r: 40 }],
      vueltas: 2, puntos: [[900, 330], [1700, 320], [2450, 340], [3000, 380], [3350, 600], [3200, 900], [2600, 950], [2000, 920], [1300, 950], [800, 1050], [750, 1380], [1250, 1500], [1800, 1400], [2300, 1560], [2750, 1450], [3200, 1600], [3250, 1900], [2800, 2080], [2200, 2050], [1500, 2100], [900, 2080], [450, 1850], [350, 1300], [380, 750], [550, 420]] },
    { id: 'castillo', nombre: 'Interior de El Castillo', emoji: '🐍', sala: true, trazado: 3, civ: 'Maya', desc: 'La serpiente de luz, escaleras ocultas y el trono del jaguar rojo.',
      mitad: 50, fuera: 'pasto', lento: 0.5, agarre: 1, ritmoBots: 1.03,
      color: { fondo: '#3f7a3a', fondo2: '#356b31', camino: '#cfc4a6', borde1: '#8e2f22', borde2: '#efe6cf', linea: '#b8a986' },
      tema: { cielo: ['#e9803a', '#f6bf78', '#fbe7c2'], bruma: '#f6dcb4', lejos: '#6f8f6a', cerca: '#3c6f3a', cerca2: '#2b5429', franja: '#3a7536', sol: '#fff1c0', nubes: 1 },
      int: { piso: '#36362f', junta: '#1c1c18', muro: '#a39b82', cielo: ['#07090a', '#1a1d1a', '#2e3129'], acento: '#9e2b1f' },
      decor: [['palma', 30, 56, 0.45], ['columnaMaya', 18, 48, 0.8], ['chacmool', 34, 22, 1]],
      fijos: [{ img: 'kukulkan', w: 30, h: 24, desde: [1000, 2552], hasta: [2500, 2520], cada: 30, lado: 1.3 }],
      adornos: [{ img: 'tronoJaguar', x: 1660, y: 1000, w: 64, h: 50 }],
      interiores: [{ nombre: 'Escaleras interiores', desde: [3400, 2120], hasta: [2530, 900], ancho: 0.8, muro: 0 }, { nombre: 'Templo del jaguar', desde: [2530, 900], hasta: [1950, 1480], ancho: 1, muro: 1 }],
      mecanicas: [{ tipo: 'luz', cerca: [1700, 2560], lado: -0.35, r: 22 }, { tipo: 'luz', cerca: [2080, 2546], lado: 0.35, r: 22 }, { tipo: 'luz', cerca: [2450, 2523], lado: -0.35, r: 22 },
        { tipo: 'losa', cerca: [3475, 1250], r: 20, periodo: 4.0 }, { tipo: 'losa', cerca: [2985, 1200], r: 20, periodo: 4.6 }, { tipo: 'losa', cerca: [2550, 1500], r: 20, periodo: 5.2 }],
      vueltas: 2, puntos: [[800, 2550], [1700, 2560], [2500, 2520], [3150, 2420], [3450, 2000], [3480, 1450], [3460, 950], [3400, 680], [3230, 570], [3060, 680], [3000, 950], [2980, 1400], [3000, 1850], [2980, 2060], [2780, 2180], [2580, 2060], [2550, 1850], [2550, 1300], [2530, 900], [2300, 520], [1750, 450], [1250, 600], [1150, 1100], [1450, 1500], [1950, 1480], [2150, 1800], [1850, 2100], [1100, 2080], [550, 1950], [380, 2250], [520, 2500]] },
    { id: 'karnak', nombre: 'Templo de Karnak', emoji: '🏛️', sala: true, trazado: 3, civ: 'Egipcia', desc: 'Avenida de esfinges y slalom entre las columnas gigantes.',
      mitad: 52, fuera: 'arena', lento: 0.45, agarre: 0.95, ritmoBots: 1.03,
      color: { fondo: '#d9b77a', fondo2: '#cba869', camino: '#c4a878', borde1: '#2f5f8a', borde2: '#efe2c2', linea: '#f3e6c9' },
      tema: { cielo: ['#2f78c0', '#8fc3e6', '#f6e6c6'], bruma: '#f1dfbd', lejos: '#c4a67a', cerca: '#a98656', cerca2: '#8a6a40', franja: '#cfae74', sol: '#fff4cc', nubes: 0 },
      int: { piso: '#3d3022', junta: '#1f170f', muro: '#b39066', cielo: ['#0a0806', '#1f1710', '#35271a'], acento: '#2f5f8a' },
      decor: [['palmaDatil', 30, 58, 0.45], ['obelisco', 16, 80, 0.75], ['estatuaFaraon', 40, 72, 1]],
      fijos: [{ img: 'esfinge', w: 34, h: 26, desde: [400, 1100], hasta: [430, 2300], cada: 14, lado: 1.3 }],
      lago: { x: 1700, y: 1060, rx: 300, ry: 330 },
      interiores: [{ nombre: 'Sala hipóstila', desde: [1250, 2715], hasta: [2750, 2690], ancho: 1, muro: 0 }, { nombre: 'Santuario', desde: [3200, 2580], hasta: [3330, 780], ancho: 0.84, muro: 0 }],
      columnas: [{ desde: [1420, 2718], hasta: [2620, 2698], cada: 15, lado: 0.45 }],
      mecanicas: [{ tipo: 'losa', cerca: [3420, 1900], r: 20, periodo: 4.2 }, { tipo: 'losa', cerca: [3420, 1380], r: 20, periodo: 4.8 }],
      vueltas: 2, puntos: [[400, 1000], [400, 1700], [430, 2300], [700, 2650], [1300, 2720], [2000, 2700], [2600, 2700], [3150, 2600], [3480, 2200], [3350, 1650], [3500, 1100], [3200, 520], [2700, 400], [2350, 600], [2150, 1300], [1700, 1850], [1250, 1350], [1150, 700], [900, 420], [550, 500]] },
    { id: 'angkor', nombre: 'Galerías de Angkor Wat', emoji: '🛕', sala: true, trazado: 3, civ: 'Jemer', desc: 'Calzada sobre el foso, galerías con roca rodante y selva.',
      mitad: 50, fuera: 'selva', lento: 0.5, agarre: 1, ritmoBots: 1.03,
      color: { fondo: '#2f6a2f', fondo2: '#275b27', camino: '#8d8a7c', borde1: '#5b6b3a', borde2: '#c9c4b0', linea: '#c9c4b0' },
      tema: { cielo: ['#3a7fb5', '#9fcbe0', '#e9f1e6'], bruma: '#d8e6dc', lejos: '#5f7f6a', cerca: '#2e5f34', cerca2: '#1e4824', franja: '#2f6d33', sol: '#fff8dc', nubes: 1 },
      int: { piso: '#34342e', junta: '#1a1a16', muro: '#7f7b6a', cielo: ['#08090a', '#1b1d1b', '#2f322b'], acento: '#6b7a4a' },
      decor: [['arbolRaices', 50, 70, 0.45], ['helecho', 28, 22, 0.8], ['torreAngkor', 64, 96, 1]],
      fijos: [{ img: 'naga', w: 26, h: 20, desde: [1900, 2330], hasta: [1900, 1960], cada: 12, lado: 1.25 }, { img: 'pilar', w: 14, h: 46, desde: [1500, 1705], hasta: [2900, 1720], cada: 9, lado: 1.0, solo: 1 }],
      adornos: [{ img: 'torreAngkor', x: 1900, y: 1060, w: 110, h: 170 }, { img: 'torreAngkor', x: 1350, y: 800, w: 70, h: 110 }, { img: 'torreAngkor', x: 2450, y: 800, w: 70, h: 110 }, { img: 'torreAngkor', x: 1350, y: 1330, w: 70, h: 110 }, { img: 'torreAngkor', x: 2450, y: 1330, w: 70, h: 110 }],
      foso: true,
      interiores: [{ nombre: 'Galería de los bajorrelieves', desde: [1600, 1705], hasta: [2850, 1720], ancho: 0.9, muro: -1, techo: false }],
      mecanicas: [{ tipo: 'bloques', cerca: [410, 1200], lado: 0.3, r: 24, periodo: 3.8, desfase: 0.4 }, { tipo: 'roca', cerca: [1700, 422], r: 20, periodo: 3.4, amplitud: 0.5 },
        { tipo: 'roca', cerca: [2600, 425], r: 20, periodo: 3.9, amplitud: 0.5 }, { tipo: 'bloques', cerca: [3450, 1000], lado: -0.3, r: 24, periodo: 4.1, desfase: 1.6 },
        { tipo: 'lodo', cerca: [3400, 2300], lado: 0.3, r: 40 }, { tipo: 'lodo', cerca: [2600, 2620], lado: -0.3, r: 40 }],
      vueltas: 2, puntos: [[1900, 2350], [1900, 1950], [1700, 1700], [1100, 1720], [600, 1700], [420, 1450], [400, 900], [600, 450], [1300, 420], [2200, 430], [3000, 420], [3400, 650], [3450, 1300], [3250, 1700], [2750, 1720], [2450, 2050], [2850, 2300], [3400, 2300], [3500, 2650], [3050, 2780], [2600, 2620], [2200, 2780], [1930, 2650]] },
    // ---------- karts-copa-espacio: pistas espaciales (Copa del Espacio, carrera rápida y salas) ----------
    // `espacio: true` = fuera del camino hay vacío: con barandal (postes de neón) se raspa; en los tramos `abierto` se
    // cae y el dron de rescate te regresa. `ritmoBots` multiplica la habilidad de los bots (y divide el tiempo de los
    // fantasmas de sala). Mecánicas por fracción de la vuelta: `f` (punto) o `tramo: [f0, f1]`.
    { id: 'orbital', nombre: 'Estación Orbital Quetzal', emoji: '🛰️', sala: true, trazado: 3, espacio: true, ritmoBots: 1.04, desc: 'Pasillos y hangares. Las compuertas abren y cierran: pasa por el centro.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 1,
      color: { fondo: '#03050c', fondo2: '#0b1a3a', camino: '#3b4763', borde1: '#22d3ee', borde2: '#fbbf24', linea: '#a5f3fc' },
      tema: { cielo: ['#01030a', '#081634', '#1a3566'], bruma: '#13284f', lejos: '#1d3a6b', cerca: '#0e1d3a', cerca2: '#091327', franja: '#0b1a3a', sol: null, nubes: 0, espacio: 'orbital' },
      decor: [['espPanel', 50, 28, 0.45], ['espAntena', 18, 56, 0.8], ['espModulo', 96, 60, 1]],
      // karts-curvas-complejas: escalón de pasillos (0.11–0.27), greca del laberinto (0.39–0.74) y horquilla (0.86–0.90).
      mecanicas: [{ tipo: 'compuerta', f: 0.147, periodo: 3.2 }, { tipo: 'compuerta', f: 0.242, periodo: 3.6 }, { tipo: 'abierto', tramo: [0.29, 0.345] },
        { tipo: 'turbo', f: 0.358, lado: -0.35, r: 22 }, { tipo: 'turbo', f: 0.372, lado: 0.35, r: 22 }, { tipo: 'antiturbo', f: 0.43, lado: 0.4, r: 26 },
        { tipo: 'gravedad', tramo: [0.51, 0.61] }, { tipo: 'antiturbo', f: 0.649, lado: -0.4, r: 26 }, { tipo: 'compuerta', f: 0.696, periodo: 4 },
        { tipo: 'turbo', f: 0.79, lado: 0, r: 22 }, { tipo: 'abierto', tramo: [0.85, 0.91] }],
      vueltas: 2, puntos: [[1242,272], [1392,272], [1542,272], [1692,272], [1842,272], [1993,266], [2129,202], [2278,200], [2413,265], [2564,272], [2714,272], [2859,301], [2920,434], [2920,586], [2920,736], [2927,887], [3032,987], [3184,992], [3334,992], [3486,996], [3592,1095], [3600,1246], [3600,1396], [3600,1546], [3657,1680], [3802,1712], [3952,1712], [4103,1721], [4197,1832], [4200,1982], [4153,2121], [4012,2162], [3860,2162], [3708,2162], [3556,2162], [3404,2162], [3258,2136], [3192,2006], [3192,1856], [3192,1706], [3192,1556], [3185,1405], [3078,1306], [2926,1302], [2776,1302], [2636,1346], [2592,1486], [2592,1636], [2592,1786], [2557,1929], [2420,1982], [2270,1982], [2118,1980], [2004,1890], [1992,1740], [1992,1590], [1992,1438], [1910,1318], [1760,1302], [1610,1302], [1463,1325], [1392,1452], [1392,1602], [1392,1752], [1392,1902], [1387,2053], [1284,2156], [1132,2162], [980,2162], [839,2121], [792,1982], [792,1832], [792,1682], [792,1532], [792,1382], [744,1243], [606,1192], [456,1192], [305,1188], [188,1098], [180,951], [287,851], [438,842], [588,842], [731,803], [792,670], [792,520], [802,369], [913,275], [1064,272]] },
    { id: 'anillos', nombre: 'Anillos de Saturno', emoji: '🪐', sala: true, trazado: 3, espacio: true, ritmoBots: 1.05, desc: 'Hielo de los anillos que resbala y rocas que cruzan el camino.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 0.7,
      color: { fondo: '#04060e', fondo2: '#1c2440', camino: '#5b7594', borde1: '#7dd3fc', borde2: '#fbbf24', linea: '#e0f2fe' },
      tema: { cielo: ['#02030a', '#141a33', '#3a2f3f'], bruma: '#2a2438', lejos: '#3a3350', cerca: '#1a1830', cerca2: '#100f22', franja: '#1c2440', sol: '#fff7e0', nubes: 0, espacio: 'anillos' },
      decor: [['espHielo', 30, 26, 0.5], ['espRoca', 34, 26, 0.85], ['espLunita', 80, 80, 1]],
      // karts-curvas-complejas: espiral doble de los anillos (0.04–0.57), horquilla (0.58–0.63), curva que se cierra (0.70–0.74),
      // chicana (0.75–0.80) y serpentina con 2 horquillas (0.80–0.96).
      mecanicas: [{ tipo: 'turbo', f: 0.07, lado: -0.3, r: 22 }, { tipo: 'asteroide', f: 0.09, periodo: 4.4, ancho: 120 }, { tipo: 'abierto', tramo: [0.1, 0.2] },
        { tipo: 'turbo', f: 0.385, lado: 0, r: 22 }, { tipo: 'abierto', tramo: [0.4, 0.5] }, { tipo: 'asteroide', f: 0.52, periodo: 5, ancho: 120 },
        { tipo: 'brecha', f: 0.635 }, { tipo: 'asteroide', f: 0.745, periodo: 4.7, ancho: 120 }, { tipo: 'abierto', tramo: [0.84, 0.88] }],
      vueltas: 2, puntos: [[1443,200], [1293,200], [1143,200], [993,200], [842,206], [696,240], [558,300], [435,387], [332,496], [252,624], [201,765], [180,915], [192,1065], [236,1209], [311,1340], [414,1450], [540,1534], [682,1585], [832,1600], [982,1576], [1120,1515], [1237,1420], [1324,1296], [1372,1153], [1370,1005], [1274,893], [1126,884], [1017,984], [987,1132], [884,1238], [737,1239], [633,1134], [626,985], [670,842], [754,716], [869,618], [1006,554], [1155,528], [1306,540], [1449,588], [1576,669], [1681,778], [1759,907], [1805,1050], [1820,1200], [1801,1350], [1752,1492], [1675,1622], [1573,1732], [1451,1821], [1315,1884], [1169,1919], [1018,1927], [869,1947], [769,2056], [771,2204], [875,2310], [1024,2327], [1174,2327], [1325,2335], [1458,2405], [1596,2464], [1747,2467], [1898,2465], [2044,2431], [2172,2351], [2254,2226], [2263,2076], [2263,1924], [2233,1778], [2170,1643], [2214,1502], [2263,1362], [2268,1211], [2360,1097], [2509,1080], [2659,1080], [2799,1034], [2853,898], [2780,771], [2635,740], [2485,740], [2339,712], [2264,586], [2263,434], [2221,291], [2098,207], [1947,200], [1797,200], [1647,200]] },
    { id: 'cinturon', nombre: 'Cinturón de Asteroides', emoji: '☄️', sala: true, trazado: 3, espacio: true, ritmoBots: 1.06, desc: 'Asteroides en órbita, huecos con rampa y plataformas que se mueven.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 0.95,
      color: { fondo: '#05040a', fondo2: '#2a1a14', camino: '#4c4a5a', borde1: '#fb923c', borde2: '#fde047', linea: '#fed7aa' },
      tema: { cielo: ['#020106', '#160c18', '#3b1d1a'], bruma: '#2b1716', lejos: '#3a2420', cerca: '#1c1214', cerca2: '#120b0d', franja: '#2a1a14', sol: '#fff1c2', nubes: 0, espacio: 'cinturon' },
      decor: [['espRoca', 36, 28, 0.55], ['espRocaGrande', 74, 56, 0.85], ['espSatelite', 46, 36, 1]],
      // karts-curvas-complejas: sacacorchos de 277° alrededor del asteroide (0.08–0.25), curva que se cierra (0.29–0.33),
      // laberinto en escalera (0.34–0.50), recta de los huecos (0.56–0.66), chicana (0.66–0.71) y horquilla (0.86–0.91).
      mecanicas: [{ tipo: 'abierto', tramo: [0.12, 0.24] }, { tipo: 'asteroide', f: 0.18, periodo: 4.8, ancho: 120 }, { tipo: 'antiturbo', f: 0.287, lado: 0.4, r: 26 },
        { tipo: 'asteroide', f: 0.45, periodo: 5.4, ancho: 120 }, { tipo: 'turbo', f: 0.572, lado: 0, r: 22 }, { tipo: 'abierto', tramo: [0.585, 0.655] },
        { tipo: 'brecha', f: 0.6 }, { tipo: 'plataforma', f: 0.635, periodo: 5.5, amp: 0.65, ancho: 0.5 }, { tipo: 'antiturbo', f: 0.685, lado: -0.4, r: 26 },
        { tipo: 'turbo', f: 0.752, lado: 0, r: 22 }, { tipo: 'abierto', tramo: [0.765, 0.805] }, { tipo: 'brecha', f: 0.775 }],
      vueltas: 2, puntos: [[1292,446], [1442,446], [1592,446], [1742,446], [1892,446], [2043,441], [2184,386], [2333,396], [2474,445], [2611,393], [2714,283], [2850,216], [3000,200], [3146,239], [3269,327], [3353,452], [3387,600], [3366,749], [3294,882], [3180,981], [3038,1033], [2886,1031], [2746,976], [2634,874], [2512,793], [2360,791], [2210,791], [2061,809], [1926,874], [1829,988], [1807,1135], [1819,1285], [1933,1375], [2085,1377], [2236,1388], [2325,1503], [2327,1655], [2339,1805], [2453,1895], [2605,1897], [2756,1908], [2845,2023], [2847,2175], [2859,2325], [2973,2415], [3125,2417], [3276,2428], [3365,2543], [3365,2694], [3292,2823], [3151,2867], [2999,2867], [2847,2867], [2695,2867], [2543,2867], [2392,2867], [2240,2867], [2088,2867], [1936,2867], [1784,2867], [1633,2876], [1498,2941], [1349,2933], [1213,2870], [1062,2867], [911,2857], [797,2764], [772,2617], [772,2465], [772,2313], [772,2161], [772,2009], [772,1858], [772,1706], [772,1554], [704,1425], [558,1396], [408,1396], [262,1367], [180,1244], [214,1100], [342,1027], [494,1026], [646,1022], [759,930], [772,780], [775,628], [849,499], [988,446], [1140,446]] },
    { id: 'nebulosa', nombre: 'Nebulosa Esmeralda', emoji: '🌌', sala: true, trazado: 3, espacio: true, ritmoBots: 1.08, desc: 'Portales, gravedad baja y plataformas: la pista más difícil.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 0.9,
      color: { fondo: '#03070a', fondo2: '#0c2a24', camino: '#334658', borde1: '#34d399', borde2: '#f472b6', linea: '#bbf7d0' },
      tema: { cielo: ['#020509', '#0b2230', '#174a3c'], bruma: '#123a33', lejos: '#1b4a40', cerca: '#0c241f', cerca2: '#071713', franja: '#0c2a24', sol: null, nubes: 0, espacio: 'nebulosa' },
      decor: [['espCristal', 22, 40, 0.5], ['espRoca', 30, 24, 0.8], ['espMedusa', 40, 56, 1]],
      // karts-curvas-complejas: remolino en espiral doble (0.04–0.49) con portal que corta al centro, horquilla (0.51–0.56),
      // serpiente de S abierta (0.56–0.67), curva que se cierra (0.68–0.72), recta de los huecos (0.72–0.77) y horquilla doble.
      mecanicas: [{ tipo: 'abierto', tramo: [0.07, 0.13] }, { tipo: 'gravedad', tramo: [0.1, 0.19] }, { tipo: 'portal', f: 0.2, salida: 0.29, lado: -0.55, r: 24 },
        { tipo: 'abierto', tramo: [0.31, 0.36] }, { tipo: 'gravedad', tramo: [0.37, 0.45] }, { tipo: 'antiturbo', f: 0.48, lado: 0.4, r: 26 },
        { tipo: 'abierto', tramo: [0.565, 0.66] }, { tipo: 'antiturbo', f: 0.6, lado: -0.4, r: 26 }, { tipo: 'turbo', f: 0.725, lado: 0, r: 22 },
        { tipo: 'abierto', tramo: [0.73, 0.775] }, { tipo: 'brecha', f: 0.735 }, { tipo: 'plataforma', f: 0.756, periodo: 5, amp: 0.65, ancho: 0.5 },
        { tipo: 'abierto', tramo: [0.8, 0.86] }, { tipo: 'portal', f: 0.79, salida: 0.86, lado: 0.55, r: 24 }],
      vueltas: 2, puntos: [[2075,200], [2225,200], [2375,200], [2525,200], [2677,207], [2824,242], [2961,307], [3081,399], [3180,514], [3251,648], [3291,792], [3298,942], [3271,1089], [3211,1227], [3119,1346], [3001,1439], [2864,1501], [2715,1525], [2565,1509], [2424,1452], [2306,1359], [2221,1235], [2228,1087], [2338,989], [2485,999], [2589,1107], [2723,1169], [2861,1115], [2919,979], [2865,841], [2760,733], [2628,659], [2481,625], [2330,631], [2186,676], [2059,756], [1955,865], [1880,995], [1838,1139], [1830,1289], [1855,1436], [1913,1576], [2000,1700], [2112,1803], [2241,1879], [2385,1928], [2535,1947], [2687,1950], [2813,2027], [2852,2170], [2782,2300], [2641,2347], [2491,2347], [2348,2383], [2247,2493], [2101,2507], [1993,2406], [1859,2347], [1729,2414], [1618,2510], [1473,2487], [1372,2377], [1227,2347], [1077,2340], [935,2293], [817,2199], [756,2063], [755,1912], [755,1760], [755,1608], [755,1456], [755,1304], [728,1158], [603,1081], [451,1080], [299,1076], [183,987], [180,840], [292,746], [443,740], [595,740], [723,669], [755,524], [760,372], [840,247], [981,200], [1131,200], [1281,200], [1431,200], [1581,200], [1731,200], [1881,200]] },
  ];

  // karts-pistas-grandes: sube cuando los trazados cambian tanto que los récords no se comparan. karts-curvas-complejas: 3 =
  // trazados técnicos de las pistas con `trazado: 3` (sus récords de antes pasan a recordsV2, «trazado anterior»).
  const VERSION_PISTAS = 3;

  // karts-copa-espacio: `nivel` = orden de dificultad (el menú, el selector y las salas ordenan por él; 3 queda para
  // Reinos Antiguos) y `requiere: { podios }` = podios en otras copas para abrirla en el modo individual.
  const COPAS = [
    { id: 'fiesta', nivel: 1, nombre: 'Copa Fiesta', emoji: '🏆', desc: 'Pradera, desierto, hielo y volcán', pistas: ['pradera', 'desierto', 'hielo', 'volcan'] },
    { id: 'mesoamerica', nivel: 2, nombre: 'Copa Mesoamericana', emoji: '🌽', desc: 'De La Venta a Tenochtitlan', pistas: ['laventa', 'teotihuacan', 'chichen', 'tenochtitlan'] },
    { id: 'reinos', nivel: 3, nombre: 'Copa Reinos Antiguos', emoji: '🏺', desc: 'Carreras dentro de pirámides y templos (difícil)', requiere: { podios: 1 }, pistas: ['giza', 'castillo', 'karnak', 'angkor'] }, // karts-copa-reinos
    { id: 'espacio', nivel: 4, nombre: 'Copa del Espacio', emoji: '🚀', desc: 'Pistas imposibles en el espacio: la más difícil', requiere: { podios: 2 }, pistas: ['orbital', 'anillos', 'cinturon', 'nebulosa'] }, // karts-copa-espacio
  ];
  const copaPorId = id => COPAS.find(c => c.id === id) || COPAS[0]; // sin id (progreso viejo) → Copa Fiesta
  // karts-copa-espacio: copas en orden de dificultad y desbloqueo por podios en OTRAS copas (1.º a 3.º).
  const copasOrdenadas = () => COPAS.slice().sort((a, b) => a.nivel - b.nivel);
  const podiosDe = (copa, prog) => COPAS.filter(c => c.id !== copa.id && prog && prog.copas && prog.copas[c.id] && prog.copas[c.id].lugar <= 3).length;
  const podiosFaltan = (copa, prog) => (copa.requiere ? Math.max(0, copa.requiere.podios - podiosDe(copa, prog)) : 0);
  const copaDesbloqueada = (copa, prog) => podiosFaltan(copa, prog) === 0;

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
  // karts-copa-reinos: tramos interiores en muestras { i0, i1 (puede ser < i0 si cruza la meta), largo (muestras), w (px
  // entre el centro y el muro), muro (0 = dos muros; 1 / -1 = solo ese lado), nombre }.
  function tramosInteriores(pista, M) {
    const n = M.pts.length;
    return (pista.interiores || []).map(t => {
      const i0 = muestraMasCercana(M, t.desde[0], t.desde[1]), i1 = muestraMasCercana(M, t.hasta[0], t.hasta[1]);
      return { i0, i1, largo: (i1 - i0 + n) % n, w: Math.round((t.ancho || 1) * pista.mitad), muro: t.muro || 0, nombre: t.nombre || '' };
    });
  }
  // Por muestra: w = medio ancho hasta el muro (0 = afuera) y lado del muro (0 = los dos). Se guarda en M por pista.
  function muroEn(pista, M) {
    M.muros = M.muros || {};
    if (M.muros[pista.id]) return M.muros[pista.id];
    const n = M.pts.length, w = new Array(n).fill(0), lado = new Array(n).fill(0);
    for (const t of tramosInteriores(pista, M)) for (let d = 0; d <= t.largo; d++) { const i = (t.i0 + d) % n; w[i] = t.w; lado[i] = t.muro; }
    return (M.muros[pista.id] = { w, lado });
  }
  // Columnas fijas en el camino (slalom): cada `cada` muestras entre `desde` y `hasta`, alternando el lado (± lado·mitad).
  function colocarColumnas(pista, M) {
    const out = [], n = M.pts.length;
    for (const c of pista.columnas || []) {
      const i0 = muestraMasCercana(M, c.desde[0], c.desde[1]), largo = (muestraMasCercana(M, c.hasta[0], c.hasta[1]) - i0 + n) % n;
      for (let d = 0, k = 0; d <= largo; d += c.cada, k++) {
        const idx = (i0 + d) % n, lado = (k % 2 ? 1 : -1) * c.lado * pista.mitad, p = puntoEn(M, idx, lado);
        out.push({ x: p.x, y: p.y, idx, lado, r: c.r || 15 });
      }
    }
    return out;
  }
  // Zonas de las mecánicas en el mapa: { tipo, idx, x, y, r, ... } (lado en veces la mitad del camino).
  // karts-copa-espacio: también por fracción de la vuelta (`f`), tramos (`tramo` → i0, i1), huecos de la rampa y de la
  // plataforma (i0, i1) y la salida de los portales (idxSalida, sx, sy).
  const HUECO_DE = { brecha: m => [2, 2 + (m.largo || 10) - 1], plataforma: m => [0, (m.largo || 14) - 1] };
  // karts-copa-reinos: la roca y la losa (compuerta de piedra) guardan `w` (medio ancho hasta el muro) y la roca su
  // `ancho` de recorrido.
  function colocarMecanicas(pista, M) {
    const n = M.pts.length, muros = pista.interiores ? muroEn(pista, M) : null;
    return (pista.mecanicas || []).map(m => {
      if (m.tramo) { const i0 = Math.round(m.tramo[0] * n), p0 = M.pts[i0]; return { ...m, idx: i0, i0, i1: Math.round(m.tramo[1] * n), x: p0.x, y: p0.y, r: 0, a: p0.a }; }
      const idx = m.f === undefined ? muestraMasCercana(M, m.cerca[0], m.cerca[1]) : Math.round(m.f * n) % n, lado = (m.lado || 0) * pista.mitad;
      const p = puntoEn(M, idx, lado), z = { ...m, idx, x: p.x, y: p.y, r: m.r || 20, a: M.pts[idx].a };
      if (HUECO_DE[m.tipo]) { const [d0, d1] = HUECO_DE[m.tipo](m); z.i0 = idx + d0; z.i1 = idx + d1; }
      if (m.tipo === 'plataforma') { z.ampPx = (m.amp || 0.65) * pista.mitad; z.medioPx = m.ancho * pista.mitad; }
      if (m.salida !== undefined) { z.idxSalida = Math.round(m.salida * n) % n; const s = puntoEn(M, z.idxSalida, lado); z.sx = s.x; z.sy = s.y; }
      if (m.tipo === 'roca' || m.tipo === 'losa') z.w = (muros && muros.w[idx]) || pista.mitad; // karts-copa-reinos
      if (m.tipo === 'roca') z.ancho = Math.round((m.amplitud || 0.6) * z.w);
      return z;
    });
  }
  // ---- karts-copa-espacio: reglas puras de las mecánicas espaciales (las usan karts.html y las pruebas de Deno) ----
  // Banderas por muestra: ABIERTO (sin barandal: se puede caer), HUECO (rampa), PLATAFORMA (hueco con plataforma) y
  // GRAVEDAD (baja). null en las pistas que no son del espacio.
  const MARCA = { ABIERTO: 1, HUECO: 2, PLATAFORMA: 4, GRAVEDAD: 8 };
  const BITS = { abierto: MARCA.ABIERTO, gravedad: MARCA.GRAVEDAD, brecha: MARCA.HUECO | MARCA.ABIERTO, plataforma: MARCA.PLATAFORMA | MARCA.ABIERTO };
  function marcasEspacio(pista, M, zonas) {
    if (!pista.espacio) return null;
    const n = M.pts.length, m = new Uint8Array(n);
    for (const z of zonas) if (BITS[z.tipo]) for (let i = z.i0; i <= z.i1; i++) m[i % n] |= BITS[z.tipo];
    return m;
  }
  // Física espacial: salto de la rampa (s y px/s mínimos), caída y remolque del dron (s), gravedad baja y antiturbo.
  const ESPACIO = { saltoS: 0.7, velSalto: 150, caidaS: 0.8, remolqueS: 1.4, gravedadSalto: 1.6, gravedadAgarre: 0.4, antiturbo: 0.6 };
  // Dónde te deja el dron: desde un hueco (o si 4 muestras atrás cae en uno), 2 muestras después del hueco; desde un
  // borde abierto, 4 muestras atrás. Las mecánicas están lejos de la meta: nunca la cruza hacia atrás.
  function rescateEn(marcas, idx) {
    const n = marcas.length, hueco = MARCA.HUECO | MARCA.PLATAFORMA;
    let i = marcas[idx] & hueco ? idx : (idx - 4 + n) % n;
    if (!(marcas[i] & hueco)) return i;
    while (marcas[i % n] & hueco) i++;
    return (i + 2) % n;
  }
  const fase = (t, periodo) => (t % periodo) / periodo * Math.PI * 2;
  // Centro de la plataforma (px desde el centro del camino) en el tiempo t: va y viene de lado.
  const ladoPlataforma = (z, t) => Math.sin(fase(t, z.periodo)) * z.ampPx;
  // Abertura de la compuerta (fracción de la mitad del camino): de 1 (abierta) a 0.3 (el centro nunca se cierra).
  const aperturaCompuerta = (z, t) => 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(fase(t, z.periodo)));
  // Tramos de adornos fijos: posiciones a ambos lados entre `desde` y `hasta`, cada `cada` muestras (karts-copa-reinos:
  // `solo` = 1 o -1, solo de ese lado, como la columnata de una galería).
  function colocarFijos(pista, M) {
    const out = [], n = M.pts.length;
    for (const f of pista.fijos || []) {
      const i0 = muestraMasCercana(M, f.desde[0], f.desde[1]), i1 = muestraMasCercana(M, f.hasta[0], f.hasta[1]);
      const largo = (i1 - i0 + n) % n, medio = Math.round(largo / 2 / f.cada) * f.cada; // `medio`: adorno distinto al centro
      for (let d = 0; d <= largo; d += f.cada) {
        const img = f.medio && d === medio ? f.medio : f.img;
        for (const s of f.solo ? [f.solo] : [-1, 1]) { const p = puntoEn(M, i0 + d, s * (pista.mitad * f.lado + f.w * 0.3)); out.push({ x: p.x, y: p.y, img, w: f.w, h: f.h, idx: (i0 + d) % n }); }
      }
    }
    return out;
  }
  // ---- karts-copa-reinos: mecánicas deterministas (solo dependen del reloj de la carrera t, en s) ----
  const faseCiclo = (z, t) => { const P = z.periodo; return ((((t + (z.desfase || 0)) % P) + P) % P) / P; };
  const ALTO_BLOQUE = 170; // escondido arriba (más alto que los muros)
  // Altura (px) del bloque que cae: escondido, baja despacio (aviso: su sombra crece), cae, queda en el piso y sube.
  function alturaBloque(z, t) {
    const f = faseCiclo(z, t);
    if (f < 0.55) return ALTO_BLOQUE;
    if (f < 0.8) return ALTO_BLOQUE - (f - 0.55) / 0.25 * 110;
    if (f < 0.86) return 60 * (1 - (f - 0.8) / 0.06);
    if (f < 0.97) return 0;
    return (f - 0.97) / 0.03 * ALTO_BLOQUE;
  }
  const bloquePeligro = (z, t) => alturaBloque(z, t) < 20;
  // Lado (px desde el centro) de la roca rodante: va y viene entre los muros.
  const ladoRoca = (z, t) => Math.sin(faseCiclo(z, t) * Math.PI * 2) * z.ancho;
  // Centro (px desde el centro del camino) de la losa (compuerta de piedra), que tapa medio ancho (w): pausa a la izquierda,
  // se desliza 0.1 del ciclo, pausa a la derecha y regresa.
  function centroCompuerta(z, t) {
    const f = faseCiclo(z, t), h = z.w / 2;
    if (f < 0.4) return -h;
    if (f < 0.5) return -h + (f - 0.4) / 0.1 * z.w;
    if (f < 0.9) return h;
    return h - (f - 0.9) / 0.1 * z.w;
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

  // ---- karts-curvas-complejas: complejidad medible del trazado (la usan las pruebas; el juego no la necesita al correr) ----
  // Tramos de giro en un mismo sentido sobre las muestras de Arcade.muestrearPista (radio < rmax px): se ignoran los de
  // < 8° y se unen los del mismo sentido separados por ≤ 80 px. Cada curva: { sg (1 horario, -1 antihorario), i0, i1,
  // grados, rmin (px), largo (px) }.
  const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
  function curvasTrazado(M, rmax = 1000) {
    const pts = M.pts, n = pts.length, lim = M.paso / rmax;
    const da = pts.map((p, i) => angulo(pts[(i + 1) % n].a - pts[(i - 1 + n) % n].a) / 2);
    const signo = d => (Math.abs(d) < lim ? 0 : Math.sign(d));
    const s0 = Math.max(0, da.findIndex(d => signo(d) === 0)), crudas = [];
    let cur = null;
    for (let k = 0; k < n; k++) {
      const i = (s0 + k) % n, d = da[i], sg = signo(d);
      if (cur && sg === cur.sg) { cur.giro += d; cur.i1 = i; cur.rmin = Math.min(cur.rmin, M.paso / Math.abs(d)); continue; }
      if (cur && cur.sg) crudas.push(cur);
      cur = { sg, i0: i, i1: i, giro: d, rmin: sg ? M.paso / Math.abs(d) : Infinity };
    }
    if (cur && cur.sg) crudas.push(cur);
    const out = [];
    for (const c of crudas.filter(x => Math.abs(x.giro) >= 8 * Math.PI / 180)) {
      const u = out[out.length - 1];
      if (u && u.sg === c.sg && ((c.i0 - u.i1 + n) % n) * M.paso <= 80) { u.giro += c.giro; u.i1 = c.i1; u.rmin = Math.min(u.rmin, c.rmin); } else out.push({ ...c });
    }
    return out.map(c => ({ sg: c.sg, i0: c.i0, i1: c.i1, rmin: Math.round(c.rmin), grados: Math.round(Math.abs(c.giro) * 180 / Math.PI), largo: (((c.i1 - c.i0 + n) % n) + 1) * M.paso }));
  }
  // Resumen: curvas > 120°, espirales (≥ 360° en un sentido), sacacorchos (≥ 270°), laberinto (racha más larga de giros de
  // 60° a 120° separados ≤ 600 px), chicanas (curvas ≥ 45° de sentido contrario a ≤ 250 px) y horquillas (150° a 230°
  // con radio ≤ 220 px).
  function complejidad(M) {
    const cs = curvasTrazado(M), n = M.pts.length, gap = (a, b) => ((b.i0 - a.i1 + n) % n) * M.paso;
    let racha = 0, laberinto = 0, chicanas = 0;
    cs.forEach((c, k) => {
      const prev = cs[k - 1], noventa = c.grados >= 60 && c.grados <= 120;
      racha = noventa ? (prev && racha && gap(prev, c) <= 600 ? racha + 1 : 1) : 0;
      laberinto = Math.max(laberinto, racha);
      if (prev && prev.sg !== c.sg && prev.grados >= 45 && c.grados >= 45 && gap(prev, c) <= 250) chicanas++;
    });
    return { curvas: cs.length, mayores120: cs.filter(c => c.grados > 120).length, espirales: cs.filter(c => c.grados >= 360).length,
      sacacorchos: cs.filter(c => c.grados >= 270).length, laberinto, chicanas, horquillas: cs.filter(c => c.grados >= 150 && c.grados <= 230 && c.rmin <= 220).length };
  }
  // ---- Récords por trazado (karts-pistas-grandes y karts-curvas-complejas) ----
  // Sin pistasV (antes de las pistas grandes): todos los récords pasan a recordsV1 («pista chica»). Con pistasV 2: los de
  // las pistas con `trazado: 3` pasan a recordsV2 («trazado anterior»). Copas, piezas, equipo, copa en curso y los
  // demás récords no cambian. Devuelve 'chica' o 'trazado' si archivó algún récord (hay que guardar y avisar) o false.
  function migrarRecords(pr) {
    const antes = pr.pistasV;
    pr.records = pr.records || {}; pr.recordsV1 = pr.recordsV1 || {}; pr.recordsV2 = pr.recordsV2 || {};
    if (antes === VERSION_PISTAS) return false;
    pr.pistasV = VERSION_PISTAS;
    if (antes !== 2) {
      pr.recordsV1 = { ...pr.records }; pr.records = {};
      return Object.keys(pr.recordsV1).length ? 'chica' : false;
    }
    let movidos = 0;
    for (const p of PISTAS) {
      if (p.trazado !== VERSION_PISTAS || !pr.records[p.id]) continue;
      pr.recordsV2[p.id] = pr.records[p.id]; delete pr.records[p.id]; movidos++;
    }
    return movidos ? 'trazado' : false;
  }

  raiz.KartsPistas = { PISTAS, COPAS, VERSION_PISTAS, curvasTrazado, complejidad, migrarRecords, // karts-curvas-complejas
    copaPorId, puntoEn, colocarMecanicas, colocarFijos, ladoTrajinera, encuadrarMinimapa,
    tramosInteriores, muroEn, colocarColumnas, alturaBloque, bloquePeligro, ladoRoca, centroCompuerta, ALTO_BLOQUE, // karts-copa-reinos
    copasOrdenadas, copaDesbloqueada, podiosFaltan, MARCA, ESPACIO, marcasEspacio, rescateEn, ladoPlataforma, aperturaCompuerta }; // karts-copa-espacio
})(typeof window !== 'undefined' ? window : globalThis);
