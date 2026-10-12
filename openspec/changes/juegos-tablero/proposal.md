## Why

El profe quiere más variedad en Juegos «para marcar la diferencia». Hoy los juegos de mesa por turnos son el ajedrez
y los de cartas. Faltan los clásicos de tablero que los alumnos y las alumnas conocen de casa: damas, dominó,
parchís y batalla naval. Todos se juegan bien en celular, por turnos, solos contra bots o con amistades en sala.

## What Changes

- **⚫ Damas** (`damas`, Mente ágil): tablero 8×8, captura obligatoria, saltos múltiples y coronación (dama).
  - Individual contra un bot de 2 niveles (🐣 Fácil y 🦊 Difícil).
  - En sala: 1 vs 1 entre personas, sin bots, con 60 s por turno.
- **🁫 Dominó** (`domino`, Clásicos): doble seis, de 2 a 4 jugadores, 7 fichas cada quien, por turnos.
  - Si no tienes ficha que embone, pasas.
  - Gana quien se queda sin fichas. Si el juego se cierra, gana quien suma menos puntos.
  - Individual contra 3 bots. En sala, con amistades y bots, hasta 4.
- **🎲 Parchís** (`parchis`, Clásicos): estilo Ludo de 2 a 4 jugadores con dado.
  - Variante elegida: sales con 5 y, si sacas 6 o comes una ficha, vuelves a tirar.
  - Tiene 8 casillas seguras, se pueden comer fichas y hay pasillo de meta con tiro exacto.
  - Individual contra bots, en partida rápida (2 fichas) o completa (4 fichas). En sala con 4 fichas.
- **🚢 Batalla naval** (`naval`, Mente ágil): dos tableros ocultos de 10×10 y flota de 5 barcos (5, 4, 3, 3 y 2).
  - Acomodo automático o manual.
  - Disparos por coordenadas A1…J10 con «agua», «tocado» y «hundido». Si tocas, vuelves a disparar.
  - Individual contra un bot que caza después de tocar.
  - En sala, 1 vs 1: **el servidor guarda las flotas, valida cada disparo y nunca entrega la flota del rival**.
- Los cuatro suman puntos con las reglas de `server/juegos.ts`: catálogo con título (ranking «🔥 Juegos») y tope 1,000.
- Todos tienen «📖 Cómo se juega», revancha «🔁 Otra con los mismos» y se ven bien a 390 px.
- El arte es propio, en CSS y SVG, con animaciones suaves que respetan `prefers-reduced-motion`.

## Capabilities

### Modified Capabilities
- `juegos`: cuatro juegos de tablero nuevos, individuales y en sala, y disparos de Batalla naval validados en el
  servidor sin revelar la flota rival.

## Impact

- **Superficies:**
  - `juegos.html`: ganchos mínimos marcados con `// juegos-tablero`.
  - Servidor Deno: `server/juegos.ts` (catálogo) y `server/salas.ts` (ganchos localizados).
  - No toca `index.html`, `ingles.html`, `secundaria.html`, Notion, Postgres `stald_*`, Supabase Auth ni Realtime
    (solo usa el canal que ya existe).
- **Archivos nuevos:**
  - `juegos/tablero.js`: motores sin DOM de Damas, Dominó, Parchís y Batalla naval.
  - `juegos/tablero-ui.js`: pantallas, bots y salas.
  - `juegos/tablero.css`.
  - `server/tablero.ts`: validación de jugadas, cupos y ocultamiento.
  - `server/naval.ts`: flotas y disparos.
  - Pruebas: `server/tablero_test.ts`, `server/naval_test.ts` y `tests/e2e/e2e-juegos-tablero.js`.
- **Datos:** sin rutas nuevas. En `juegos/salas/<código>/<id>.json` se agregan campos:
  - en Batalla naval, `flota` y `flotaT`, privados del jugador;
  - en las jugadas, `ruta`, `ficha`, `lado`, `c`, `r` y `barco`.
  - Sin correos.
- **Matriz de acceso:**
  - Las salas siguen las reglas actuales: solo sus jugadores y el admin leen la sala.
  - En Batalla naval, cada quien recibe solo su propia flota. La del rival no sale del servidor (ni en `GET`, ni en
    Realtime, ni al admin) hasta que la partida termina.
  - Del rival solo se ven los disparos con su resultado y los barcos ya hundidos.
- **Acciones externas** (usuario, tras el merge): redeploy de Deno Deploy y publicación en GitHub Pages; verificación
  en producción.
