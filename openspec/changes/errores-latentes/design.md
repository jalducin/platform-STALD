## Context

El sprint 23 (`calidad-sonar`) dejó anotados cuatro errores reales en su `design.md` («Posibles errores reales
vistos al partir el servidor» y «Otras sospechas»). Este cambio los corrige con TDD (prueba que falla → arreglo →
prueba en verde) y busca el mismo patrón en el resto del código. En paralelo trabajan el sprint 24a (controles de
Futbolito: `juegos/futbolito.html`, `futbolito-motor.js`) y el 24b (audio de emociones: `juegos/emocion.js` y
llamadas pequeñas en los juegos y en `juegos/app/*.js`). El profe pidió terminar sin preguntar: las decisiones las
tomó el agente y aquí se justifican.

## Goals / Non-Goals

**Goals:** que ninguna ruta de salas diga `ok` sin haber guardado; que la página explique el error; que un campo
faltante o un parámetro inválido no rompa un juego; dejar listado el patrón en el resto del código.

**Non-Goals:** reintentos automáticos en la página; cambiar el almacén; tocar Futbolito o el audio; unificar el
manejo de errores de todos los juegos.

## Decisions

### 1. Código de error: 503 `conflicto_escritura`
Ya lo usan `POST /juegos/sala/<código>/respuesta`, `/revancha` (choques al reservar) y `/juegos/progreso` para lo
mismo: la escritura condicional no se pudo hacer tras los reintentos. Un código nuevo (`no_se_guardo`) obligaría a
las páginas a conocer dos nombres para el mismo caso. 503 porque es pasajero (otra escritura ganó o el repo de datos
no respondió) e intentarlo de nuevo puede funcionar.

### 2. Unirse (error 1)
`guardarJugador` devuelve `null` si las 3 escrituras fallan; en ese caso no se escribió nada, así que basta con
responder 503 sin publicar en Realtime. No hay jugador «medio unido» que limpiar.

### 3. Empezar (error 2)
Bucle de 3 intentos con lectura fresca: si la sala ya no existe → 404 `sala_no_existe`; si ya tiene `inicio` (otra
petición del anfitrión la empezó) → `ok` con esa sala, sin reescribir (así no cambia el `inicio` ni el secreto de
Dibuja que ya vieron los demás); si `put` con el `sha` leído funciona → `ok`. Tras 3 choques → 503. Antes, el `put`
fallido respondía un `inicio` que nadie más veía.

### 4. Crear (mismo patrón)
`crearSala` tampoco revisaba ni el `put` de la sala ni `guardarJugador`. Si el `put` de la sala falla (otro creó el
mismo código entre `codigoLibre` y la escritura) → 503 sin más. Si la sala se guardó pero el anfitrión no → se borra la
sala (`store.remove`) y 503: una sala sin anfitrión no se puede empezar y nadie sabría su código. No se indexa en el
resumen semanal hasta que las dos escrituras funcionaron.

### 5. Revancha (mismo patrón)
Al entrar a la sala nueva, `guardarJugador` se ignoraba y se respondía `ok`; ahora 503 `conflicto_escritura` con el
`codigo` de la revancha (como `ya_empezo` y `sala_llena`). La sala nueva queda creada (la pueden usar los demás) y
pedir otra vez la revancha es idempotente.

### 6. Página
- `unirseCodigo` (`salas.js`): «No se pudo entrar a la sala, intenta de nuevo.»
- `crearPartida` (`salas.js`): «No se pudo crear la partida, intenta de nuevo.» para `conflicto_escritura` y
  `sin_codigo`; los demás errores siguen mostrando su código.
- Empezar (`arranque.js`): con cualquier error distinto de `faltan_jugadores`, alerta «No se pudo empezar la partida,
  intenta de nuevo.» y el botón vuelve a quedar activo (antes se quedaba desactivado).
- `TXT_REVANCHA` (`salas.js`): «No se pudo entrar a la revancha, intenta de nuevo.»
- El cambio de equipo de Futbolito (`arcade.js`, `/unirse { equipo }`) ya manejaba el error («No se pudo cambiar de
  equipo…») y no se toca: es zona del sprint 24a.

### 7. Batalla naval sin `jugadas` (error 3)
`const x = (r.body.jugadas || []).at(-1);` dentro del mismo `.then`. Sin `jugadas` no hay sonido, y el tablero no
cambia: `enviar` ya llamó a `traerSala()` y el sondeo siguiente lo sincroniza. Se prueba con E2E (`page.route` que
reenvía la petición real al servidor y quita `jugadas` de la respuesta) porque el manejador vive dentro del IIFE de
`tablero-ui.js` y depende del DOM y de globales de `juegos/app/`.

### 8. Cálculo y secuencias (error 4)
`genCalculo(n, aleatorio)` y `genSecuencia(n, aleatorio)`: `n` se normaliza a entero ≥ 0 (`Number.isFinite(n) && n >= 0
? Math.floor(n) : 0`) y `aleatorio` a `Math.random` si no es función. Con un `n` válido el resultado es idéntico al
de antes (mismas llamadas al azar en el mismo orden), así que las partidas con semilla no cambian. Prueba unitaria en
Deno (`server/mente_calculo_test.ts`) que carga `juegos/app/individuales.js` con `new Function` y un `aleatorio` que
lanza error tras 10 000 llamadas: con `NaN` la versión vieja lo agotaba (bucle sin fin) y ahora termina.

### 9. Mismo patrón en otros lugares (revisado)
- **Corregidos aquí:** `crearSala` y `revanchaSala` (§4 y §5).
- **Se dejan, con motivo:**
  - `responderSala`, rama de error de salas grandes (`grande.cambiar`): si no se guarda solo deja de publicar; la
    respuesta ya es un error (p. ej. `bingo_falso`). Correcto como está.
  - `indexar` (índice semanal del admin) no avisa si falla: solo afecta el resumen del admin, no la partida; hacer
    fallar la creación por eso sería peor.
  - `reservarRevancha` y `/juegos/progreso` ya revisan sus escrituras.
  - `server/actividades.ts` (`doc!.data` si `estadoItem` diera «completo» sin resultado): anotado por el sprint 23;
    no es del mismo patrón (no ignora una escritura) y no hay forma de provocarlo con datos válidos.
- **Manejadores `clic*`:** `clicUnaSala`, `clicPokerSala`, `clicCartasSala`, `clicAjedrezSala`, `clicSala` de
  `tablero-ui.js` y los del arranque solo leen `r.ok` y `r.body.error` (el cuerpo siempre es un objeto: `pedirJson`
  devuelve `{}` si la respuesta no es JSON). Dibuja (`r.body.correcta`, `r.body.pts`) tolera su ausencia. El único que
  asumía un campo era `clicNaval`.

### 10. `?v=` y coordinación
Se sube en 1, por encima de la versión de `main` al momento del merge, el `?v=` de `individuales.js`, `salas.js`,
`arranque.js` y `tablero-ui.js` en `juegos.html` (el único HTML que los carga). Antes del PR se hace merge de
`origin/main`; si el 24a o el 24b ya entraron, se conservan sus cambios y se toma la versión mayor + 1.

## Risks / Trade-offs

- [Más 503 visibles] → solo cuando antes se respondía `ok` sin guardar; la página explica qué hacer.
- [Borrar la sala al crear] → solo si el anfitrión no se guardó (la sala no servía); el código no se indexó todavía.
- [Bucle de empezar] → máximo 3 lecturas y 3 escrituras, como `guardarJugador`.
