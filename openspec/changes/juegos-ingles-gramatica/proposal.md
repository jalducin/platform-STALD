## Why

El profe quiere (Sprint 4) que los juegos de inglés practiquen lo visto en clase en las semanas 1 a 3 y que los
alumnos y alumnas «se vayan calando» con cada tiempo verbal:
- verbo to be (am / is / are y was / were);
- presente simple (la -s de he / she / it, don't / doesn't, Do / Does…?);
- pasado simple (regulares con -ed, irregulares, didn't / Did…?);
- futuro con will (will + verbo base, won't, Will…?).

Hoy `ingles.json` tiene pocas frases por tiempo (14 de to be, 13 de presente simple y ninguna de pasado ni de
futuro), las oraciones no tienen tema y, al fallar, el juego solo dice cuál era la respuesta, sin la regla.

## What Changes

- **Más contenido con tema** en `juegos/datos/ingles.json`:
  - `verbos`: al menos 40 frases por tema (`to be`, `to be pasado`, `presente simple`, `pasado simple` y
    `futuro will`), con los verbos nuevos de clase (open, close, start, finish, learn, teach, swim, sing, wear,
    find), más frases de demostrativos y adjetivos;
  - `oraciones` y `preguntas`: ejemplos de esos tiempos; cada oración lleva `tema`;
  - clave nueva `tiempos`: oraciones con sus tres formas (presente, pasado y futuro) para la Máquina del tiempo.
- **Selector de tema** (Todo · To be · Presente · Pasado · Futuro (will)):
  - en solitario, al abrir 🧩 Completa y responde (`en-frases`) y 🔀 Ordena la oración (`en-ordena`);
  - en partida, al crear una sala de `en-frases`: el tema viaja en `opciones.tema` y el servidor lo valida.
- **Juego nuevo ⏳ Máquina del tiempo** (`en-tiempos`), en categoría Inglés:
  - ve una oración, elige si está en pasado, presente o futuro y luego elige cómo queda en el tiempo que se pide;
  - 90 s contra reloj con racha, explicación breve en cada error y, al final, lo que más falló;
  - en solitario y en partida (con bots y amigos), con las mismas reglas de puntos que `en-frases`.
- **Retroalimentación didáctica**: en los juegos de gramática, cada error muestra la regla corta (por ejemplo «Con
  he / she / it el verbo lleva -s»), en solitario y en la revelación de la partida, sin alargar el juego.

## Capabilities

### Modified Capabilities
- `juegos`: contenido de inglés por tema, selector de tema, Máquina del tiempo y reglas al fallar.

## Impact

- Superficies: `juegos.html` (cambios puntuales), archivo nuevo `juegos/ingles-gramatica.js`,
  `juegos/datos/ingles.json` y servidor Deno (`server/salas.ts`: `JUEGOS_PARTIDA` y `opciones.tema`;
  `server/juegos.ts`: catálogo con `en-tiempos`).
- Sin cambios en Postgres, Realtime, Auth, el repo privado de datos ni Notion. No toca `ingles/` ni `server/motor.ts`.
- Datos personales: ninguno. El contenido es público y no usa nombres de alumnos ni alumnas reales.
- Pruebas: prueba de forma de `ingles.json`, pruebas de salas (tema), E2E nueva `e2e-juegos-ingles` y ajuste de
  los conteos del menú (21 → 22 juegos) en los E2E existentes.
- Documentación: `docs/data-model.md` (formato de `ingles.json`), `docs/frontend-standards.md` y
  `docs/backend-standards.md`.
- Acciones externas: ninguna (Deno Deploy y Pages publican con el merge a `main`, que hace el usuario).
