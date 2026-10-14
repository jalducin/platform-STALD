## Why

El profe pidió: «las pistas 3 veces más grandes». Hoy cada vuelta de Karts Turbo mide de 4 000 a 4 400 px de mundo
(unos 20 s a la velocidad de referencia) y una carrera de 3 vueltas dura cerca de un minuto: se siente corta y, con
8 karts en vivo, la pista se llena. Con vueltas 3 veces más largas hay más tramos, más curvas distintas y más tiempo
para rebasar.

## What Changes

- **Trazados**: las 8 pistas se rehacen con la vuelta ≈ 3 veces más larga (2.9 a 3.0×). Cada trazado se escala
  (≈ 2.3×) y se le agregan tramos hacia el interior (lazos, eses y horquillas) para que no quede un óvalo monótono,
  conservando su forma general, su recta de meta y su carácter (praderas suaves, cañón con zigzag, hielo de curvas
  amplias, volcán sinuoso, calzadas rectas, la Calzada de los Muertos, el sacbé y la selva). El radio mínimo de cada
  pista queda igual o mayor que el de la pista original y ningún tramo se encima con otro.
- **Vueltas por pista**: 2 vueltas en las 8 pistas (campo `vueltas` en `juegos/karts-pistas.js`). Una carrera dura
  ≈ 2 a 2.3 min a la velocidad de referencia y una copa de 4 carreras ≈ 9 a 11 min (design.md §2).
- **Todo escala con la pista**: adornos (y su densidad), cajas de ítems, monedas, charcos de lava, mecánicas
  (3 trajineras en Tenochtitlan, 9 rampas en Teotihuacan, 2 saltos con cenote en Chichén Itzá, 7 zonas de lodo y
  2 tramos de cabezas colosales en La Venta), el río, el minimapa (trazo más fino y legible), los tiempos de
  referencia de los bots, el límite y el mínimo de las salas por pista, la validación de plausibilidad del servidor
  y el turbo de salida.
- **Récords versionados**: el progreso de Karts guarda `pistasV: 2`. Al abrir un progreso sin versión, los récords de
  las pistas chicas pasan a `recordsV1` (archivados, se muestran como «pista chica» en el selector) y `records`
  empieza vacío, con un aviso corto. Copas ganadas, piezas, equipo y copa en curso se conservan.
- **Rendimiento**: escenario agrupado por celdas para dibujar solo lo cercano (descarte por distancia) y textura
  del piso de hasta 12.6 M px (debajo del límite de 16.7 M px de los lienzos en iOS). Meta: 60 fps con el CPU ×4.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisitos «Karts» (vueltas por pista y récords versionados), «Carreras de Arcade en partida» (límites
  por pista) y requisito nuevo «Pistas grandes de Karts».

## Impact

- Superficies: `juegos/karts-pistas.js`, `juegos/arcade.js`, `juegos/karts.html`, `juegos/app/arcade.js`
  (`?v=` de los scripts en `juegos.html` y `karts.html`); servidor Deno (`server/carreras.ts`, `server/progreso.ts`).
- Matriz de acceso: sin cambios. El progreso de Karts sigue siendo de su dueño (solo él lo lee y escribe); los
  récords archivados son números por pista, sin datos personales.
- No se escribe en tablas `stald_`. Sin acciones externas.
