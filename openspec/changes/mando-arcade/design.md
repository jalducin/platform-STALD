## Context

Los juegos de Arcade (`juegos/plataformas.html`, `juegos/dragon-run.html`, `juegos/karts.html` y los que vienen)
son páginas con canvas embebidas en `juegos.html` con un iframe del mismo origen (`.arcade-caja`). Cada uno resolvió
su entrada por separado:

- **Axo** tiene 4 botones redondos (`#mandos .m`) con *pointer events*, captura de puntero y suelta con
  `lostpointercapture`/`pointercancel`, y su propio mapa de teclas (`MAPA_TECLAS`: flechas/WASD, ESPACIO, X, J, K).
- **Dragon Run** salta con ESPACIO/↑/W o con un `pointerdown` en cualquier parte; no tiene pausa.
- **Karts** (cambio `karts-controles-diseno`) ya pasó a *touch events* no pasivos por `identifier`, porque en WebKit
  un gesto que el navegador toma por desplazamiento manda `pointercancel` y suelta el botón, y porque `blur` del
  iframe soltaba los botones aunque el dedo siguiera en la pantalla.

El profe pide un mando común con la distribución de una consola portátil, que funcione en celular, en PC y con un
control físico.

## Goals / Non-Goals

**Goals:**
- Un solo módulo `juegos/mando.js`, sin dependencias ni build, con su CSS, que cualquier juego cargue con una línea.
- Lógica pura separada del DOM y probada con Deno (como `juegos/cartas.js` con `server/cartas_test.ts`).
- Entrada táctil robusta (lecciones de Karts), teclado configurable, Gamepad API y guía de controles.
- API pequeña y estable para que Karts, Futbolito y Billar la adopten sin cambiarla.
- Integrarlo en Axo y Dragon Run conservando sus controles actuales como alternativa elegible.

**Non-Goals:**
- Tocar `juegos/karts.html`, Futbolito o Billar.
- Cambiar reglas, físicas, puntos, progreso o mensajes con `juegos.html`.
- Reasignar teclas desde la interfaz (el mapeo es configurable por juego, en código).
- Vibración de los controles físicos (`vibrationActuator`).

## Decisions

### 1. Un archivo con dos capas
- `juegos/mando.js` es una IIFE que publica `window.Mando` (o `globalThis.Mando` en Deno). Todo lo que no toca el
  DOM es puro y se exporta para las pruebas: `normalizarAcciones`, `teclaABoton`, `cruceta`, `zonaMuerta`,
  `ejeABotones`, `masCercano`, `crearSeguidor`, `controlABotones`, `crearNucleo`, `guia`, `flancos`.
- `Mando.crear(opciones)` arma la capa de navegador encima de un `crearNucleo` (el estado y los eventos).
- El CSS va dentro del módulo (se inyecta una vez con `<style id="mando-css">`). Alternativa descartada: un
  `mando.css` aparte; obliga a cada juego a recordar dos etiquetas y puede pintar el mando sin estilos un instante.

### 2. Botones canónicos y acciones
- Botones: `arriba`, `abajo`, `izq`, `der` (cruceta), `A`, `B`, `X`, `Y`, `L`, `R`, `START`, `SELECT`.
- El juego declara `acciones: { nombreAccion: boton | [botones] }`. Un botón desconocido lanza error al crear (falla
  pronto, en desarrollo). `presionado(accion)` es verdadero si cualquiera de sus botones está abajo en cualquier
  fuente (táctil, teclado o control).
- `al(accion, fn)` se dispara en el flanco de bajada de la acción (no del botón: si la acción ya estaba presionada
  por otra fuente, no se repite) y `alSoltar(accion, fn)` cuando ninguna fuente la mantiene. Ambas devuelven una
  función para quitar el manejador. Los manejadores corren dentro del evento que los causó (toque, tecla o sondeo
  del control), para que el juego pueda marcar el pulso en su siguiente paso de física.
- **Visibles:** solo se muestran los botones que aparecen en `acciones`. La cruceta muestra solo los brazos usados
  (si no usa ninguno, no aparece). Si un lado queda vacío, conserva su lugar invisible para que el otro no se mueva.

### 3. Mando virtual: aspecto y distribución
- Cuerpo tipo consola: plástico grafito con degradado, bordes redondeados, sombra interior y un led; L y R como
  gatillos en las esquinas superiores; cruceta en cruz con flechas y centro hundido; A/B/X/Y en rombo (A derecha,
  B abajo, X arriba, Y izquierda) con letras y colores propios; START y SELECT como píldoras al centro; palanca
  (*circle pad*) opcional encima de la cruceta, con base hundida y perilla que sigue al pulgar. Con `nombres`, cada
  botón lleva debajo el nombre corto de su acción («saltar», «fuego»).
