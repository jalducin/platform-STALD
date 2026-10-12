## Why

El profe quiere más variedad en Juegos «para marcar la diferencia». Los alumnos y las alumnas juegan sobre todo en
celular y piden juegos rápidos y conocidos, que se entiendan sin instrucciones largas y que se puedan jugar solos o
con sus amigos en una partida. Cinco clásicos de mesa cubren ese hueco: Gato, Conecta 4, Piedra, papel o tijera,
Ahorcado (en inglés, para reforzar vocabulario) y Serpientes y escaleras.

## What Changes

- **Cinco juegos nuevos en la categoría 🎲 Clásicos** de `juegos.html`, cada uno con modo individual y modo partida:
  - **❌⭕ Gato** (`gato`): individual contra el bot en 3 niveles (fácil al azar, medio y difícil con minimax);
    en partida, 1 vs 1 por turnos (dos personas o una contra el bot), al mejor de 3 rondas.
  - **🔴 Conecta 4** (`conecta4`): tablero de 7 × 6 con caída animada y detección de línea; individual contra el
    bot en 3 niveles (heurística y minimax a poca profundidad); en partida, 1 vs 1 (dos personas o una contra el bot).
  - **✊ Piedra, papel o tijera** (`ppt`): individual contra el bot al mejor de 5, con elección simultánea y
    revelación a la vez; en partida, de 2 a 8 jugadores (con bots si se piden), todos contra todos en 5 rondas
    con puntos.
  - **🪢 Ahorcado en inglés** (`ahorcado`): palabras de `juegos/datos/ingles.json` con pista en español y emoji;
    en lugar de un ahorcado, un globo que se desinfla (sin violencia). Individual de 5 palabras; en partida,
    cooperativo o competitivo por turnos, con las mismas palabras para todos y puntos por letra acertada.
  - **🐍 Serpientes y escaleras** (`serpientes`): tablero de 100 casillas con dado animado, de 2 a 4 jugadores;
    individual contra 1 a 3 bots; en partida, con amigos y bots.
- **Reglas en un módulo propio sin DOM** (`juegos/clasicos-rapidos.js`), igual que `juegos/ajedrez.js`: lo usan la
  página y las pruebas de Deno. La interfaz vive en `juegos/clasicos-rapidos-ui.js` y su estilo en
  `juegos/clasicos-rapidos.css`; `juegos.html` solo recibe ganchos mínimos marcados con `// clasicos-rapidos`.
- **Servidor:** los 5 ids entran a `JUEGOS_PARTIDA` y al `CATALOGO` (categoría `clasicos`, tope 1000). Un módulo
  nuevo `server/clasicos_rapidos.ts` valida cada jugada (formato y campos permitidos) y el modo del Ahorcado, y oculta la
  elección de Piedra, papel o tijera de las demás personas hasta que cada quien eligió o la ronda está completa.
- Las mesas siguen la tabla común `MESAS` (cambio `mesas-con-bots`): Gato y Conecta 4 de 2 (dos personas o una
  contra el bot), Piedra, papel o tijera de 4 asientos (hasta 8), Ahorcado hasta 8 y Serpientes de 4 asientos.
- La revancha («🔁 Otra con los mismos») y el podio funcionan igual que en los demás juegos de sala.

## Capabilities

### Modified Capabilities
- `juegos`: cinco juegos clásicos nuevos, individuales y en partida.

## Impact

- **Superficies:** `juegos.html` (ganchos: catálogo, lista de juegos de partida, sondeo en tiempo real, dibujo de la
  sala, opciones al crear, ayuda) y el servidor Deno (`server/salas.ts` con sus renglones en `MESAS` y `juegos/mesas.js`, `server/juegos.ts` y el nuevo
  `server/clasicos_rapidos.ts`). No toca `index.html`, `ingles.html`, `secundaria.html`, Notion, Postgres `stald_*`
  ni Supabase Auth/Realtime (Realtime publica el mismo estado, con las elecciones ocultas).
- **Archivos nuevos:** `juegos/clasicos-rapidos.js`, `juegos/clasicos-rapidos-ui.js`, `juegos/clasicos-rapidos.css`,
  `server/clasicos_rapidos.ts`, pruebas `server/clasicos_rapidos_test.ts` y `server/clasicos_rapidos_motor_test.ts`,
  E2E `tests/e2e/e2e-clasicos-rapidos.js`.
- **Datos:** sin formatos nuevos de almacenamiento. Las jugadas usan el arreglo `jugadas[]` del jugador en la sala con
  campos nuevos (`casilla`, `col`, `eleccion`, `letra`); los puntos usan `POST /juegos/partida` como siempre. Sin
  correos.
- **Matriz de acceso:** igual que las demás salas: solo quien está dentro ve y juega su sala; el admin puede verla.
  En Piedra, papel o tijera nadie ve la elección de otra persona de una ronda hasta haber elegido en esa ronda (o
  hasta que todas las personas eligieron); la vista del canal de Realtime la oculta mientras la ronda no esté completa.
- **Acciones externas** (usuario, tras el merge): redeploy de Deno Deploy y publicación en GitHub Pages; verificación
  en producción.
