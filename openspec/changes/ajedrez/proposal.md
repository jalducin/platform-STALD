## Why

El profe pidió ajedrez de dos formas: individual contra el bot y en partida 1 vs 1. Es el Sprint 3 de juegos.

## What Changes

- **Motor de ajedrez** `juegos/ajedrez.js`, sin DOM; lo usan la página y las pruebas de Deno.
  - Jugadas legales completas: enroque, captura al paso, coronación y prohibición de dejar al rey en jaque.
  - Detección de jaque, jaque mate, ahogado y tablas (50 jugadas, triple repetición y material insuficiente).
  - Notación algebraica en español: R rey, D dama, T torre, A alfil, C caballo; `O-O`, `x`, `+` y `#`.
  - Bot con 3 niveles: 🐣 Fácil (1 jugada con azar), 🦊 Medio (2 jugadas) y 🦉 Difícil (3 jugadas y capturas en
    quietud). Evalúa material y posición de las piezas, con poda alfa-beta.
- **Individual (Mente ágil → ♟️ Ajedrez):**
  - eliges nivel y color (blancas, negras o al azar);
  - tablero que se voltea si juegas con negras;
  - jugadas posibles resaltadas, última jugada y jaque marcados;
  - lista de jugadas y piezas capturadas;
  - botón para rendirse.
  - Puntos por ganar: 400, 700 o 1000 según el nivel. Tablas valen la mitad. Si pierdes, 10 por punto de material
    capturado, con tope de 200.
- **En partida 1 vs 1** (👥 Partidas):
  - juegan los 2 primeros participantes; si no hay un segundo humano, juega el bot nivel Medio;
  - blancas para quien creó la sala;
  - reloj por jugador de 5, 10 o 15 min; quien se queda sin tiempo pierde;
  - jugada `{ n, accion: 'mover', de, a, promo? }` o `{ n, accion: 'rendirse' }`;
  - todos reconstruyen la partida desde las jugadas.
  - Puntos: ganar 800, +200 si es por mate; tablas 400; perder, 10 por punto de material capturado (tope 300).
- **📖 Cómo se juega:** cómo mueve cada pieza, enroque, captura al paso, coronación, jaque, mate, tablas y reloj.

## Capabilities

### Modified Capabilities
- `juegos`: ajedrez individual y en partida.

## Impact

- Archivos nuevos: `juegos/ajedrez.js` y `server/ajedrez_test.ts`.
- Archivos que cambian:
  - `juegos.html`;
  - `server/juegos.ts`: catálogo `ajedrez`, categoría `mente`, máx. 1000;
  - `server/salas.ts`: validación de la jugada y opción `reloj`.
- Documentación: `docs/frontend-standards.md`, `docs/backend-standards.md` y `docs/data-model.md`.
