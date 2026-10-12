## Why

El profe quiere que «Karts Turbo» se juegue con el mismo **mando de consola portátil** que ya usan Axo y Dragon Run
(cambio `mando-arcade`, sprint 16): cruceta, A/B/X/Y en rombo, L/R arriba y START. Karts quedó fuera de ese cambio
porque se estaba rehaciendo en pseudo-3D (`karts-pseudo3d`, sprint 15), que dejó lista una capa de acciones
(`window.KartsEntrada.registrar`) justamente para conectar un mando nuevo sin tocar las reglas. Hoy, además, un
control físico conectado no hace nada en Karts.

## What Changes

- **Adaptador del mando en Karts** (`juegos/karts.html`): carga `juegos/mando.js` y conecta `Mando.crear` a la capa
  de acciones con `KartsEntrada.registrar({ presionado, eje })`, sin cambiar la física ni las reglas. Mapeo de
  consola portátil:
  - cruceta ◀ ▶ (y la palanca de un control físico): girar, por el eje;
  - A: acelerar (solo hace falta con «Acelerar: Con botón»; con «Automático» sirve para el arranque turbo);
  - B: frenar;
  - R o L: derrape (mantener + dirección = mini-turbo);
  - X o Y: usar el ítem 🎁;
  - START: pausa y seguir.
- **Selector de controles:** cuarta opción «🎮 Mando clásico» junto a «⬅➡ Botones», «🕹️ Joystick» y «📱 Sensor»,
  recordada en `localStorage.karts_control` como las demás. **Por omisión siguen los Botones** (justificación en
  `design.md`).
- **Teclado:** se queda el de Karts (flechas/WASD, ESPACIO derrape, E/Shift ítem, P/Esc pausa); el mando no
  intercepta ninguna tecla, así que no hay acciones dobles.
- **Control físico (Gamepad API):** funciona en la carrera con cualquier control elegido (también en la PC), por el
  sondeo que ya hace `mando.js`.
- **Distribución:** en celular vertical el mando va debajo de la pista; en horizontal, encimado en las esquinas sin
  tapar la pista ni el minimapa, y solo durante la carrera y la pausa. Tutorial de 3 s con los botones del mando.
- **Pruebas:** se amplía `tests/e2e/e2e-karts.js` (TDD) con el mando: preferencia tras recargar, cruceta con toques
  reales, A con «Con botón», R + dirección → mini-turbo, X usa el ítem, START pausa, control físico simulado y
  distribución a 320, 390 y 844×390, suelto y dentro de `juegos.html`.
- **Documentación:** `docs/frontend-standards.md` (secciones de Karts y «Mando de Arcade»).

Fuera de alcance: cambiar la API de `juegos/mando.js` (se usa tal cual), la física, las reglas, los puntos, el
progreso o los mensajes con `juegos.html`; Futbolito y Billar.

## Capabilities

### New Capabilities
<!-- Ninguna: se extiende la capability viva `juegos`. -->

### Modified Capabilities
- `juegos`: requisito nuevo «Mando clásico en Karts» (mapeo, selector, teclado, control físico y distribución).

## Impact

- **Superficies:** `juegos/karts.html` (único archivo de código que cambia). `juegos.html` sin cambios: Karts ya vive en
  un iframe del mismo origen. No toca el servidor Deno, Postgres/Realtime/Auth de Supabase, el repo de datos ni
  Notion.
- **Datos personales:** ninguno. La preferencia `karts_control` (valor nuevo `mando`) vive solo en el navegador.
  Matriz de acceso: sin cambios (no hay datos nuevos en el servidor).
- **Pruebas:** `tests/e2e/e2e-karts.js` (ampliada); siguen corriendo `mando`, `plataformas`, `dragon-run` y `juegos`.
- **Acciones externas:** ninguna. Pendiente para el usuario tras el merge: probar en un Android, un iPhone y con un
  control físico real.
