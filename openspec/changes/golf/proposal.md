## Why

El profe pidió un golf para 🕹️ Arcade. Los alumnos y las alumnas juegan sobre todo en el celular y el profe se quejó
de los controles de otros juegos, así que el golf tiene que poderse jugar cómodo con el dedo, con un mando o con el
teclado, y ser divertido para niños, niñas y adolescentes. Se agrega **⛳ Golf**, un minigolf con arte propio y sin
marcas, para jugar solo (recorrido de 9 hoyos con avance guardado) o en sala con compañeros y compañeras (de 2 a 4
personas, por turnos).

## What Changes

- **⛳ Golf** (`golf`, `juegos/golf.html` + `juegos/golf-motor.js`): minigolf con vista desde arriba en canvas.
  - **9 hoyos hechos a mano**, de menor a mayor dificultad, cada uno con su par: paredes y bandas para rebotar,
    pendientes y rampas, arena que frena la pelota, agua que la regresa con un golpe de castigo, un obstáculo que se
    mueve (molino y compuerta) y túneles mágicos (teletransportadores).
  - **Mapa:** la cámara sigue a la pelota cuando el hoyo no cabe en la pantalla y hay un minimapa del hoyo (tocarlo
    alterna la vista completa). En horizontal el hoyo se dibuja acostado para aprovechar la pantalla.
  - **Controles pensados para el celular:** jalar hacia atrás desde cualquier parte como resortera (línea guía con
    la trayectoria estimada y fuerza en número), ajuste fino de la mira con ⟲ ⟳, fuerza − / + y un botón grande
    «⛳ GOLPEAR». Opcional «🎮 Mando clásico» (`juegos/mando.js`): cruceta apunta, L/R ajuste fino, X/Y fuerza,
    A golpea y START pausa. Teclado: ← → apuntan, ↑ ↓ fuerza y Espacio golpea. El control elegido se recuerda.
  - **Puntuación:** resultado por hoyo (hoyo en uno, águila, birdie, par, bogey, doble bogey…), tarjeta final del
    recorrido, puntos por hoyo para ⭐ individuales con tope del catálogo (1000) y **avance guardado** (mejor
    resultado y estrellas por hoyo, recorridos completos y mejor recorrido) en `/juegos/progreso/golf`.
  - **Sala de 2 a 4 personas por turnos:** cada quien manda su tiro `{ angulo, fuerza }` y todos los aparatos lo
    simulan igual con el motor determinista; se juegan 3 hoyos elegidos con la semilla de la sala (uno fácil, uno
    medio y uno difícil). Tiro automático si alguien no tira en 30 s. Podio con `pintarFinalSala`, tarjeta de la sala
    y revancha. Sin bots (decisión en `design.md`).
  - Accesible: `prefers-reduced-motion`, textos y botones legibles y se juega desde 320 px de ancho, en vertical y
    en horizontal.
- **`juegos/fisica.js`:** sin cambios de comportamiento (el golf reutiliza `senCos`, `atan2Dec`, `rng`, `q`,
  `acotar`, `distSeg` y `linea`). **`juegos/mesa-ui.js`:** sin cambios (se reutilizan `tactil`, `crearAcciones`,
  `crearSala` y los mensajes).
- **Servidor** (`server/salas.ts`, `server/juegos.ts`, `server/progreso.ts`): `golf` en `JUEGOS_PARTIDA`;
  `validarJugada` para `{ n, accion: "tiro", angulo, fuerza }` y `rendirse`; `partida_terminada` como en Futbolito
  y Billar; mesa `{ max: 4, min: 2, bots: "nunca" }` (igual en `juegos/mesas.js`); catálogo «Golf» en Arcade con tope
  1000; progreso `golf` con forma exacta.
- **`juegos.html`** (cambios chicos marcados `// golf`): tarjeta en Arcade (`jugarArcade('golf')`, con avance), alta
  en partidas por turnos de física (`FISICA`, `JUEGOS_PARTIDA`, `TIEMPO_REAL`), mesa de hasta 4 en
  `pintarFisicaSala`, la tarjeta de golpes debajo del podio y la nota «sin bots» al crear la sala.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisitos nuevos de Golf (hoyos, controles, puntuación y avance, sala por turnos y calidad) y el
  requisito de progreso individual incluye `golf`.

## Impact

- **Superficies:** `juegos.html`, `juegos/golf.html`, `juegos/golf-motor.js`, `juegos/mesas.js`, servidor Deno
  (`server/salas.ts`, `server/juegos.ts`, `server/progreso.ts`). No toca `index.html`, `ingles.html`,
  `secundaria.html`, `juegos/fisica.js`, `juegos/mesa-ui.js`, Notion, Postgres `stald_*`, Supabase Auth ni Realtime.
- **Datos:** repo privado de datos: `juegos/progreso/golf/<id-jugador>.json` (`{ v, datos, actualizado }`, sin
  correos) y, en sala, las jugadas como los demás juegos por turnos (`juegos/salas/<código>/<id>.json`, `jugadas[]`).
  **Matriz de acceso:** igual que los demás juegos de Arcade y de sala: cada jugador lee y escribe solo su progreso
  (el id sale de la sesión; ni el admin lee el de otra persona); en sala cada jugador escribe solo su archivo y solo
  los jugadores de la sala (y el admin) la leen. Se verifica con `server/golf_test.ts`.
- **Pruebas:** Deno (`server/golf_test.ts`: sala, validación de jugadas, fin de partida, mesas, catálogo y progreso;
  `server/golf_motor_test.ts`: física, mecánicas de cada hoyo, determinismo, cada hoyo se puede terminar, puntuación
  y línea de turnos) y E2E `tests/e2e/e2e-golf.js` (toques reales, mando, teclado, hoyo completo, tarjeta, avance
  guardado, sala de 2 personas con podio y capturas a 320, 390 y 844×390).
- **Acciones externas** (usuario, tras el merge): publicación en GitHub Pages y Deno Deploy (merge a `main`) y
  prueba en un celular real.
