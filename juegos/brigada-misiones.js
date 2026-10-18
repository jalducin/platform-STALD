// Misiones de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §5). Sin DOM: lo cargan juegos/brigada.html y
// el servidor (server/brigada.ts) junto con juegos/brigada-motor.js. El dibujo de cada escenario vive en
// juegos/brigada-arte.js (por `clave`).
// Unidades en píxeles nativos; la ventana de juego mide 480 × 270 y el suelo base está en y = 230 (y crece hacia abajo).
//   suelo        [[x0, x1, y], …] continuo de 0 a `largo` (sin fosos: nadie muere por caer)
//   plataformas  [[x0, x1, y], …] de un solo sentido
//   puntosControl x donde se guarda el reintento (el motor agrega uno antes de cada minijefe y del jefe)
//   enemigos     [[x, tipo, y?], …] aparecen cuando la cámara llega a x (y: altura de vuelo o de la plataforma)
//   jaulas       [[x, animal, y?], …] animalitos que se rescatan (y: la de la plataforma donde está la jaula)
//   objetos      [[x, tipo, y?], …] cajas de premio flotando: rafaga, abanico, laser, escudo, globos, estrella, corazon
//   vehiculos    [[x], …] Armadillos estacionados
//   minijefe / jefe  { x (inicio de la arena, la cámara se fija ahí), tipo, pista }
// Datos extra que el motor no usa y la vista sí (contenido):
//   secciones    [{ nombre, desde, hasta }] tramos con nombre de 0 a la arena del jefe, sin la del minijefe (aviso al entrar)
//   dificultad   'Fácil' | 'Normal' | 'Difícil' | 'Experta' (la etiqueta del mapa)
//   puntosMeta   puntos de una persona que se proponen como reto en el mapa («meta»), menores que puntosMaximos(id, 1)
// Los enemigos se arman por tramo con patrones con nombre (escuadra, enjambre, nido, muralla, brincos, invasión).
// El escalado por número de personajes (1–8) lo hace el motor: vida × (1 + 0.15 (N−1)), copias extra de algunos
// enemigos y jefes con vida × (1 + 0.45 (N−1)); `dificultadPara(id, n)` lo resume para el mapa.
(function (raiz) {
  'use strict';
  const SUELO = 230;
  // Todos los animalitos que la vista sabe dibujar (brigada-arte.js); cada misión usa los de su región.
  const ANIMALES = ['ajolotito', 'xolito', 'guacamaya', 'tortuguita', 'conejito', 'colibri', 'monito', 'correcaminos', 'tlacuachito', 'mariposa'];
  const VUELO = [118, 134, 104, 126];

  // ================= Patrones de enemigos =================
  // Cada patrón devuelve [[x, tipo, y?], …] a partir de x. Sin azar: el nivel es el mismo para todos.
  // Escuadra: n caminantes (patrullabots) separados `sep` px.
  const escuadra = (x, n, sep) => Array.from({ length: n }, (_, k) => [x + k * (sep || 44), 'patrulla']);
  // Enjambre: n drones a alturas que se alternan (onda).
  const enjambre = (x, n, sep) => Array.from({ length: n }, (_, k) => [x + k * (sep || 52), 'dron', VUELO[k % VUELO.length]]);
  // Nido: torreta fija sobre una plataforma (y) o en el suelo (sin y).
  const nido = (x, y) => [y ? [x, 'torreta', y] : [x, 'torreta']];
  // Muralla: un escudobot al frente y dos saltabots detrás (hay que saltarlo o usar un globo).
  const muralla = x => [[x, 'escudobot'], [x + 40, 'saltabot'], [x + 68, 'saltabot']];
  // Brincos: saltabots en fila.
  const brincos = (x, n, sep) => Array.from({ length: n }, (_, k) => [x + k * (sep || 36), 'saltabot']);
  // Invasión: gelatinos alienígenas (saltan y disparan en abanico).
  const invasion = (x, n, sep) => Array.from({ length: n }, (_, k) => [x + k * (sep || 48), 'alien']);
  // Mezcla: tipos por letra con separación fija (p patrulla, d dron, t torreta, s saltabot, e escudobot, a alien).
  const LETRA = { p: 'patrulla', d: 'dron', t: 'torreta', s: 'saltabot', e: 'escudobot', a: 'alien' };
  const mezcla = (x, patron, sep) => [...patron].map((l, k) => (LETRA[l] === 'dron' ? [x + k * sep, 'dron', VUELO[k % VUELO.length]] : [x + k * sep, LETRA[l]]));

  // Suelo a partir de cortes [x, y]: cada tramo va del corte al siguiente.
  function suelo(cortes, largo) {
    return cortes.map(([x, y], i) => [x, i + 1 < cortes.length ? cortes[i + 1][0] : largo, y]);
  }
  // Jaulas con los animalitos de la región en orden (y: la de la plataforma; 0 = en el suelo).
  const jaulas = (xs, ys, animales) => xs.map((x, i) => (ys?.[i] ? [x, animales[i % animales.length], ys[i]] : [x, animales[i % animales.length]]));
  function mision(o) {
    const largo = o.jefe.x + 480;
    const enemigos = o.tramos.flatMap(t => t.oleadas).sort((a, b) => a[0] - b[0]);
    const secciones = o.tramos.map(({ nombre, desde, hasta }) => ({ nombre, desde, hasta }));
    return { ...o, largo, suelo: suelo(o.cortes, largo), enemigos, secciones, cortes: undefined, tramos: undefined };
  }

  const LISTA = [
    // 1 · Fácil: corta y amable. Presenta a cada enemigo de uno en uno, sin minijefe.
    mision({
      id: 1, clave: 'selva', nombre: 'Selva de Ceibas', emoji: '🌳', tiempoMeta: 200, dificultad: 'Fácil', puntosMeta: 9000,
      lema: 'Unos robots tragahojas quieren llevarse las ceibas. ¡Rescata a los animalitos!',
      cortes: [[0, SUELO], [560, 216], [820, SUELO], [1180, 222], [1380, SUELO], [1760, 210], [1960, 222], [2240, SUELO]],
      plataformas: [[620, 720, 168], [1200, 1300, 172], [1500, 1610, 180], [2020, 2140, 172], [2560, 2680, 180]],
      puntosControl: [1640],
      tramos: [
        { nombre: 'Orilla del río', desde: 0, hasta: 900, oleadas: [...escuadra(470, 2, 60), ...brincos(640, 2, 50), ...escuadra(760, 2), [870, 'dron', 118]] },
        { nombre: 'Cafetal de la ladera', desde: 900, hasta: 1640, oleadas: [...enjambre(960, 3, 70), ...escuadra(1120, 2), ...nido(1250, 172), ...brincos(1420, 3), [1560, 'dron', 126]] },
        { nombre: 'Ceibas gigantes', desde: 1640, hasta: 2500, oleadas: [...mezcla(1700, 'pdspd', 70), ...nido(2080), ...escuadra(2200, 3, 50), ...enjambre(2360, 2)] },
        { nombre: 'Claro de las ruinas', desde: 2500, hasta: 3120, oleadas: [...mezcla(2540, 'psdps', 64), [2860, 'escudobot'], ...enjambre(2920, 2, 60)] },
      ],
      jaulas: jaulas([680, 1440, 2080, 2520, 2900], [168, 0, 172, 0, 0], ['guacamaya', 'monito', 'tortuguita', 'colibri', 'tlacuachito']),
      objetos: [[900, 'rafaga'], [1560, 'globos', 150], [2330, 'abanico'], [2760, 'estrella', 158], [3000, 'corazon']],
      vehiculos: [],
      minijefe: null,
      jefe: { x: 3120, tipo: 'tractor', pista: 'Cuando echa humo va a embestir: ¡salta o apártate!' },
    }),
    // 2 · Normal: aparecen las torretas en alto, la muralla de escudo y el Armadillo.
    mision({
      id: 2, clave: 'desierto', nombre: 'Desierto de Saguaros', emoji: '🌵', tiempoMeta: 260, dificultad: 'Normal', puntosMeta: 13000,
      lema: 'Una excavadora y un escorpión de hojalata asustan al pueblito de adobe.',
      cortes: [[0, SUELO], [500, 220], [760, SUELO], [1240, 214], [1500, 224], [1700, SUELO], [2500, 212], [2700, 224], [2960, SUELO], [3300, 218], [3480, SUELO]],
      plataformas: [[560, 680, 170], [1260, 1380, 166], [2560, 2660, 164], [3060, 3180, 182], [3350, 3450, 170]],
      puntosControl: [1450, 2900],
      tramos: [
        { nombre: 'Mesas rojas', desde: 0, hasta: 1450, oleadas: [...escuadra(450, 3, 48), ...enjambre(620, 2, 64), ...brincos(800, 2), ...mezcla(940, 'pdt', 80), ...nido(1320, 166), ...enjambre(1160, 2, 60), [1400, 'patrulla']] },
        { nombre: 'Pueblito de adobe', desde: 1450, hasta: 1900, oleadas: [...muralla(1520), ...enjambre(1660, 2, 56), ...escuadra(1760, 2)] },
        { nombre: 'Saguaros al atardecer', desde: 2380, hasta: 2900, oleadas: [...mezcla(2440, 'sdpdes', 72), ...nido(2610, 164)] },
        { nombre: 'Cañón del viento', desde: 2900, hasta: 3720, oleadas: [...muralla(2960), ...nido(3110, 182), ...enjambre(3200, 3, 54), ...mezcla(3380, 'psdpe', 60)] },
      ],
      jaulas: jaulas([620, 1300, 2440, 2610, 3120, 3400], [170, 166, 0, 164, 0, 170], ['correcaminos', 'conejito', 'tortuguita', 'colibri', 'xolito', 'mariposa']),
      objetos: [[820, 'rafaga'], [1560, 'escudo'], [2480, 'laser'], [2840, 'globos'], [3240, 'estrella', 156], [3600, 'corazon']],
      vehiculos: [[980]],
      minijefe: { x: 1900, tipo: 'excavadora', pista: 'Las rocas caen donde ves su sombra: ¡muévete!' },
      jefe: { x: 3720, tipo: 'escorpion', pista: 'Si se esconde en la arena, sal de la nube de polvo.' },
    }),
    // 3 · Difícil: azoteas con varias alturas, enjambres más grandes y dos murallas.
    mision({
      id: 3, clave: 'ciudad', nombre: 'Ciudad de Colores', emoji: '🏙️', tiempoMeta: 290, dificultad: 'Difícil', puntosMeta: 16000,
      lema: 'Un dirigible antena cubrió el cielo de la ciudad. ¡Libera las calles!',
      cortes: [[0, SUELO], [420, 218], [640, SUELO], [1000, 206], [1180, 220], [1400, SUELO], [2700, 214], [2900, SUELO], [3250, 208], [3460, 222], [3700, SUELO]],
      plataformas: [[450, 600, 170], [1020, 1150, 158], [1560, 1700, 182], [2760, 2880, 166], [3000, 3140, 182], [3280, 3420, 160], [3800, 3920, 182]],
      puntosControl: [1500, 3050],
      tramos: [
        { nombre: 'Mercado y papel picado', desde: 0, hasta: 1000, oleadas: [...escuadra(420, 3, 46), ...enjambre(560, 3, 50), ...brincos(700, 3, 34), ...mezcla(820, 'pdet', 56)] },
        { nombre: 'Azoteas', desde: 1000, hasta: 1500, oleadas: [...nido(1080, 158), ...enjambre(1150, 3, 48), ...muralla(1260)] },
        { nombre: 'Avenida de murales', desde: 1500, hasta: 2140, oleadas: [...mezcla(1540, 'pdsedp', 62), ...enjambre(1920, 3, 50), ...escuadra(2040, 2)] },
        { nombre: 'Puente de cables', desde: 2620, hasta: 3050, oleadas: [...mezcla(2660, 'dpsd', 66), ...brincos(2980, 2)] },
        { nombre: 'Torre de antenas', desde: 3050, hasta: 4120, oleadas: [...muralla(3100), ...nido(3350, 160), ...enjambre(3440, 3, 52), ...mezcla(3600, 'pdesd', 64), ...nido(3860, 182), ...escuadra(3960, 2)] },
      ],
      jaulas: jaulas([520, 1080, 1630, 2820, 3340, 3860], [170, 158, 182, 166, 160, 0], ['xolito', 'ajolotito', 'colibri', 'tlacuachito', 'mariposa', 'conejito']),
      objetos: [[760, 'laser'], [1450, 'globos'], [2000, 'escudo'], [2740, 'rafaga'], [3200, 'abanico'], [3560, 'estrella', 150], [4000, 'corazon']],
      vehiculos: [[1250]],
      minijefe: { x: 2140, tipo: 'grua', pista: 'Mira la sombra de las cajas y agáchate cuando lance el gancho.' },
      jefe: { x: 4120, tipo: 'antenon', pista: 'Dispara hacia arriba en diagonal; las sombras avisan dónde cae la lluvia.' },
    }),
    // 4 · Experta: los gelatinos invasores, torretas en cada módulo y la Reina Nodriza.
    mision({
      id: 4, clave: 'estacion', nombre: 'Estación Orbital', emoji: '🛰️', tiempoMeta: 320, dificultad: 'Experta', puntosMeta: 19000,
      lema: 'La Reina Nodriza aterrizó en la estación. ¡Última misión de la brigada!',
      cortes: [[0, SUELO], [480, 214], [720, SUELO], [1100, 206], [1320, 222], [1600, SUELO], [2900, 210], [3140, 224], [3400, SUELO], [3800, 212], [4000, SUELO]],
      plataformas: [[520, 660, 166], [1120, 1260, 158], [1700, 1840, 182], [2960, 3080, 162], [3460, 3600, 182], [3840, 3960, 164], [4200, 4330, 182]],
      puntosControl: [1650, 3300],
      tramos: [
        { nombre: 'Muelle de carga', desde: 0, hasta: 1100, oleadas: [...invasion(420, 2, 60), ...enjambre(560, 3, 48), ...mezcla(720, 'pesap', 56), ...brincos(980, 2, 34)] },
        { nombre: 'Invernadero lunar', desde: 1100, hasta: 1650, oleadas: [...nido(1190, 158), ...invasion(1300, 3, 52), ...enjambre(1460, 3, 46), [1600, 'patrulla']] },
        { nombre: 'Pasillo de esclusas', desde: 1650, hasta: 2320, oleadas: [...muralla(1700), ...mezcla(1840, 'adtd', 62), ...enjambre(2160, 3, 48)] },
        { nombre: 'Jardín de antenas', desde: 2800, hasta: 3300, oleadas: [...mezcla(2850, 'adpsa', 60), ...nido(3020, 162), ...invasion(3160, 3, 46)] },
        { nombre: 'Puente de mando', desde: 3300, hasta: 4520, oleadas: [...muralla(3340), ...enjambre(3480, 4, 46), ...mezcla(3700, 'aeda', 60), ...nido(3900, 164), ...invasion(4040, 2, 60)] },
      ],
      jaulas: jaulas([590, 1190, 1770, 3020, 3530, 3900, 4270], [166, 158, 182, 162, 182, 164, 182], ['ajolotito', 'xolito', 'guacamaya', 'tortuguita', 'conejito', 'colibri', 'mariposa']),
      objetos: [[820, 'laser'], [1400, 'escudo'], [2100, 'globos'], [2860, 'rafaga'], [3300, 'abanico'], [3700, 'escudo'], [4100, 'estrella', 155], [4440, 'corazon']],
      vehiculos: [[1000]],
      minijefe: { x: 2320, tipo: 'torre', pista: 'Las columnas de luz se marcan antes: quédate entre ellas.' },
      jefe: { x: 4520, tipo: 'reina', pista: 'Gira en espiral: busca el hueco entre las burbujas y dispárale desde abajo.' },
    }),
  ];

  // Resumen de cómo crece la misión con n personajes (1–8), con las reglas del motor si ya está cargado.
  function dificultadPara(id, n) {
    const def = LISTA.find(m => m.id === Number(id));
    const M = raiz.BrigadaMotor;
    if (!def || !M) return null;
    const k = Math.max(1, Math.min(8, Math.round(Number(n) || 1)));
    const esc = M.escala(k);
    const enemigos = def.enemigos.reduce((s, _e, i) => s + 1 + M.copiasExtra(i, k), 0);
    const vida = t => (t ? Math.round(M.JEFES[t.tipo].hp * esc.jefe) : 0);
    return { n: k, enemigos, vidaEnemigos: esc.enemigo, vidaMinijefe: vida(def.minijefe), vidaJefe: vida(def.jefe) };
  }

  raiz.BrigadaMisiones = { LISTA, SUELO, ANIMALES, porId: id => LISTA.find(m => m.id === Number(id)) || null, dificultadPara };
})(typeof window !== 'undefined' ? window : globalThis);
