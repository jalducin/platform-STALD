## Why

El profe pidió: «inventa 4 personajes más estilo Mario Kart y aumenta 4 escenarios más, estilo civilizaciones
mexicanas los escenarios». El trabajo se repartió: **este cambio hace solo los 4 personajes nuevos**; las 4 pistas
mesoamericanas y su copa van en otro cambio (otro agente, `juegos/karts-pistas.js` y la parte de circuito y escenario
de `karts.html`).

Hoy Arcade tiene 4 personajes (cambio `personajes-xalli`: Xalli, Itzae, Yahui y Xochiquetzal). Faltan siluetas y
personalidades contrastadas al estilo de los juegos de carreras de karts: uno chico y rápido, uno grande y fuerte,
uno chistoso y uno astuto.

## What Changes

- **4 personajes nuevos** en `juegos/personajes.js` (mismo universo mesoamericano e infantil, nombres inventados y
  respetuosos):
  1. **Xolo**, Guía Veloz de los Caminos: xoloitzcuintle travieso, orejas grandes y collar de jade. Chico y rápido
     (peso ligero). Partícula: huellitas.
  2. **Tlali**, Saltarina de los Valles: chapulina oaxaqueña chistosa con sombrero bordado. Peso ligero. Partícula:
     notas musicales. (La propuesta decía «Chapo»; se cambió porque en México ese apodo remite a un narcotraficante:
     no es un nombre para un juego de niñas y niños.)
  3. **Tona**, Sabia de la Costa: tortuga marina grande y fuerte con yelmo de jade y concha y orejeras de inspiración
     zapoteca. Peso pesado. Partícula: gotas de agua.
  4. **Kinich**, Estratega del Juego de Pelota: joven jugador de pelota maya, astuto, con yugo protector en la cadera,
     rodillera y pelota de hule. Peso medio. Partícula: pelotitas de hule.
- Dibujados en código al nivel de los actuales: en Axo todas las poses (quieto, caminar, saltar, caer, aterrizar,
  daño, perder, festejo) y las variantes de champiñón y chile; en Karts el piloto de espaldas en su kart con sus
  colores y su estela de turbo.
- **Peso estilo karts (ligero, medio, pesado) para los 8**: se muestra en el selector de Karts y solo cambia el reparto
  del empuje en los choques entre karts. **No cambia aceleración, velocidad, giro, tiempos, puntos ni ranking.**
- **Selectores con 8** en Axo y en Karts: rejilla de 4×2 con retrato y nombre, y una línea con el título y la
  personalidad (y el peso en Karts) del elegido; caben sin desplazamiento lateral desde 320 px. Los bots usan a los 7
  que la persona no eligió.
- **Pruebas:** unitarias en Deno (`server/personajes_test.ts`) y E2E ampliadas (`e2e-karts.js`, `e2e-plataformas.js`).

Fuera de alcance: pistas y copas nuevas (otro cambio), habilidades especiales, mostrar el personaje de otras personas
en una sala, cambiar física o puntos.

## Capabilities

### New Capabilities
<!-- Ninguna: se extiende la capability viva `juegos`. -->

### Modified Capabilities
- `juegos`: requisito nuevo «Personajes de carreras estilo karts».

## Impact

- **Superficies:** `juegos/personajes.js`, `juegos/plataformas.html` (selector y partículas) y `juegos/karts.html`
  (selector, piloto, estela y reparto del choque). Sin cambios en el servidor, `index.html`, `ingles.html`,
  `secundaria.html`, Supabase, el repo de datos ni Notion.
- **Datos personales:** ninguno. `arcade_personaje` sigue en el navegador; el progreso no cambia de forma. Matriz de
  acceso sin cambios.
- **Pruebas:** `server/personajes_test.ts` (nuevo), `tests/e2e/e2e-karts.js`, `tests/e2e/e2e-plataformas.js`,
  `tests/e2e/lib/personajes.js`.
- **Acciones externas:** ninguna. Pendiente para el usuario: que el profe pruebe los personajes en un celular real.
