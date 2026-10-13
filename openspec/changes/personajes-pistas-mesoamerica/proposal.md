## Why

El profe pidió: «inventa 4 personajes más estilo Mario Kart y aumenta 4 escenarios más, estilo civilizaciones
mexicanas los escenarios». Hoy Arcade tiene 4 personajes (cambio `personajes-xalli`: Xalli, Itzae, Yahui y
Xochiquetzal) y Karts Turbo tiene 4 pistas genéricas (pradera, desierto, hielo y volcán) con una sola copa. Faltan
siluetas y personalidades contrastadas al estilo de los juegos de carreras de karts (uno chico y rápido, uno grande y
fuerte, uno chistoso y uno astuto) y escenarios con identidad mexicana.

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
  - Dibujados en código al nivel de los actuales: en Axo todas las poses (quieto, caminar, saltar, caer, daño,
    perder, festejo) y las variantes de champiñón y chile; en Karts el piloto de espaldas en su kart con sus colores
    y su estela de turbo.
  - **Peso estilo karts (ligero, medio, pesado) para los 8**: se muestra en el selector y solo cambia los choques
    entre karts (el pesado empuja más y lo mueven menos). **No cambia aceleración, velocidad, tiempos, puntos ni
    ranking**, así que nadie tiene ventaja (ver `design.md`).
  - **Selectores con 8** en Axo y en Karts: rejilla de 4×2 con retrato y nombre, y una línea con el título, la
    personalidad y el peso del elegido; caben sin desplazamiento lateral desde 320 px. Los bots usan a los 7 que la
    persona no eligió.
- **4 pistas nuevas** inspiradas en civilizaciones de México, cada una con trazado propio, paleta, cielo de 360° con su
  silueta, objetos de escenario, minimapa, nombre y descripción corta:
  1. **Calzadas de Tenochtitlan** (mexica): calzadas sobre el lago, canales, chinampas, trajineras y el Templo Mayor en
     el horizonte. Mecánica: **flechas turbo** sobre la calzada; fuera del camino es agua (frena mucho).
  2. **Calzada de los Muertos** (Teotihuacan): la gran recta entre las pirámides del Sol y de la Luna. Mecánica:
     **cabezas de serpiente emplumada que se deslizan** de lado a lado sobre la calzada (obstáculo móvil determinista).
  3. **Cenote de Chichén Itzá** (maya): selva, El Castillo al fondo y cancha del juego de pelota. Mecánica: **rampa con
     salto sobre el cenote** (aterrizas con mini-turbo) y anillo de la cancha que da turbo.
  4. **Selva de La Venta** (olmeca): selva húmeda, cabezas colosales a la orilla y ríos. Mecánica: **charcos de lodo**
     que frenan.
- **Copa Mesoamericana** (🏺) con las 4 pistas nuevas, además de la Copa Fiesta; misma tabla de puntos, bono y piezas.
  Récords y copas se guardan como el resto (el validador del servidor ya acepta los ids nuevos).
- **Salas:** las pistas nuevas entran a la lista de mapas (`server/carreras.ts`), que se compara en una prueba con
  `juegos/arcade.js` para no desfasarse.
- **Fuente única:** pistas y copas en `juegos/arcade.js` (`PISTAS`, `COPAS`); escenario, cielo y mecánicas de las
  pistas nuevas en el módulo nuevo `juegos/karts-pistas.js`; personajes en `juegos/personajes.js`. `karts.html` solo
  recibe ganchos chicos (para no chocar con el sprint 27, que también lo modifica).
- **Pruebas:** unitarias en Deno (personajes completos, pistas cerradas y manejables, minimapa coherente, mecánicas
  deterministas) y E2E ampliadas (`e2e-karts.js`, `e2e-plataformas.js`).
- **Rendimiento:** 60 fps con CPU ×4 en cada pista nueva (medido).

Fuera de alcance: atajos, habilidades especiales por personaje, mostrar el personaje de otras personas en una sala,
cambiar la física o los puntos.

## Capabilities

### New Capabilities
<!-- Ninguna: se extiende la capability viva `juegos`. -->

### Modified Capabilities
- `juegos`: requisitos nuevos «Personajes de carreras estilo karts», «Pistas mesoamericanas de Karts» y «Copa
  Mesoamericana».

## Impact

- **Superficies:** `juegos/personajes.js`, `juegos/arcade.js`, `juegos/karts-pistas.js` (nuevo), `juegos/karts.html`,
  `juegos/plataformas.html`, `juegos.html` (solo la versión `?v=` de `arcade.js`) y `server/carreras.ts` (lista de
  mapas de sala). Sin cambios en `index.html`, `ingles.html`, `secundaria.html`, Postgres/Realtime/Auth de Supabase,
  el repo de datos ni Notion.
- **Datos personales:** ninguno. La preferencia `arcade_personaje` sigue en el navegador; el progreso de Karts guarda
  récords por pista y copas por id, con el mismo formato. Matriz de acceso sin cambios.
- **Pruebas:** `server/karts_pistas_test.ts` (nuevo), `server/carreras_test.ts`, `tests/e2e/e2e-karts.js`,
  `tests/e2e/e2e-plataformas.js`, `tests/e2e/lib/personajes.js`.
- **Acciones externas:** ninguna (Pages y Deno Deploy publican con el merge). Pendiente para el usuario: que el profe
  pruebe personajes y pistas en un celular real.
