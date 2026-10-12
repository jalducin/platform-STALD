## Context

`juegos/karts.html` es un canvas con paso fijo de 1/60 s embebido en `juegos.html` (iframe del mismo origen). La
entrada vive en `tecla = { izq, der, derrape, item, freno }` (booleanos) y `pasoKart` calcula
`giro = der − izq` (−1, 0 o 1). Los botones táctiles son `div.m` con *pointer events* y captura de puntero; se
muestran con `@media (pointer: coarse), (max-width: 700px)`. El minimapa se pinta dentro del canvas, abajo a la
derecha. El profe reporta que el control «no funciona» en su celular.

## Causa raíz del control (investigación)

Reproducción con Playwright en modo móvil (`hasTouch`, `isMobile`) y toques reales por CDP
(`Input.dispatchTouchEvent`, que pasa por el mismo flujo de gestos que un dedo), suelto y dentro de `juegos.html`,
a 390×844, 360×640 y 844×390:

| Prueba | Resultado |
| --- | --- |
| Mantener ◀ 0.5 s | `tecla.izq = true`, el carro gira (ángulo 0.03 → −2.09) |
| ◀ + DERRAPE a la vez, 3 s | multitáctil bien: derrape nivel 3 y turbo morado al soltar |
| Mover el dedo 24–30 px sobre el botón | sin `pointercancel` |
| 360×640 dentro de `juegos.html` | **DERRAPE cortado**: el marco mide 328 px y la fila pide ~372 px |
| 844×390 dentro de `juegos.html` | **el minimapa queda encima de ▼ y 🎁** (marco de 270 px de alto) |

Conclusión: en Chromium la ruta de eventos funciona; lo que falla en un celular real es:
1. **Layout:** el botón más importante (DERRAPE, que también da el turbo de salida) queda fuera de la pantalla en
   los Android de 360 px, y en horizontal el minimapa tapa botones.
2. **Dependencia exclusiva de *pointer events*:** sin `PointerEvent` (Safari iOS < 13, WebViews viejos) no hay
   control; y en WebKit, cuando el navegador decide que un toque es un desplazamiento de la página (la página de
   Juegos sí se desplaza: `scrollY = 15` en la prueba), manda `pointercancel` y el código suelta el botón al
   instante. `touch-action: none` dentro de un iframe no siempre se respeta en WebKit.
3. **Visibilidad:** los botones dependen de `(pointer: coarse)`; un aparato táctil cuyo puntero principal no es
   «coarse» (tabletas con pluma, modo escritorio) no los muestra.

## Goals / Non-Goals

**Goals:** entrada táctil que funcione en Android e iOS (también dentro del iframe), joystick, sensor, selector,
minimapa con todos los corredores, karts y pistas con más detalle, HUD y resultados más vistosos, 60 fps y nada
encimado a 390×844 en vertical u horizontal.

**Non-Goals:** cambiar reglas, tiempos, ítems, bots, el mensaje de sala o el progreso; agregar reversa o un pedal
de acelerador (la aceleración es automática en las reglas actuales); tocar `arcade.js` o `plataformas.html`.

## Decisions

### 1. Entrada: *touch events* primero
- Un ayudante `tactil(el, { inicio, mover, fin })` registra `touchstart/touchmove/touchend/touchcancel` con
  `{ passive: false }` y `preventDefault()`, y sigue cada dedo por `Touch.identifier` (`changedTouches`). Así el
  navegador no convierte el toque en desplazamiento ni zoom y no hay `pointercancel`.
- Los *pointer events* se usan solo para `pointerType` mouse o pen, o para toques si el navegador no tiene
  *touch events* (`'ontouchstart' in window` falso). Se descarta `lostpointercapture` como señal de soltar.
- `touchcancel` sí suelta (el sistema interrumpió: llamada, notificación).
- Los mandos se muestran si hay *touch events* o `(any-pointer: coarse)`, y siempre abajo de 700 px de ancho. No se
  usa `navigator.maxTouchPoints`: en la prueba de escritorio un equipo sin pantalla táctil lo reportaba mayor que 0 y
  los mandos tapaban el juego.
- Perder el foco (`blur` del iframe) solo suelta el teclado; antes también soltaba los botones táctiles aunque el dedo
  siguiera en la pantalla.
- El documento del juego agrega un `touchmove` no pasivo con `preventDefault` durante la carrera, para que la
  página de Juegos no se desplace con el dedo.
- Alternativa descartada: seguir con *pointer events* y solo corregir el layout. No cubre iOS viejo ni el
  `pointercancel` de WebKit.

### 2. Modelo de entrada analógico sin cambiar reglas
- `entrada = { giro: −1…1, freno, derrape }` sale de combinar teclado (−1/0/1), joystick o sensor (analógico) y
  botones (−1/0/1); el valor se acota a [−1, 1].
- Fuera del derrape, `w = giro × GIRO`: el giro máximo es el mismo que con teclado (proporcional abajo de eso).
- Dentro del derrape, las reglas usan solo la dirección: el giro se cuantiza con umbral 0.3 (`giroD = |giro| ≥ 0.3
  ? sign(giro) : 0`) para `haciaDentro`, la carga y el inicio del derrape. Los tiempos de carga (0.6/1.3/2.1 s) y
  los turbos no cambian.
