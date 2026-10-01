## Why

Ticket del profe (2026-10-01): **"no está sumando los puntos"**. La regla actual suma solo **el mejor puntaje de
cada juego**. Por eso, volver a jugar sin superar el récord no cambia el total. Ejemplo real: Sofy jugó Simón
dice 10 veces y solo cuenta 1,200; su total es 9,669, aunque sus partidas suman 26,991.

Decisión del profe: **todo suma, pero separado por tipo de juego**: individuales por un lado y partidas
(varios jugadores) por otro.

## What Changes

- **Dos puntajes semanales por jugador:**
  - **⭐ Individuales**: suma de **todas** las partidas de juegos individuales;
  - **👥 Partidas**: suma de **todas** las partidas multijugador (salas).
  - `mejores` (el récord por juego) se conserva para el aviso de "nuevo récord" y las insignias del hub.
- **Servidor** (`server/juegos.ts`):
  - `POST /juegos/partida` acepta `sala` (código). El servidor comprueba que la sala exista, que sea de ese
    juego, que ya haya empezado y que el jugador esté en ella. Además, solo se guarda una vez por sala y
    jugador (409 `ya_guardada`).
  - Las de sala se guardan con `modo: "sala"` y tope de 10,000 (como el total final de la sala). Las
    individuales mantienen el tope del catálogo.
  - Los totales se calculan desde el historial (`totalIndividual`, `totalPartidas`, `total` = ambos).
    El historial guarda hasta 1,000 partidas por semana (antes 300), suficiente con el límite de 100 al día.
  - `GET /juegos/ranking?tipo=individual|partidas` (por defecto individual) ordena por ese puntaje.
  - `/yo` y `/admin/resumen` traen los dos totales.
- **Página de Juegos:**
  - el chip muestra "⭐ individuales · 👥 partidas";
  - el resultado dice cuánto sumó y a qué puntaje;
  - el ranking tiene dos pestañas (⭐ Individuales / 👥 Partidas);
  - las partidas se guardan con su código de sala.
- **Vista de admin de Inglés:** "🎮 Juegos de la semana" muestra los dos totales.
- **Datos de esta semana:** un script marca como `sala` las partidas que vinieron de salas. Busca primero el
  `final` de la sala y, si no lo hay, el mismo juego dentro de 30 min desde el inicio: 3 de Sofy y 8 del
  profe. Lo demás queda como individual.

## Capabilities

### Modified Capabilities
- `juegos`: puntaje semanal acumulado por tipo (individual / partidas).

## Impact

- `server/juegos.ts`, `juegos.html`, `ingles.html`; pruebas `server/juegos_test.ts`.
- Repo de datos: migración de `juegos/semanas/2026-09-28/*.json`, con respaldo en el historial de git.
- Acciones externas: redeploy, la migración y verificación en producción.
