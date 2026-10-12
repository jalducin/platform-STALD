## Why

El profe quiere que los juegos de 🕹️ Arcade se jueguen con un **mando de consola portátil** (cruceta, palanca,
A/B/X/Y en rombo, L/R arriba y START/SELECT), tanto en el celular como en la PC, y que funcione también si alguien
conecta un control físico. Hoy cada juego trae sus propios botones táctiles, con distinto aspecto y distinta forma
de leer los toques (Axo usa *pointer events*, que en WebKit sufren el `pointercancel` documentado en
`karts-controles-diseno`), y en la PC cada juego usa teclas distintas. Además vienen juegos nuevos (Karts en
pseudo-3D, Futbolito, Billar) que necesitan el mismo control sin reinventarlo.

## What Changes

- **Módulo compartido nuevo `juegos/mando.js`** (sin dependencias, con su CSS incluido), cargable por cualquier juego
  de Arcade dentro de su iframe, con dos capas:
  - **lógica pura** (sin DOM, probada con Deno): botones canónicos, mapeo acción → botones, teclas → botones,
    cruceta de 8 direcciones, zona muerta radial, seguimiento de dedos (multitáctil y deslizar de un botón a otro),
    mapeo estándar de la Gamepad API, flancos de presión y guía de controles;
  - **capa de navegador**: mando virtual con aspecto de consola (izquierda: cruceta y palanca opcional; derecha:
    A/B/X/Y en rombo; arriba: L y R; centro abajo: START y SELECT), *touch events* no pasivos por `identifier`,
    *pointer events* solo para mouse y pluma, vibración corta opcional, teclado configurable, controles físicos
    (aviso «🎮 Control conectado») y una guía «⌨️ Controles».
- **API estable** `Mando.crear({ acciones, analogico, contenedor, teclas, nombres, … })` con `presionado`, `eje`,
  `al`, `alSoltar`, `mostrar`, `activar`, `mostrarGuia`, `botonGuia`, `soltarTodo` y `destruir`. Cada juego elige qué
  botones se ven (los que no usa no aparecen) y puede ocultar el mando para usar sus controles propios.
- **Integración en Axo** (`juegos/plataformas.html`): cruceta = mover, A = saltar, B = fuego, START = pausa. Selector
  «🎮 Mando clásico» · «🔘 Botones» (los de antes) en la portada y en la pausa, recordado en
  `localStorage.plataformas_control`.
- **Integración en Dragon Run** (`juegos/dragon-run.html`): A = saltar / doble salto, START = pausa (pausa nueva con
  «⏸ Pausa» y «SEGUIR»; también se pausa sola al ocultar la pestaña). Selector «🎮 Mando clásico» · «👆 Tocar la
  pantalla» (el de antes) en la pantalla de misiones, recordado en `localStorage.dragon_control`.
- **Pruebas:** `server/mando_test.ts` (lógica pura con Deno) y la E2E nueva `tests/e2e/e2e-mando.js` (toques reales
  multitáctiles, teclado, control físico simulado, preferencia recordada y capturas a 360/390 px en vertical y
  horizontal y en escritorio), registrada en la fase `base` de `tests/e2e/correr.sh`. Se ajusta
  `tests/e2e/e2e-plataformas.js` a los dos tipos de control.
- **Documentación:** sección «Mando de Arcade» en `docs/frontend-standards.md` con la API, el mapeo y las reglas para
  que Karts, Futbolito y Billar lo adopten sin cambiarla.

Fuera de alcance: `juegos/karts.html` (otro cambio lo rehace) y los juegos nuevos de Futbolito y Billar; adoptarán el
módulo en sus propios cambios.

## Capabilities

### New Capabilities
<!-- Ninguna: se extiende la capability viva `juegos`. -->

### Modified Capabilities
- `juegos`: requisitos nuevos del mando compartido de Arcade (táctil, teclado, control físico, API y guía) y su uso
  en Axo y Dragon Run (incluida la pausa de Dragon Run).

## Impact

- **Superficies:** `juegos.html` (sin cambios de código: los juegos ya viven en iframes del mismo origen),
  `juegos/mando.js` (nuevo), `juegos/plataformas.html`, `juegos/dragon-run.html`. No toca el servidor Deno,
  Postgres/Realtime/Auth de Supabase, el repo de datos ni Notion.
- **Datos personales:** ninguno. Las preferencias nuevas (`plataformas_control`, `dragon_control`) viven solo en el
  navegador. Matriz de acceso: sin cambios (no hay datos nuevos en el servidor).
- **Pruebas:** `server/mando_test.ts`, `tests/e2e/e2e-mando.js` (nueva), `tests/e2e/e2e-plataformas.js` (ajuste),
  `tests/e2e/correr.sh` (registro).
- **Acciones externas:** ninguna. Pendiente para el usuario tras el merge: probar en un Android, un iPhone y con un
  control físico real.
