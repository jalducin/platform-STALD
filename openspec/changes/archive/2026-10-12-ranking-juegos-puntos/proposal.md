## Why

En 🏆 Ranking › «🔥 Juegos», cada juego muestra «👑 Mejor puntaje: {nick}», pero no cuántos puntos hizo esa persona.
El profe pidió que se vea la cantidad.

## What Changes

- La línea queda como «👑 Mejor puntaje: {nick} · N puntos» (con separador de miles y «1 punto» en singular).
- El servidor no cambia: `mejor.puntos` ya viene en `GET /juegos/ranking/juegos`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: «Ranking de los juegos más jugados» muestra los puntos del mejor puntaje.

## Impact

- `juegos.html` (`pintarRankingJuegos`), la E2E `ranking-juegos` y `docs/frontend-standards.md`.
