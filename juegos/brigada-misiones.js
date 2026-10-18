// Misiones de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §5). Sin DOM: lo cargan juegos/brigada.html y
// el servidor (server/brigada.ts) junto con juegos/brigada-motor.js.
// Unidades en píxeles nativos; la ventana de juego mide 480 × 270 y el suelo base está en y = 230 (y crece hacia abajo).
//   suelo        [[x0, x1, y], …] continuo de 0 a `largo` (sin fosos: nadie muere por caer)
//   plataformas  [[x0, x1, y], …] de un solo sentido
//   puntosControl x donde se guarda el reintento (el motor agrega uno antes de cada minijefe y del jefe)
//   enemigos     [[x, tipo, y?], …] aparecen cuando la cámara llega a x (y: altura de vuelo o de la plataforma)
//   jaulas       [[x, animal, y?], …] animalitos que se rescatan
//   objetos      [[x, tipo, y?], …] premios flotando
//   vehiculos    [[x], …] Armadillos estacionados
//   minijefe / jefe  { x (inicio de la arena, la cámara se fija ahí), tipo }
(function (raiz) {
  'use strict';
  const SUELO = 230;
  const ANIMALES = ['ajolotito', 'xolito', 'guacamaya', 'tortuguita', 'conejito', 'colibri'];
  const LETRA = { p: 'patrulla', d: 'dron', t: 'torreta', s: 'saltabot', e: 'escudobot', a: 'alien' };
  const VUELO = [118, 134, 104, 126];

  // Oleadas: de `desde` a `hasta` cada `paso` px, con los tipos del patrón en orden (desplazamiento fijo por índice,
  // sin azar: el nivel es el mismo para todos). Se salta lo que caiga dentro de una arena.
  function oleadas(desde, hasta, paso, patron, saltar) {
    const fuera = [];
    for (let k = 0, x = desde; x <= hasta; k++, x = desde + k * paso) {
      const xx = x + ((k * 37) % 23) - 11;
      if ((saltar || []).some(([a, b]) => xx >= a && xx <= b)) continue;
      const tipo = LETRA[patron[k % patron.length]];
      fuera.push(tipo === 'dron' ? [xx, tipo, VUELO[k % VUELO.length]] : [xx, tipo]);
    }
    return fuera;
  }
  // Suelo a partir de cortes [x, y]: cada tramo va del corte al siguiente.
  function suelo(cortes, largo) {
    return cortes.map(([x, y], i) => [x, i + 1 < cortes.length ? cortes[i + 1][0] : largo, y]);
  }
  const jaulas = (xs, ys) => xs.map((x, i) => (ys && ys[i] ? [x, ANIMALES[i % ANIMALES.length], ys[i]] : [x, ANIMALES[i % ANIMALES.length]]));
  function mision(o) {
    const largo = o.jefe.x + 480;
    return { ...o, largo, suelo: suelo(o.cortes, largo), cortes: undefined };
  }

  const LISTA = [
    mision({
      id: 1, clave: 'selva', nombre: 'Selva de Ceibas', emoji: '🌳', tiempoMeta: 200,
      lema: 'Unos robots tragahojas quieren llevarse las ceibas. ¡Rescata a los animalitos!',
      cortes: [[0, SUELO], [560, 216], [820, SUELO], [1180, 222], [1380, SUELO], [1760, 210], [1960, 222], [2240, SUELO]],
      plataformas: [[620, 720, 168], [1200, 1300, 172], [1500, 1610, 176], [2020, 2140, 164], [2560, 2680, 176]],
      puntosControl: [1640],
      enemigos: [...oleadas(470, 2950, 96, 'pdspdtpsd'), [1250, 'torreta', 172]],
      jaulas: jaulas([680, 1440, 2080, 2520, 2900], [168, 0, 164, 0, 0]),
      objetos: [[900, 'rafaga'], [1560, 'globos', 150], [2330, 'abanico'], [2760, 'estrella', 150], [3000, 'corazon']],
      vehiculos: [],
      minijefe: null,
      jefe: { x: 3120, tipo: 'tractor' },
    }),
    mision({
      id: 2, clave: 'desierto', nombre: 'Desierto de Saguaros', emoji: '🌵', tiempoMeta: 260,
      lema: 'Una excavadora y un escorpión de hojalata asustan al pueblito de adobe.',
      cortes: [[0, SUELO], [500, 220], [760, SUELO], [1240, 214], [1500, 224], [1700, SUELO], [2500, 212], [2700, 224], [2960, SUELO], [3300, 218], [3480, SUELO]],
      plataformas: [[560, 680, 170], [1260, 1380, 160], [2560, 2660, 160], [3060, 3180, 172], [3350, 3450, 166]],
      puntosControl: [1450, 2900],
      enemigos: [...oleadas(450, 3560, 86, 'pdtspedps', [[1850, 2420]]), [1320, 'torreta', 160], [3110, 'torreta', 172]],
      jaulas: jaulas([620, 1300, 2150, 2610, 3120, 3400], [170, 160, 0, 160, 0, 166]),
      objetos: [[820, 'rafaga'], [1560, 'escudo'], [2480, 'laser'], [2840, 'globos'], [3240, 'estrella', 140], [3600, 'corazon']],
      vehiculos: [[980]],
      minijefe: { x: 1900, tipo: 'excavadora' },
      jefe: { x: 3720, tipo: 'escorpion' },
    }),
    mision({
      id: 3, clave: 'ciudad', nombre: 'Ciudad de Colores', emoji: '🏙️', tiempoMeta: 290,
      lema: 'Un dirigible antena cubrió el cielo de la ciudad. ¡Libera las calles!',
      cortes: [[0, SUELO], [420, 218], [640, SUELO], [1000, 206], [1180, 220], [1400, SUELO], [2700, 214], [2900, SUELO], [3250, 208], [3460, 222], [3700, SUELO]],
      plataformas: [[450, 600, 166], [1020, 1150, 150], [1560, 1700, 170], [2760, 2880, 160], [3000, 3140, 172], [3280, 3420, 150], [3800, 3920, 170]],
      puntosControl: [1500, 3050],
      enemigos: [...oleadas(420, 3980, 78, 'pdeptdsed', [[2120, 2620]]), [1080, 'torreta', 150], [3350, 'torreta', 150], [3860, 'torreta', 170]],
      jaulas: jaulas([520, 1080, 1630, 2820, 3340, 3860], [166, 150, 170, 160, 150, 0]),
      objetos: [[760, 'laser'], [1450, 'globos'], [2000, 'escudo'], [2740, 'rafaga'], [3200, 'abanico'], [3560, 'estrella', 140], [4000, 'corazon']],
      vehiculos: [[1250]],
      minijefe: { x: 2140, tipo: 'grua' },
      jefe: { x: 4120, tipo: 'antenon' },
    }),
    mision({
      id: 4, clave: 'estacion', nombre: 'Estación Orbital', emoji: '🛰️', tiempoMeta: 320,
      lema: 'La Reina Nodriza aterrizó en la estación. ¡Última misión de la brigada!',
      cortes: [[0, SUELO], [480, 214], [720, SUELO], [1100, 206], [1320, 222], [1600, SUELO], [2900, 210], [3140, 224], [3400, SUELO], [3800, 212], [4000, SUELO]],
      plataformas: [[520, 660, 160], [1120, 1260, 150], [1700, 1840, 168], [2960, 3080, 156], [3460, 3600, 168], [3840, 3960, 150], [4200, 4330, 170]],
      puntosControl: [1650, 3300],
      enemigos: [...oleadas(420, 4420, 72, 'adeatdpsa', [[2300, 2820]]), [1190, 'torreta', 150], [3020, 'torreta', 156], [3900, 'torreta', 150]],
      jaulas: jaulas([590, 1190, 1770, 3020, 3530, 3900, 4270], [160, 150, 168, 156, 168, 150, 170]),
      objetos: [[820, 'laser'], [1400, 'escudo'], [2100, 'globos'], [2860, 'rafaga'], [3300, 'abanico'], [3700, 'escudo'], [4100, 'estrella', 130], [4440, 'corazon']],
      vehiculos: [[1000]],
      minijefe: { x: 2320, tipo: 'torre' },
      jefe: { x: 4520, tipo: 'reina' },
    }),
  ];

  raiz.BrigadaMisiones = { LISTA, SUELO, ANIMALES, porId: id => LISTA.find(m => m.id === Number(id)) || null };
})(typeof window !== 'undefined' ? window : globalThis);
