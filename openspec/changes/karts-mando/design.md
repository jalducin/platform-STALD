## Context

- `juegos/mando.js` (cambio `mando-arcade`) publica `Mando.crear({ acciones, contenedor, teclas, nombres, … })` con
  `presionado`, `eje`, `al`, `alSoltar`, `mostrar`, `activar` y el sondeo de la Gamepad API. Lo usan Axo y Dragon Run.
  La API es estable: este cambio no la modifica.
- `juegos/karts.html` (cambio `karts-pseudo3d`) lee la entrada por acciones (`acel`, `freno`, `izq`, `der`,
  `derrape`, `item`, `pausa`) más un eje de giro. Fuentes propias: teclado (`MAPA_TECLAS`), botones táctiles
  (`#mandos`), joystick y sensor. Fuentes externas: `window.KartsEntrada.registrar({ presionado(accion), eje() })`;
  `revisarFuentesExtra()` revisa una vez por cuadro los flancos de `acel`, `derrape`, `item` (pulsos) y `pausa`
  (`alternarPausa`), y `ejeExtra()` toma el eje externo más grande (zona muerta 0.15, acotado a [−1, 1]).
- `leerEntrada()` arma `giro = activo('der') − activo('izq') + giroAnalogico()`, acotado, y `giroAnalogico()` usa el
  joystick o el sensor si están elegidos y, si no, `ejeExtra()`.
- Selector de controles en el menú (`#menu-control`, solo en aparatos táctiles o < 700 px), preferencia en
  `localStorage.karts_control` (`botones` | `joystick` | `sensor`; por omisión `botones`) y
  `localStorage.karts_acelerar` (`auto` | `manual`).

## Goals / Non-Goals

**Goals:**
- Conectar el mando común a Karts solo con el adaptador de `KartsEntrada`, sin tocar física ni reglas.
- Opción «🎮 Mando clásico» en el selector, recordada como las demás.
- Control físico en la carrera con cualquier control elegido.
- Distribución correcta a 320, 390 y 844×390, suelto y dentro de `juegos.html`.

**Non-Goals:**
- Cambiar la API de `mando.js`, la física, los puntos, el progreso o los mensajes con `juegos.html`.
- Reasignar botones desde la interfaz.
- Palanca táctil en pantalla (ya existe la opción 🕹️ Joystick).

## Decisions

### 1. Mapeo de consola portátil

| Acción Karts | Botón del mando | Teclado (el de Karts, sin cambios) | Control físico |
|---|---|---|---|
| girar (eje) | cruceta ◀ ▶ | ← → / A D | cruceta o palanca izquierda (analógica) |
| `acel` | A | ↑ / W | botón de abajo |
| `freno` | B | ↓ / S | botón derecho |
| `derrape` | R o L | ESPACIO | gatillos (4/6, 5/7) |
| `item` | X o Y | E / Shift (y X, K) | botón izquierdo o de arriba |
| `pausa` | START | P / Esc | Start / Menú |

`Mando.crear({ acciones: { izq: 'izq', der: 'der', acel: 'A', freno: 'B', derrape: ['R', 'L'], item: ['X', 'Y'],
pausa: 'START' }, contenedor: #juego, nombres: { acel, freno, item, pausa } })`. Los brazos ▲ ▼ de la cruceta
no se usan, así que no aparecen (la cruceta muestra solo ◀ ▶). L y R hacen lo mismo para que el derrape caiga en el
gatillo que cada quien prefiera; X y Y igual con el ítem. Los nombres cortos bajo los botones («gas», «frenar», «ítem»,
«pausa»; «acelerar» se encimaba con B a 320 px) ayudan a los alumnos y alumnas que no conocen el rombo de una consola.

### 2. El giro entra solo por el eje
El adaptador responde `presionado('izq')` y `presionado('der')` siempre en falso y entrega el giro con
`eje() = mando.eje().x`. `mando.eje()` ya prioriza: palanca del control físico > cruceta (±1). Así:
- la cruceta da giro −1 / +1 (igual que ⬅ ➡);
- la palanca del control físico da un giro **proporcional**. Si el adaptador también respondiera `izq`/`der`, la
  palanca pasada de 0.5 (que `mando.js` convierte en cruceta) sumaría −1 al eje y el giro saltaría al máximo.
El derrape sigue cuantizando el giro con su umbral de 0.3, como con el joystick (`karts-controles-diseno`).

Alternativa descartada: pasar la cruceta por `presionado` y la palanca por `eje`: `mando.js` no separa la cruceta
de la palanca convertida en cruceta, y cambiarlo tocaría su API.

