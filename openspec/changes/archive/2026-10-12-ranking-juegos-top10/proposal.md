## Why

La pestaña «🔥 Juegos» de 🏆 Ranking muestra todos los juegos de la semana (22 esta semana), y en el celular queda
muy larga. El profe pidió dejarla en top 10.

## What Changes

- «🔥 Juegos» muestra el top 10.
- Si hay más juegos, aparece el botón «Ver los N juegos», que despliega el resto, y después «Ver solo el top 10»,
  que lo vuelve a plegar.
- El servidor no cambia: la ruta sigue entregando la lista completa.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: «Ranking de los juegos más jugados» muestra el top 10, con la opción de ver todos.

## Impact

- `juegos.html` (`pintarRankingJuegos`) y la E2E `ranking-juegos`.
