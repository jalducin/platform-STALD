## Why

«Karts Turbo» (cambio archivado `juegos-plataformas-karts`) se juega sobre todo en celular, y el profe reportó,
probándolo en su teléfono, que **«justo no funciona el control»**. Hoy el control táctil son 5 botones
(◀ ▶ ▼ 🎁 DERRAPE) que solo escuchan *pointer events*, y los carros son rectángulos sencillos.

Revisión de la causa raíz (detalle en `design.md`):
- con toques reales (CDP `Input.dispatchTouchEvent`, Chromium en modo móvil) los botones sí responden: girar,
  multitáctil y presión larga de 3 s (turbo morado) funcionan; la falla no se reproduce en Chromium;
- sí se reproducen tres defectos que en un celular real se viven como «no funciona»:
  1. a 360 px de ancho (el ancho más común en Android) el botón DERRAPE queda **cortado fuera de la pantalla**
     dentro de `juegos.html` (el marco mide 328 px y los botones piden ~372 px);
  2. en horizontal dentro de `juegos.html`, el **minimapa queda encima de ▼ y 🎁**;
  3. la entrada depende solo de *pointer events*: en Safari de iOS anteriores a 13 no existen y, en WebKit, un
     gesto que el navegador toma para desplazar la página (la página de Juegos sí se desplaza) manda
     `pointercancel`, que suelta el botón al instante. Además, los botones solo se muestran con
     `(pointer: coarse)`, que algunos celulares y tabletas no reportan.

Además, el profe pidió un **minimapa siempre visible con todos los corredores**, y el diseño necesita subir de
nivel para que se sienta como un juego de karts de verdad (con personajes y marcas originales).

## What Changes

- **Entrada táctil robusta (arreglo de la causa raíz):** los controles usan *touch events* con
  `preventDefault` (no pasivos), siguiendo cada dedo por su `identifier`; los *pointer events* quedan para mouse
  y pluma. Los controles se muestran en cualquier aparato táctil (`any-pointer: coarse`) y
  caben completos desde 320 px, en vertical y en horizontal.
- **Joystick virtual** (control por defecto en celular): zona a la izquierda donde el pulgar aparece el joystick;
  giro proporcional, zona muerta, regreso al centro al soltar y jalar hacia abajo frena. A la derecha, botones
  grandes: **DERRAPE** (mantener), **🎁 ítem** y **FRENO**. Multitáctil: girar y derrapar a la vez.
- **Volante por sensor:** «📱 Inclinar el celular para girar» con `DeviceOrientationEvent` (gamma en vertical,
  beta en horizontal según `screen.orientation`), centro calibrado al empezar la carrera (y con «🎯 Centrar»),
  sensibilidad Baja · Media · Alta. En iOS el permiso se pide con un toque en «Activar sensor»; si no hay sensor,
  no llegan lecturas o se niega el permiso, aviso amable y regreso al joystick.
- **Selector de controles** en el menú, antes de correr: 🕹️ Joystick · 📱 Sensor · 🔘 Botones (los de antes). Se
  recuerda en `localStorage` (`karts_control`, `karts_sensibilidad`). El teclado sigue igual en escritorio.
- **Minimapa siempre visible** (elemento propio, fuera del canvas): todos los corredores en tiempo real; el tuyo
  más grande, con borde, flecha de dirección y «TÚ»; cada rival con su color y su número; en sala también los
  fantasmas de los bots. Nunca tapa el joystick ni los botones.
- **Diseño:** karts cenitales con llantas, alerón, casco del piloto, sombra, brillo, color y número; humo y
  chispas del mini-turbo con el color de su nivel; pistas con orilla tipo piano, texturas, decoración por pista y
  línea de meta a cuadros con arco; HUD más pulido; pantalla de resultados con podio.
- **Rendimiento y accesibilidad:** pista y sprites de los karts pre-dibujados; `prefers-reduced-motion` (menos
  partículas, sin confeti ni giros); nada tapa el juego a 390×844 en vertical u horizontal; textos en español de
  México.
- **Sin cambios** en las reglas de la carrera (aceleración automática, giro máximo, derrape y sus tiempos,
  ítems, bots), en los tiempos, en el mensaje del resultado en sala (`meta { ms, monedas }`) ni en el progreso
  guardado.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisitos nuevos de Karts Turbo para controles táctiles, sensor, selector, minimapa y diseño.

## Impact

- **Superficies:** `juegos/karts.html` y una línea de `juegos.html` (el iframe de Arcade agrega
  `accelerometer; gyroscope` a `allow` para el sensor). No toca el servidor, `juegos/arcade.js`,
  `juegos/plataformas.html`, `index.html`, `ingles.html`, `secundaria.html`, Notion, Postgres `stald_*` ni Supabase.
- **Pruebas:** `tests/e2e/e2e-karts.js` (toques reales con CDP para joystick, botones y multitáctil; sensor con
  eventos `deviceorientation`; permiso negado y sin lecturas; preferencia guardada; minimapa sin encimarse;
  capturas en vertical, horizontal y escritorio).
- **Datos:** solo `localStorage` del navegador (preferencia de control y sensibilidad); ningún dato nuevo en el
  servidor. **Matriz de acceso:** sin cambios (el progreso sigue siendo de cada jugador).
- **Acciones externas** (usuario, tras el merge): publicación en GitHub Pages y prueba en un celular real (Android
  y iPhone) del joystick y del sensor.
