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

    // ---------- karts-copa-espacio: pistas espaciales (Copa del Espacio, carrera rápida y salas) ----------
    // `espacio: true` = fuera del camino hay vacío: con barandal (postes de neón) se raspa; en los tramos `abierto` se
    // cae y el dron de rescate te regresa. `ritmoBots` multiplica la habilidad de los bots (y divide el tiempo de los
    // fantasmas de sala). Mecánicas por fracción de la vuelta: `f` (punto) o `tramo: [f0, f1]`.
    { id: 'orbital', nombre: 'Estación Orbital Quetzal', emoji: '🛰️', sala: true, espacio: true, ritmoBots: 1.04, desc: 'Pasillos y hangares. Las compuertas abren y cierran: pasa por el centro.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 1,
      color: { fondo: '#03050c', fondo2: '#0b1a3a', camino: '#3b4763', borde1: '#22d3ee', borde2: '#fbbf24', linea: '#a5f3fc' },
      tema: { cielo: ['#01030a', '#081634', '#1a3566'], bruma: '#13284f', lejos: '#1d3a6b', cerca: '#0e1d3a', cerca2: '#091327', franja: '#0b1a3a', sol: null, nubes: 0, espacio: 'orbital' },
      decor: [['espPanel', 50, 28, 0.45], ['espAntena', 18, 56, 0.8], ['espModulo', 96, 60, 1]],
      mecanicas: [{ tipo: 'turbo', f: 0.07, lado: -0.35, r: 22 }, { tipo: 'turbo', f: 0.095, lado: 0.35, r: 22 }, { tipo: 'compuerta', f: 0.12, periodo: 3.2 },
        { tipo: 'abierto', tramo: [0.22, 0.31] }, { tipo: 'antiturbo', f: 0.36, lado: 0.4, r: 26 }, { tipo: 'compuerta', f: 0.52, periodo: 3.6 },
        { tipo: 'gravedad', tramo: [0.55, 0.63] }, { tipo: 'antiturbo', f: 0.66, lado: -0.4, r: 26 }, { tipo: 'turbo', f: 0.7, lado: -0.35, r: 22 },
        { tipo: 'turbo', f: 0.73, lado: 0.35, r: 22 }, { tipo: 'compuerta', f: 0.76, periodo: 4 }, { tipo: 'abierto', tramo: [0.8, 0.86] }],
      vueltas: 2, puntos: [[870, 329], [1630, 319], [2390, 329], [3150, 338], [3578, 604], [3625, 1203], [3293, 1535], [2770, 1440], [2343, 1108], [1868, 1013], [1440, 1250], [1630, 1678], [2248, 1820], [2865, 1963], [3150, 2390], [2580, 2656], [1630, 2580], [775, 2533], [376, 2105], [443, 1440], [775, 1108], [585, 680]] },
    { id: 'anillos', nombre: 'Anillos de Saturno', emoji: '🪐', sala: true, espacio: true, ritmoBots: 1.05, desc: 'Hielo de los anillos que resbala y rocas que cruzan el camino.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 0.7,
      color: { fondo: '#04060e', fondo2: '#1c2440', camino: '#5b7594', borde1: '#7dd3fc', borde2: '#fbbf24', linea: '#e0f2fe' },
      tema: { cielo: ['#02030a', '#141a33', '#3a2f3f'], bruma: '#2a2438', lejos: '#3a3350', cerca: '#1a1830', cerca2: '#100f22', franja: '#1c2440', sol: '#fff7e0', nubes: 0, espacio: 'anillos' },
      decor: [['espHielo', 30, 26, 0.5], ['espRoca', 34, 26, 0.85], ['espLunita', 80, 80, 1]],
      mecanicas: [{ tipo: 'turbo', f: 0.07, lado: -0.3, r: 22 }, { tipo: 'asteroide', f: 0.1, periodo: 4.4, ancho: 120 }, { tipo: 'abierto', tramo: [0.16, 0.3] },
        { tipo: 'asteroide', f: 0.47, periodo: 5, ancho: 120 }, { tipo: 'abierto', tramo: [0.56, 0.68] }, { tipo: 'turbo', f: 0.565, lado: 0, r: 22 },
        { tipo: 'brecha', f: 0.6 }, { tipo: 'asteroide', f: 0.66, periodo: 4.7, ancho: 120 }, { tipo: 'abierto', tramo: [0.71, 0.79] }],
      vueltas: 2, puntos: [[937, 336], [1756, 327], [2575, 355], [3303, 482], [3622, 1028], [3394, 1665], [2757, 1756], [2302, 1392], [1847, 1529], [2075, 2056], [2666, 2120], [3076, 2302], [2985, 2648], [2211, 2621], [1392, 2530], [664, 2393], [346, 1847], [664, 1392], [1210, 1392], [1347, 983], [892, 864], [464, 773], [418, 500]] },
    { id: 'cinturon', nombre: 'Cinturón de Asteroides', emoji: '☄️', sala: true, espacio: true, ritmoBots: 1.06, desc: 'Asteroides en órbita, huecos con rampa y plataformas que se mueven.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 0.95,
      color: { fondo: '#05040a', fondo2: '#2a1a14', camino: '#4c4a5a', borde1: '#fb923c', borde2: '#fde047', linea: '#fed7aa' },
      tema: { cielo: ['#020106', '#160c18', '#3b1d1a'], bruma: '#2b1716', lejos: '#3a2420', cerca: '#1c1214', cerca2: '#120b0d', franja: '#2a1a14', sol: '#fff1c2', nubes: 0, espacio: 'cinturon' },
      decor: [['espRoca', 36, 28, 0.55], ['espRocaGrande', 74, 56, 0.85], ['espSatelite', 46, 36, 1]],
      mecanicas: [{ tipo: 'turbo', f: 0.065, lado: 0, r: 22 }, { tipo: 'abierto', tramo: [0.07, 0.18] }, { tipo: 'brecha', f: 0.08 }, { tipo: 'brecha', f: 0.15 },
        { tipo: 'asteroide', f: 0.25, periodo: 4.8, ancho: 120 }, { tipo: 'abierto', tramo: [0.29, 0.37] }, { tipo: 'turbo', f: 0.305, lado: 0, r: 22 }, { tipo: 'brecha', f: 0.33 },
        { tipo: 'antiturbo', f: 0.44, lado: 0.4, r: 26 }, { tipo: 'abierto', tramo: [0.48, 0.56] }, { tipo: 'plataforma', f: 0.52, periodo: 5.5, amp: 0.65, ancho: 0.5 },
        { tipo: 'asteroide', f: 0.7, periodo: 5.4, ancho: 120 }, { tipo: 'antiturbo', f: 0.8, lado: -0.4, r: 26 }, { tipo: 'abierto', tramo: [0.86, 0.93] },
        { tipo: 'plataforma', f: 0.9, periodo: 6, amp: 0.6, ancho: 0.5 }],
      vueltas: 2, puntos: [[979, 329], [1852, 319], [2725, 339], [3453, 446], [3792, 1076], [3695, 1852], [3501, 2483], [2919, 2677], [2531, 2289], [2386, 1658], [1998, 1416], [1610, 1658], [1464, 2289], [1076, 2677], [543, 2483], [349, 1852], [688, 1416], [446, 931], [494, 591]] },
    { id: 'nebulosa', nombre: 'Nebulosa Esmeralda', emoji: '🌌', sala: true, espacio: true, ritmoBots: 1.08, desc: 'Portales, gravedad baja y plataformas: la pista más difícil.',
      mitad: 54, fuera: 'vacio', lento: 0.5, agarre: 0.9,
      color: { fondo: '#03070a', fondo2: '#0c2a24', camino: '#334658', borde1: '#34d399', borde2: '#f472b6', linea: '#bbf7d0' },
      tema: { cielo: ['#020509', '#0b2230', '#174a3c'], bruma: '#123a33', lejos: '#1b4a40', cerca: '#0c241f', cerca2: '#071713', franja: '#0c2a24', sol: null, nubes: 0, espacio: 'nebulosa' },
      decor: [['espCristal', 22, 40, 0.5], ['espRoca', 30, 24, 0.8], ['espMedusa', 40, 56, 1]],
      mecanicas: [{ tipo: 'turbo', f: 0.065, lado: 0, r: 22 }, { tipo: 'abierto', tramo: [0.07, 0.12] }, { tipo: 'abierto', tramo: [0.22, 0.31] },
        { tipo: 'portal', f: 0.215, salida: 0.3, lado: -0.55, r: 24 }, { tipo: 'gravedad', tramo: [0.36, 0.45] }, { tipo: 'antiturbo', f: 0.48, lado: 0.4, r: 26 },
        { tipo: 'abierto', tramo: [0.55, 0.69] }, { tipo: 'gravedad', tramo: [0.55, 0.7] }, { tipo: 'turbo', f: 0.555, lado: 0, r: 22 }, { tipo: 'brecha', f: 0.58 },
        { tipo: 'plataforma', f: 0.62, periodo: 5, amp: 0.65, ancho: 0.5 }, { tipo: 'antiturbo', f: 0.66, lado: -0.4, r: 26 }, { tipo: 'abierto', tramo: [0.72, 0.82] },
        { tipo: 'portal', f: 0.74, salida: 0.8, lado: 0.55, r: 24 }, { tipo: 'plataforma', f: 0.84, periodo: 5.6, amp: 0.65, ancho: 0.5 }],
      vueltas: 2, puntos: [[905, 337], [1695, 319], [2439, 356], [2904, 672], [2625, 1137], [2067, 1184], [1788, 1602], [2253, 1974], [2904, 1788], [3164, 1379], [3416, 1221], [3648, 1509], [3722, 1881], [3462, 2439], [2625, 2579], [1695, 2532], [858, 2439], [393, 1974], [719, 1556], [1277, 1277], [1184, 951], [812, 905], [467, 802], [421, 514]] },
  ];

  const VERSION_PISTAS = 2; // karts-pistas-grandes: sube cuando los trazados cambian tanto que los récords no se comparan

  // karts-copa-espacio: `nivel` = orden de dificultad (el menú, el selector y las salas ordenan por él; 3 queda para
  // Reinos Antiguos) y `requiere: { podios }` = podios en otras copas para abrirla en el modo individual.
  const COPAS = [
    { id: 'fiesta', nivel: 1, nombre: 'Copa Fiesta', emoji: '🏆', desc: 'Pradera, desierto, hielo y volcán', pistas: ['pradera', 'desierto', 'hielo', 'volcan'] },
    { id: 'mesoamerica', nivel: 2, nombre: 'Copa Mesoamericana', emoji: '🌽', desc: 'De La Venta a Tenochtitlan', pistas: ['laventa', 'teotihuacan', 'chichen', 'tenochtitlan'] },
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
  // Zonas de las mecánicas en el mapa: { tipo, idx, x, y, r, ... } (lado en veces la mitad del camino).
  // karts-copa-espacio: también por fracción de la vuelta (`f`), tramos (`tramo` → i0, i1), huecos de la rampa y de la
  // plataforma (i0, i1) y la salida de los portales (idxSalida, sx, sy).
  const HUECO_DE = { brecha: m => [2, 2 + (m.largo || 10) - 1], plataforma: m => [0, (m.largo || 14) - 1] };
  function colocarMecanicas(pista, M) {
    const n = M.pts.length;
    return (pista.mecanicas || []).map(m => {
      if (m.tramo) { const i0 = Math.round(m.tramo[0] * n), p0 = M.pts[i0]; return { ...m, idx: i0, i0, i1: Math.round(m.tramo[1] * n), x: p0.x, y: p0.y, r: 0, a: p0.a }; }
      const idx = m.f === undefined ? muestraMasCercana(M, m.cerca[0], m.cerca[1]) : Math.round(m.f * n) % n, lado = (m.lado || 0) * pista.mitad;
      const p = puntoEn(M, idx, lado), z = { ...m, idx, x: p.x, y: p.y, r: m.r || 20, a: M.pts[idx].a };
      if (HUECO_DE[m.tipo]) { const [d0, d1] = HUECO_DE[m.tipo](m); z.i0 = idx + d0; z.i1 = idx + d1; }
      if (m.tipo === 'plataforma') { z.ampPx = (m.amp || 0.65) * pista.mitad; z.medioPx = m.ancho * pista.mitad; }
      if (m.salida !== undefined) { z.idxSalida = Math.round(m.salida * n) % n; const s = puntoEn(M, z.idxSalida, lado); z.sx = s.x; z.sy = s.y; }
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

  raiz.KartsPistas = { PISTAS, COPAS, VERSION_PISTAS, copaPorId, puntoEn, colocarMecanicas, colocarFijos, ladoTrajinera, encuadrarMinimapa,
    copasOrdenadas, copaDesbloqueada, podiosFaltan, MARCA, ESPACIO, marcasEspacio, rescateEn, ladoPlataforma, aperturaCompuerta }; // karts-copa-espacio
})(typeof window !== 'undefined' ? window : globalThis);
