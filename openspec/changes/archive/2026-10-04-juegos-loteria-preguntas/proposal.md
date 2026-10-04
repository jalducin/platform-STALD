## Why

El usuario pidió (2026-09-30):
- que **Lotería** también se pueda jugar en partida;
- un juego de Inglés nuevo en el que se responda con **opción múltiple a una pregunta en inglés**;
- renombrar los bots a **BOT-VACHIRA** y **BOT-ISAGII**.

## What Changes

- **Juego nuevo "Responde en inglés"** (`en-preguntas`), en solitario y en partida:
  - pregunta en inglés con 4 respuestas en inglés, de las que una es la respuesta natural (p. ej. "How old
    are you?" → "I am twelve.");
  - la traducción de la pregunta sale como apoyo;
  - 124 preguntas A1 en 11 temas: `juegos/datos/ingles.json` → `preguntas[]`.
- **Lotería en partida:**
  - todos oyen y ven las mismas cartas al mismo tiempo, cantadas por reloj;
  - cada quien tiene su propia tabla, generada con la semilla y su id;
  - al crear se elige el modo: Línea o Tabla llena;
  - gana el primer "¡Lotería!" válido, incluidos los bots, que gritan 1.5 s después de completar;
  - al ganar, la partida termina para todos;
  - podio: 300/500 + bono para quien gana, 10 por casilla cantada para los demás.
- **Bots renombrados:** "BOT-VACHIRA" (60 % de acierto) y "BOT-ISAGII" (45 %).
- **Servidor:**
  - `en-preguntas` en el catálogo (tope 2000);
  - `en-preguntas` y `loteria` como juegos de partida;
  - `opciones.modo` (`linea` o `llena`);
  - `respuesta` acepta `{ loteria: true }` y guarda la hora del servidor, solo la primera vez.

## Capabilities

### Modified Capabilities
- `juegos`: "Responde en inglés", Lotería en partida y nombres de bots.

## Impact

- **Superficies:** `juegos.html`, `juegos/datos/ingles.json`, `server/juegos.ts` y `server/salas.ts`.
- **Acciones externas:** redeploy de Deno y Pages al hacer merge (el agente verifica y limpia los datos de
  prueba).

## Matriz de acceso

Sin cambios respecto a `juegos-partidas`.
