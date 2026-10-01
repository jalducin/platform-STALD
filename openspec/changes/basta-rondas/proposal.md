## Why

El usuario pidió (2026-09-30) que **Basta en partida tenga 10 rondas** ("eso es importante"). Hoy una
partida de Basta es una sola letra: termina en un minuto y no da para una clase.

## What Changes

- **Rondas configurables** al crear una partida de Basta (`basta-es` o `basta-en`): 5, 10 (por defecto) o
  12.
- **Una letra distinta por ronda**, la misma para todos (sale de la semilla de la sala).
- **Ciclo de cada ronda:** escribir (60 s o hasta 3 s después del primer "¡Basta!") → resultados de la
  ronda con el marcador acumulado (10 s) → siguiente letra.
- **Puntos acumulados:** al final, podio con el total de todas las rondas y una tabla de puntos por ronda.
- **Bots:** juegan cada ronda con su propia semilla por ronda.
- **Servidor:**
  - `opciones.rondas` ∈ {5, 10, 12} (solo Basta; por defecto 10; otro valor → 400 `rondas_invalidas`);
  - `respuesta` de Basta acepta `ronda` (0 … rondas−1) y guarda `rondasBasta[ronda] = { palabras, basta? }`
    (el primer "¡Basta!" de cada ronda con la hora del servidor);
  - el tope de `final` y del podio sube de 3000 a 10000 (10–12 rondas suman más).
- **Ranking semanal:** sin cambio de tope; la partida suma como máximo el tope del catálogo (1500), para
  que una partida larga no desbalancee el ranking. El podio de la sala sí muestra el total completo.

## Capabilities

### Modified Capabilities
- `juegos`: Basta en partida por rondas.

## Impact

- `server/salas.ts`, `juegos.html`, pruebas `server/salas_test.ts` y E2E.
- Salas creadas antes del cambio (sin `rondas`) se juegan como 1 ronda.
- Acciones externas: redeploy al hacer merge; verificación en producción y borrado de las salas de prueba.

## Matriz de acceso

Sin cambios: cada jugador escribe solo su archivo de sala; solo el anfitrión empieza.
