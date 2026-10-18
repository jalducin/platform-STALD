## Why

El profe pidió: «que ahora sea de 3 vueltas cada carrera y no de 2». Desde el sprint 30 (karts-pistas-grandes) cada
carrera de Karts Turbo dura 2 vueltas (referencia ≈ 2:00–2:19). Con 3 vueltas la carrera dura ≈ 1.5 veces más, así que
cambian la referencia, los límites de las salas, la validación del servidor, el tiempo de los bots y el tope de los
récords; y los récords de 2 vueltas ya no se pueden comparar con los de 3.

## What Changes

- **3 vueltas en todas las carreras** (individual, copa y sala) en las 16 pistas: `vueltas: 3` en
  `juegos/karts-pistas.js` y `Arcade.VUELTAS = 3` (valor por omisión).
- **Referencia, límites y bots recalculados** a partir de las vueltas (≈ 3:00–3:29; límite de sala = 2.5 × referencia,
  mínimo = 25 %). El servidor (`server/carreras.ts`) ya los deriva de `Arcade.limitesKarts`; el tiempo de los bots de
  sala (`Arcade.tiempoBot`) y de los fantasmas sale de la referencia.
- **`RECORD_MAX_MS` de 15 a 20 min**: una carrera lenta de 3 vueltas sigue siendo récord válido y queda por encima del
  doble del mayor límite de sala; `anotarRecord` (solo anota lo que el servidor acepta) se conserva.
- **Récords versionados**: `VERSION_PISTAS` 4. Los récords de 2 vueltas pasan a `recordsV3` y se muestran como
  «2 vueltas» con un aviso corto. Se conservan copas ganadas, piezas, equipo, monedas y la copa en curso.
- **Servidor** (`server/progreso.ts`): acepta la forma nueva (`pistasV` 4 + `recordsV3`) y las de antes (pestañas
  viejas).
- **HUD**: «Vuelta 1/3», «¡Última vuelta!» y la campana de Emoción en la 3.ª (ya salen de las vueltas de la pista).

Fuera de alcance (otros agentes en paralelo): la lógica de la copa en sala y el cierre «30 s después del primero»
(43a); el cambio de control en sala y la premiación (43c).

Superficies: `juegos.html` (Arcade: `juegos/arcade.js`, `juegos/karts-pistas.js`), `juegos/karts.html`, servidor Deno
(`server/progreso.ts`, `server/carreras.ts` sin cambios de código). Sin cambios en Postgres, Realtime, Auth, repo de
datos ni Notion. Sin acciones externas (Deno Deploy y Pages publican con el merge a `main`).

Matriz de acceso: sin cambios. El avance de Karts lo lee y escribe solo su dueño (sesión verificada); el servidor solo
valida la forma.
