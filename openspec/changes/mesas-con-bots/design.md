## Decisions

- **Tabla en los dos lados.** El servidor de producción no carga archivos de `juegos/`, así que la tabla se repite en
  `server/salas.ts` y en `juegos/mesas.js`. La prueba `server/mesas_test.ts` importa los dos y exige que sean iguales.
- **Cálculo al vuelo.** `participantes()` calcula los bots en cada pintado con `Mesas.botsEnMesa`. Cuando entra una
  persona, el bot sale solo, sin guardar nada.
- **Mínimo para empezar.** El servidor valida `min` con `enMesa`, que cuenta personas y bots.
