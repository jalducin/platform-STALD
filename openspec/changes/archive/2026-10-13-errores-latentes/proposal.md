## Why

El sprint 23 (`calidad-sonar`, archivado en `openspec/changes/archive/2026-10-12-calidad-sonar/`) encontró cuatro
errores reales al refactorizar y los dejó como estaban porque corregirlos cambia el comportamiento y no había prueba
que los cubriera:

1. `server/salas.ts`, unirse a una sala: si `guardarJugador` falla tras 3 intentos responde `{ ok: true }` igual. La
   persona cree que entró, pero no está en la sala.
2. `server/salas.ts`, empezar: no revisa el resultado de `store.put`. Si la escritura choca, responde `ok` con un
   `inicio` que no se guardó (la sala parece empezada, pero no lo está); si la sala desapareció, `doc!` termina en 500.
3. `juegos/tablero-ui.js`, `clicNaval` (Batalla naval): `(r.body.jugadas || [])[r.body.jugadas.length - 1]` truena si
   la respuesta llega sin `jugadas`.
4. `genCalculo` («Cálculo y secuencias», `juegos/app/individuales.js`) no termina nunca con `n = NaN`
   (`genSecuencia` truena con el mismo valor).

## What Changes

- **Servidor (`server/salas.ts`)**: crear, unirse, empezar y revancha revisan el resultado de cada escritura. Si no
  se guardó, responden **503 `conflicto_escritura`** (el código que ya usan `respuesta`, `revancha` y
  `/juegos/progreso`) y el estado queda consistente: nadie queda «medio unido» ni hay sala «medio empezada»; al crear,
  si no se pudo guardar a quien la creó, se borra la sala nueva. Empezar reintenta hasta 3 veces con el `sha` fresco y,
  si otra petición ya la empezó, responde con esa sala; si la sala ya no existe, 404 `sala_no_existe`.
- **Página (`juegos/app/salas.js`, `juegos/app/arranque.js`)**: mensajes claros para el nuevo error: «No se pudo entrar
  a la sala, intenta de nuevo.», «No se pudo crear la partida, intenta de nuevo.», «No se pudo empezar la partida,
  intenta de nuevo.» (y el botón «Empezar» vuelve a quedar activo) y «No se pudo entrar a la revancha, intenta de
  nuevo.».
- **Batalla naval (`juegos/tablero-ui.js`)**: una respuesta sin `jugadas` no rompe la página: el tablero queda como
  está y se vuelve a sincronizar con el siguiente sondeo.
- **Cálculo y secuencias (`juegos/app/individuales.js`)**: `genCalculo` y `genSecuencia` validan `n` (entero ≥ 0;
  si no, 0) y `aleatorio` (si no es función, `Math.random`).
- Búsqueda del **mismo patrón** en otras rutas y otros manejadores `clic*`; lo que se corrige y lo que se deja, en
  `design.md`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: se agregan los requisitos «Escrituras de las salas que no se guardan» y «Respuestas y parámetros
  incompletos no rompen el juego».

## Impact

- **Superficies:** servidor Deno (`server/salas.ts`), `juegos.html` (solo el `?v=` de los scripts cambiados),
  `juegos/app/salas.js`, `juegos/app/arranque.js`, `juegos/app/individuales.js`, `juegos/tablero-ui.js`.
- **Contrato HTTP:** nuevo caso de error 503 `conflicto_escritura` en `POST /juegos/sala`, `/unirse`, `/empezar` y al
  entrar a la sala nueva de `/revancha`; 404 `sala_no_existe` en `/empezar` si la sala desaparece. Las páginas
  consumidoras se actualizan en el mismo cambio.
- **No se toca:** `supabase/`, Notion, `.env`, tablas `stald_*`, Postgres, Realtime, Auth, los controles de Futbolito
  (sprint 24a) ni el módulo de audio de emociones (sprint 24b).
- **Acceso:** sin cambios en quién puede ver qué; las respuestas de error no llevan datos personales.
- **Acciones externas:** ninguna (Deno Deploy y Pages publican con el merge a `main`).
