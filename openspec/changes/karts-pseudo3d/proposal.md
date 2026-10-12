## Why

El profe reportó «el de karts no funciona bien» y compartió como referencia un juego de karts **pseudo-3D** (estilo
Mode-7: cámara detrás del kart, pista en perspectiva hacia el horizonte, cielo, pasto alternado, orillas rojo y
blanco, y controles de acelerar, frenar, izquierda y derecha en teclado y con zonas táctiles). Hoy «Karts Turbo» es
una vista cenital. El diagnóstico con Playwright en modo móvil (detalle en `design.md`) confirmó que la vista
cenital es la raíz de que «no funcione bien» en celular:

- **No se entiende hacia dónde ir:** en vertical solo se ven ~135 px de pista por delante (0.54 s a velocidad punta)
  y la cámara apunta siempre al norte, así que cuando el carro baja por la pantalla ◀ lo mueve a la derecha de la
  pantalla (controles «invertidos»). Sin girar, a los 4 s el carro ya está en el pasto y ahí se queda a 138 px/s.
- **En horizontal dentro de Juegos el área de juego mide 720×250 px:** el joystick tapa la pista y el menú corta el
  título (el contenido centrado con `justify-content: center` no se puede desplazar hacia arriba).
- **El control por omisión (joystick) no es el que el profe espera:** pidió botones ⬅ ➡ claros.

## What Changes

- **Vista pseudo-3D (Mode-7 en canvas 2D)** de Karts Turbo: cámara detrás del carro que sigue su rumbo, piso
  proyectado por líneas desde una textura de la pista (asfalto con grano, orillas tipo piano, línea de meta y
  pasto con franjas alternas), cielo con montañas en 360° que se recorren al girar (paralaje), escenario por pista
  (árboles, cactus, pinos, rocas, gradas, llantas y señales de curva), rivales como sprites 3D escalados por
  distancia y ordenados por profundidad con su color y número, monedas, cajas de ítem y objetos sobre la pista, y
  tu carro abajo al centro que se inclina al girar y derrapar, con humo y chispas del mini-turbo. Las 4 pistas
  conservan su paleta.
- **Física y reglas sin cambios:** la simulación 2D de siempre (posiciones, vueltas, bots, ítems, monedas,
  mini-turbo, turbo de salida, copa y taller); la cámara se calcula con la posición y el ángulo del carro en ese mapa.
  El mensaje de sala (`meta { ms, monedas }` → `carrera: { ms, monedas }` del servidor) y el progreso
  (`/juegos/progreso/karts`) quedan iguales.
- **Controles:** por omisión en celular, botones grandes ⬅ ➡ a la izquierda y DERRAPE, 🎁 y FRENO a la derecha;
  opción «⚡ Acelerar: 🤖 Automático (por omisión) / 👆 Con botón» que agrega ACELERAR; joystick y sensor siguen como
  opción. Teclado: flechas o WASD (↑/W acelera, ↓/S frena), ESPACIO derrape, E o Shift ítem, P o Esc pausa. El turbo
  de salida vale con ACELERAR o con DERRAPE (mismas ventanas de tiempo). Tutorial de 3 s con los controles al
  empezar cada carrera y aviso «¡Vas al revés!».
- **Capa de acciones** (`acel`, `freno`, `izq`, `der`, `derrape`, `item`, `pausa` y un eje de giro) con
  `window.KartsEntrada.registrar({ presionado, eje })`, para conectar después el mando común de Arcade sin tocar las
  reglas.
- **Juegos en horizontal:** el marco de Arcade usa casi toda la altura del celular (`juegos.html`, una regla CSS y un
  `scrollIntoView`). El menú del juego se puede desplazar si no cabe.
- **Minimapa** igual, siempre visible, con «TÚ» acotado dentro del mapa aunque salgas de la pista.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: Karts pasa de vista cenital a pseudo-3D; controles con botones por omisión, aceleración opcional con
  botón, tutorial y capa de acciones.

## Impact

- **Superficies:** `juegos/karts.html` (render, entrada y menú) y `juegos.html` (CSS del marco de Arcade en
  horizontal y desplazamiento al abrir). No toca `juegos/arcade.js`, el servidor, `index.html`, `ingles.html`,
  `secundaria.html`, Postgres `stald_*`, Supabase ni Notion.
- **Pruebas:** `tests/e2e/e2e-karts.js` (vista 3D, botones con toques reales, cámara que gira, ACELERAR, teclado,
  vuelta completa con piloto de prueba, tutorial, 320 px, horizontal dentro de Juegos).
- **Datos:** nueva preferencia `localStorage.karts_acelerar` en el navegador. **Matriz de acceso:** sin cambios.
- **Dependencia con `karts-controles-diseno`** (activo, ya en `main`): este cambio modifica sus requisitos de
  controles (el control por omisión pasa de joystick a botones). Archivar primero `karts-controles-diseno` y después
  este.
- **Acciones externas** (usuario, tras el merge): publicación en Pages y prueba en un Android y un iPhone reales.