### 3. Teclado: solo el de Karts
`Mando.crear` recibe `teclas` con **todas** las teclas por omisión de `Mando.TECLAS` en `null`: el mando no lee el
teclado. El de Karts se queda tal cual. Motivo: con las teclas por omisión del mando habría choques (E = R/derrape en
el mando pero ítem en Karts; K = B/freno pero ítem en Karts) y la pausa se alternaría dos veces (P/Esc de Karts +
START del mando en el mismo cuadro). Tampoco se agrega el botón «⌨️ Controles» del mando: su columna de teclado
quedaría vacía; el tutorial de 3 s y `#teclas` ya explican los controles.

### 4. Activo en la carrera, visible solo con «🎮 Mando clásico»
- El mando se crea siempre y queda **activo** mientras `modo` es `carrera` o `pausa` (`mando.activar`, al cambiar de
  modo en el bucle). Fuera de la carrera está inactivo: tocarlo no hace nada y el control físico no navega menús.
- Se **ve** solo con `control === 'mando'` (`mando.mostrar`), y `mando.js` decide además si es aparato táctil o
  < 700 px (`visible: 'auto'`, el mismo criterio que `#mandos`). Con «Mando clásico» se ocultan `#mandos`.
- Como está activo con cualquier elección, **un control físico funciona siempre en la carrera**, también en la PC
  (donde no hay selector).
- Flancos: `item` y `pausa` se leen una vez por cuadro (`revisarFuentesExtra`), igual que el control físico en
  `mando.js`; un toque humano dura bastante más que un cuadro.

### 5. Por omisión siguen los Botones
Se conserva `botones` como valor por omisión de `karts_control`:
- en vertical el mando mide ~215 px de alto a 390 px (contra ~145 px de `#mandos`): la pista se ve más chica;
- los botones ⬅ ➡ son de 72×100 px; los brazos de la cruceta, de ~47 px. Para dirigir un carro sin ver los dedos,
  los botones grandes fallan menos;
- los alumnos y alumnas ya conocen los botones (sprints 13 y 15) y la E2E de Karts los fija como omisión.
El mando queda a un toque en el selector y el control físico funciona sin elegir nada. Si el profe lo prefiere,
cambiar la omisión es una línea (`control = 'botones'` → `'mando'`).

### 6. Distribución
- **Contenedor:** `#juego` (columna flex), después de `#mandos`. En vertical el mando es un hijo flex debajo de
  `#pantalla`, así que la pista (y el minimapa, que vive dentro de `#pantalla`) se acomoda sola arriba del mando.
- **`--mando-alto`:** `mando.js` lo publica (alto del mando en vertical, 0 en horizontal u oculto). Karts no lo
  necesita para acomodar la pista porque el flex ya le resta el alto; la E2E comprueba que coincide con el mando y
  que la pista termina donde empieza el mando.
- **Horizontal** (`orientation: landscape` y `max-height: 520px`): `mando.js` lo encima en las esquinas
  (L + cruceta abajo a la izquierda, R + rombo abajo a la derecha, START al centro abajo). Karts lo oculta cuando no
  hay carrera ni pausa (`body:not(.en-carrera)`), para que no tape los menús. El minimapa ya va arriba a la derecha
  (`top: 46px`) y el HUD arriba a la izquierda: no se cruzan con el mando (la E2E lo mide). El tutorial sube para no
  encimarse con START. Como la cruceta solo usa ◀ ▶,
  su brazo ▼ invisible no ocupa lugar (`margin-bottom: −u`, CSS de Karts): L y ◀ ▶ quedan pegados a la esquina.
- **Selector:** cuatro opciones en una cuadrícula de 2×2 para que quepan a 320 px.

### 7. Tutorial y avisos
Con «🎮 Mando clásico» en un aparato táctil, el tutorial de 3 s muestra «◀ ▶ Girar», «A Acelerar» (o «🤖 Aceleras
solo»), «R / L Derrape», «X / Y Ítem» y «B Frenar», y el aviso de arranque dice «🚀 Toca A justo antes de ¡YA!».

## Risks / Trade-offs

- [El mando es más alto que `#mandos`] → la pista se ve más chica en vertical; por eso no es la omisión (§5).
- [Flancos por cuadro] → un toque de menos de 16 ms no cuenta; el control físico de `mando.js` ya funciona así.
- [Un control físico con mapeo no estándar] → `mando.js` usa el mapeo estándar por posición; fuera de alcance.

## Verificación

E2E `tests/e2e/e2e-karts.js` (toques reales por CDP, control físico simulado con `navigator.getGamepads` en
`addInitScript`) y revisión de capturas a 320×640, 390×844 y 844×390, suelto (`juegos/karts.html?prueba=1`) y dentro
de `juegos.html?arcadePrueba=1`.