- Tamaño por la variable `--u` (lado de una celda de la cruceta): en vertical `clamp(30px, 11.2vw, 46px)`, de modo
  que a 320 px caben cruceta (3u) + centro (60 px) + rombo (3u) + márgenes.
- **Vertical:** el mando va debajo del juego, como un hijo más del contenedor (el juego conserva su área completa).
- **Horizontal bajo** (`orientation: landscape` y `max-height: 520px`): modo encimado; el cuerpo es transparente
  (`pointer-events: none`) y solo los grupos (izquierda, centro, derecha) reciben toques, semitransparentes, en
  las esquinas inferiores; `--u` sale de la altura (`clamp(24px, 12vh, 40px)`).
- El módulo publica en `document.documentElement` la variable `--mando-alto` (alto ocupado debajo del juego; 0 si
  está oculto o encimado) con `ResizeObserver`, por si el juego necesita restarlo.
- Visible por omisión (`visible: 'auto'`) si hay *touch events*, `(any-pointer: coarse)` o el ancho es menor de
  700 px (la misma regla de Karts; no se usa `navigator.maxTouchPoints`). `mostrar(false)` lo oculta para usar los
  controles propios del juego.

### 4. Entrada táctil (lecciones de Karts)
- `touchstart/touchmove/touchend/touchcancel` en la raíz del mando con `{ passive: false }` y `preventDefault()`; cada
  dedo por `Touch.identifier` (`changedTouches`). Así el navegador no desplaza, no hace zoom ni manda `pointercancel`.
- *Pointer events* solo para `pointerType` mouse o pluma, o para toques si no existe `TouchEvent`. Nunca se suelta por
  `lostpointercapture`. `touchcancel` sí suelta ese dedo.
- **Qué toca cada dedo** (`document.elementFromPoint` + zona):
  - cruceta: dirección por ángulo en 8 sectores (diagonales = dos botones) con zona muerta central de 0.25 del
    radio. Un dedo que empezó en la cruceta la conserva mientras no se aleje más de 1.8 radios (el pulgar se
    desliza);
  - rombo A/B/X/Y: el botón visible más cercano dentro del grupo (`masCercano`), para que no haya huecos entre ellos;
  - L, R, START, SELECT: el botón bajo el dedo;
  - palanca: vector desde el centro de la base, acotado al radio, con zona muerta radial (0.2 por omisión); el dedo
    se queda con la palanca hasta soltar. Pasado 0.5 en un eje también presiona la dirección de la cruceta.
- **Deslizar** a otro botón cambia la tecla: en cada `touchmove` se vuelve a resolver el dedo y el seguidor
  (`crearSeguidor`) reemplaza sus botones; fuera de todo control el dedo deja de presionar.
