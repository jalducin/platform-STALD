## Context

- Copa individual: `juegos/karts.html` suma los puntos de cada carrera en `prog.copaEnCurso` y manda el avance a
  `juegos.html`, que lo guarda con `PUT /juegos/progreso/karts` (`canalProgreso`, versión `v`). El servidor valida la
  forma exacta (`validarKarts`); si algo no cuadra, rechaza todo el documento (`400 progreso_invalido`).
- `tCarrera` es el reloj de pared desde el «¡YA!» (la pausa lo detiene; la pestaña oculta no). Una carrera puede pasar
  de 15 min aunque la física se detenga con la pestaña oculta.
- Copa en sala: la página manda `{ copa: { carrera, ms, monedas } }` a `/juegos/sala/<código>/respuesta` y el
  servidor valida el tiempo contra su reloj (`validarCarrera`).

## Decisions

### 1. Una sola fuente para las reglas de la copa y de los récords

`KartsPistas` (ya lo importan `server/carreras.ts` y `server/karts_copa.ts`) define `PUNTOS_CARRERA`,
`PUNTOS_COPA_MAX = PUNTOS_CARRERA[0] × (pistas de la copa más larga)`, `RECORD_MIN_MS`/`RECORD_MAX_MS`, `copaNueva`,
`anotarRecord` y `sumarCarreraCopa`. `server/progreso.ts` importa `juegos/karts-pistas.js` y valida con esos valores.
`karts-pistas.js` se carga antes que `arcade.js`, así que no puede leer `Arcade.PUNTOS_COPA`; la prueba de Deno exige
que ambas listas sean iguales.

Alternativa descartada: subir el tope del servidor. Un récord de 20 min no es un récord útil y el tope protege el
documento; lo correcto es que el juego no lo anote.

### 2. Copas válidas = las de `KartsPistas.COPAS`

Antes el id era cualquier `[a-z]{2,12}` y había ≤ 8 copas. Ahora solo los ids definidos y ≤ `COPAS.length`. Los
avances guardados solo contienen copas que existen (el juego nunca crea otras).

### 3. Los rechazos se ven

`canalProgreso` manda al juego el motivo (`error`); el juego avisa 4.5 s y lo deja en `#res-guardado`. En la copa en
sala, `avisoRechazo` traduce el error del servidor y lo manda al juego como `{ tipo: 'aviso', texto }`.

### 4. No se relaja la forma de pestañas viejas

Una pestaña con el juego de la versión 2 que lee un avance de la versión 3 lo manda con `pistasV: 2` + `recordsV2` y,
además, mueve los récords a `recordsV1` por error. Se sigue rechazando (protege los récords); ahora el rechazo se ve.

## Matriz de acceso

Sin cambios: cada jugador lee y escribe solo su avance (el id sale de la sesión). No se agregan datos personales.

## Risks / Trade-offs

- Un avance guardado con una copa inexistente se rechazaría al volver a guardar. No existe ninguno: el juego solo crea
  copas de `KartsPistas.COPAS`.