- Aceleración automática como hoy; FRENO (botón o jalar el joystick hacia abajo, `y > 0.6`) usa la misma
  desaceleración de antes. No hay reversa: no existe en las reglas.

### 3. Joystick
- Zona `#joy-zona` (mitad izquierda de los mandos). El joystick aparece donde cae el pulgar (base flotante,
  dentro de la zona) y regresa a su lugar al soltar. Radio 46 px; zona muerta 0.15 del radio; fuera de ella
  `giro = sign(dx) × (|dx|/R − 0.15)/0.85`.
- Perilla y base son `div` con `transform` (sin reflujo). `aria-hidden`: el teclado sigue siendo la vía accesible.

### 4. Sensor
- `ángulo = screen.orientation.angle ?? window.orientation`: 0 → `gamma`; 90 → `beta`; 270/−90 → `−beta`;
  180 → `−gamma`.
- Calibración: el centro es la última lectura al iniciar la carrera, al reanudar la pausa, al rotar la pantalla y
  con «🎯 Centrar». Sensibilidad: ángulo para giro completo de 35° (Baja), 24° (Media, por omisión) o 15° (Alta);
  zona muerta 3°.
- «Activar sensor»: si existe `DeviceOrientationEvent.requestPermission` (iOS 13+), se llama dentro del toque; si
  responde distinto de `granted`, falla. Luego se espera una lectura con `gamma`/`beta` numéricos hasta 2 s; si no
  llega (escritorio, aparato sin giroscopio), falla. Sin `DeviceOrientationEvent`, falla de inmediato.
- Al fallar: aviso «📱 No se pudo usar el sensor (sin permiso o sin giroscopio). Seguimos con el joystick.»,
  `control = 'joystick'` y se guarda. El iframe agrega `allow="autoplay; accelerometer; gyroscope"`.
- Con sensor, a la izquierda se ve un volante que gira con la inclinación y «🎯 Centrar»; a la derecha los mismos
  botones.

### 5. Selector y preferencia
- En el menú, `#menu-control`: tres `button.ctl[data-control][aria-pressed]` (🕹️ Joystick · 📱 Sensor ·
  🔘 Botones); con Sensor aparecen «📱 Activar sensor», el estado y la sensibilidad (Baja/Media/Alta).
- `localStorage.karts_control` y `localStorage.karts_sensibilidad` (con `try/catch`). Por omisión: joystick.
- En escritorio sin pantalla táctil el selector no se muestra y queda la ayuda del teclado.

### 6. Minimapa
- `canvas#minimapa` fuera del canvas del juego (posición por CSS, por orientación), con la pista pre-dibujada y
  los corredores pintados cada cuadro: rivales en su color con su número (1–8, el mismo del kart); el tuyo más
  grande, con borde blanco, flecha de dirección y la etiqueta «TÚ». Los fantasmas de sala aparecen igual.
- Vertical: esquina inferior derecha del área de juego (los mandos van debajo, fuera del área). Horizontal
  (mandos encimados): arriba a la derecha, debajo de 🔊/⏸, y los mandos abajo; la E2E verifica que los
  rectángulos no se cruzan.

### 7. Diseño visual y rendimiento
- Sprites de karts pre-dibujados una vez por color y número (canvas de 4×): llantas con rin, chasis, carrocería
  con brillo, alerón, escapes, casco con visor y número. Por cuadro: sombra + `drawImage` rotado. Las llantas
  delanteras se dibujan aparte con el ángulo de giro.
- Partículas con vida y velocidad: humo gris del derrape, chispas del color del nivel (azul `#60a5fa`, naranja
  `#fb923c`, morado `#c084fc`), fuego del turbo. Tope de 300; con `prefers-reduced-motion`, una de cada tres y sin
  humo.
- Pista pre-dibujada: textura de fondo por tema (franjas de pasto, ondas de arena, grietas de hielo, vetas de
  lava), asfalto con grano, orilla tipo piano (segmentos alternos perpendiculares al camino), línea central,
  línea de meta a cuadros de 3 filas con arco «META», y decoración por pista (árboles y flores; cactus y rocas;
  pinos nevados y bloques de hielo; rocas y charcos de lava) más llantas apiladas y gradas cerca de la salida.
- HUD en DOM con tarjetas: posición grande (`6.º` + `/8`), vuelta, tiempo, monedas con barra y casilla del ítem.
- Resultados: podio con los tres primeros (medalla, color y número), tarjetas de tiempo, monedas y puntos, y la
  misma tabla. Confeti solo sin `prefers-reduced-motion`.

## Risks / Trade-offs

- [El sentido de `beta` en horizontal varía entre aparatos] → calibración del centro, sensibilidad ajustable y
  regreso fácil al joystick; queda como pendiente probarlo en celulares reales.
- [`preventDefault` en `touchstart` quita el clic sintético] → los mandos no usan `click`; los menús no están
  dentro de la zona de los mandos.
- [Más dibujo por cuadro] → sprites y pista pre-dibujados; el minimapa se redibuja con una imagen base y 8 puntos.

## Migration Plan

Solo estáticos: se publica con el merge a `main` (Pages). Sin datos que migrar; la preferencia nueva vive en el
navegador.