- **Vibración:** `navigator.vibrate(12)` al presionar un botón nuevo con el dedo, si existe y `vibrar !== false`.
- Sin zoom ni selección: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu`
  cancelado en el mando.
- `blur` de la ventana solo suelta el teclado; ocultar la pestaña (`visibilitychange`) suelta todo.

### 5. Teclado
- Mapa por omisión (por `KeyboardEvent.code`): flechas y WASD = cruceta; J = A, K = B, U = X, I = Y; Q = L, E = R;
  Enter = START; Shift derecho y Backspace = SELECT. `teclas: { Code: boton | null }` lo modifica por juego (`null`
  quita una tecla).
- Solo se atienden (y se cancela su acción por omisión) las teclas cuyo botón usa el juego, y solo con el mando
  activo (`activar(true)`). Enter y Espacio sobre un botón, enlace o campo no se interceptan, para no romper menús.
  Teclas repetidas (`repeat`) se ignoran.

### 6. Controles físicos (Gamepad API)
- Se sondea `navigator.getGamepads()` en cada cuadro (`requestAnimationFrame`) solo si existe. Con el mapeo
  estándar (`mapping === 'standard'`): 0 (abajo) = A, 1 (derecha) = B, 2 (izquierda) = X, 3 (arriba) = Y, 4/6 = L,
  5/7 = R, 8 = SELECT, 9 = START, 12–15 = cruceta; ejes 0–1 = palanca izquierda (zona muerta radial; pasado 0.5
  también presiona la cruceta). Se usa la **posición** del botón: el de abajo es la acción principal en cualquier
  control, aunque su letra impresa cambie de marca a marca. Botón presionado si `pressed` o `value > 0.5`.
  `botonesControl` permite reasignar índices por juego.
- Un control nuevo muestra el aviso «🎮 Control conectado» (y «🎮 Control desconectado» al quitarlo) en `.mando-aviso`
  (`role="status"`), dentro del iframe. También se escucha `gamepadconnected` para avisar en cuanto llega.
- El mapeo no estándar se trata igual (mejor esfuerzo); queda como riesgo.

### 7. Guía «⌨️ Controles»
- `guia(acciones, teclas, nombres)` (pura) devuelve por acción: botón del mando, teclas y botón del control.
- `botonGuia()` devuelve un `<button class="mando-guia-btn">⌨️ Controles</button>` que el juego coloca donde quiera;
  `mostrarGuia()` abre un diálogo (`role="dialog"`, `aria-modal`) con la tabla y «Cerrar» (también con Esc).
- Textos sin marcas: «Mando clásico», «botón de abajo», «gatillo izquierdo», nunca el nombre de una consola.

### 8. Integración en Axo
- `Mando.crear({ acciones: { izq: 'izq', der: 'der', saltar: 'A', fuego: 'B', pausa: 'START' }, contenedor: #juego,
  teclas: { Space: 'A', ArrowUp: 'A', KeyW: 'A', KeyX: 'B', KeyP: 'START', Escape: 'START' }, nombres })`: así ESPACIO,
  ↑, X y P siguen haciendo lo de siempre. Los manejadores `al`/`alSoltar` llaman al `presionar(k, on)` de siempre
  (mismos pulsos). START pausa o sigue (sin pausa en sala, como hoy).
- `localStorage.plataformas_control` = `mando` (por omisión) | `botones`. Con `botones` el mando se desactiva
  (`activar(false)`, `mostrar(false)`) y vuelven `#mandos` y `MAPA_TECLAS`; con `mando`, `#mandos` y `MAPA_TECLAS`
  no actúan (evita que J haga dos cosas). El selector va en la portada y en la pausa, con `aria-pressed`.
- El mando está activo solo en `modo` `nivel` o `pausa` (Enter funciona normal en los menús) y se ve solo
  jugando (`body.jugando`).

### 9. Integración en Dragon Run
- `Mando.crear({ acciones: { saltar: 'A', pausa: 'START' }, contenedor: body })`. A salta (y hace el doble salto);
  START empieza desde el menú, pausa y sigue. Su teclado propio (ESPACIO/↑/W) no cambia.
- **Pausa nueva:** `st = 'pause'` detiene `update` y la música; overlay «⏸ Pausa» con «SEGUIR». Ocultar la pestaña a
  mitad de carrera también pausa. El mando sigue visible en pausa para poder seguir con START.
- `localStorage.dragon_control` = `mando` (por omisión) | `toque`. Con `toque` se oculta el mando (el teclado y el
  control físico siguen activos: no chocan con sus teclas). Tocar la pantalla para saltar sigue funcionando en los
  dos modos; los toques sobre el mando no saltan dos veces. En vertical el cuerpo se vuelve columna (juego arriba,
  mando abajo) y el recordatorio «Toca en cualquier parte» se oculta con el mando.

## Risks / Trade-offs

- [Letras A/B del control físico distintas según la marca] → mapeo por posición documentado en la guía («botón de
  abajo»); reasignable por juego con `botonesControl`.
- [Controles con mapeo no estándar o sin permiso de la página] → mejor esfuerzo; el teclado y el táctil siguen.
- [Sondear `getGamepads` cada cuadro] → solo una llamada barata por cuadro; sin controles devuelve nulos.
- [Dos controles en Axo (mando y botones)] → la preferencia desactiva por completo el que no se usa.
- [`preventDefault` en `touchstart` quita el clic sintético] → el mando no usa `click`; el botón de la guía y los
  selectores están fuera del mando.
- [Probado en Chromium móvil, no en aparatos reales] → pendiente del usuario tras el merge (Android, iPhone, control).

## Migration Plan

Solo estáticos: se publica con el merge a `main` (Pages). Las preferencias nuevas viven en el navegador; sin datos
que migrar. Karts, Futbolito y Billar adoptan `juegos/mando.js` en sus propios cambios, con la API documentada en
`docs/frontend-standards.md` («Mando de Arcade»).
