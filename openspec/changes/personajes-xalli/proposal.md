## Why

El profe mandó el arte conceptual de 4 personajes de inspiración prehispánica para «Axo y los 12 mundos» y «Karts
Turbo», y pidió «llevarlos al nivel del tipo de gráfico que usamos»: redibujarlos en el estilo propio de cada juego
(canvas dibujado en código, sin pegar imágenes ni usar renders de IA). Además confirmó el cambio de nombre: el ajolote
ahora se llama **Xalli**. Hoy los dos juegos tienen un solo personaje (Axo en plataformas; en Karts, un piloto genérico
con casco) y no hay forma de elegir.

## What Changes

- **Cuatro personajes jugables**, con datos únicos (id, nombre, título, colores y partícula) en un módulo nuevo
  `juegos/personajes.js`:
  1. **Xalli**, Guardián de los Canales: ajolote con branquias coral translúcidas que brillan suave y atuendo
     turquesa y jade. Reemplaza a «Axo» como personaje por omisión (misma especie y espíritu).
  2. **Itzae**, Cronista del Sol: joven astrónomo con penacho de plumas y glifos solares dorados, códice de amate que
     brilla y ropa ocre y turquesa.
  3. **Yahui**, Guerrero Jaguar de las Nubes: jaguar robusto con piel moteada, brazaletes de obsidiana y penacho de
     quetzal.
  4. **Xochiquetzal**, Señora de la Niebla y las Flores: huipil bordado de cempasúchil, máscara ritual de madera,
     corona de flores y niebla que brilla.
- **Axo (`juegos/plataformas.html`):** los 4 dibujados en canvas con las mismas poses que hoy (quieto, caminar, saltar,
  caer, daño, festejo y las variantes de champiñón y chile), con detalles de silueta que los distinguen en tamaño
  chico (branquias; penacho y códice; manchas, orejas y cola; corona, máscara y huipil). Selector en la portada con
  nombre y título de cada uno. Una partícula cosmética por personaje (burbujas, glifos, hojas, pétalos). Los textos
  que hablan del personaje dicen «Xalli»; **el título del juego «Axo y los 12 mundos» y su id `plataformas` no
  cambian** (avance y ranking intactos).
- **Karts (`juegos/karts.html`):** cada personaje como piloto visto por detrás en el modelo pseudo-3D del kart, con el
  kart en sus colores (Xalli turquesa/coral, Itzae ocre/dorado, Yahui amarillo con manchas y obsidiana, Xochiquetzal
  magenta/cempasúchil). Selector «🏁 Piloto» en el menú, junto a las opciones del kart. Los bots y fantasmas usan los
  otros personajes. El color del taller se conserva como color de identidad del kart (costados, número y marca del
  minimapa).
- **Solo cosmético:** no cambia física, tiempos, puntos ni ranking; nadie tiene ventaja.
- **Elección recordada** en el navegador (`localStorage.arcade_personaje`, compartida por los dos juegos, como
  `arcade_sonido`); sin elección o con un valor desconocido → Xalli. El formato del progreso del servidor no cambia, así
  que el avance viejo carga con Xalli.
- **Salas:** cada quien ve su propio personaje y los bots fantasma con los otros. Los demás jugadores no se dibujan en
  tu carrera (eso ya era así), por lo que no hay nada que mandar en la sala; queda anotado en `design.md`.
- **Accesibilidad y rendimiento:** respeta `prefers-reduced-motion` (sin partículas ni vaivén), 60 fps con CPU ×4
  (medido), legible desde 320 px en vertical y horizontal.
- **Pruebas:** se amplían `tests/e2e/e2e-plataformas.js` y `tests/e2e/e2e-karts.js` (selector con los 4, elección
  recordada tras recargar, avance viejo con Xalli, cada personaje dibujado y un nivel y una carrera terminados con
  cada uno, con capturas de cerca).
- **Documentación:** `docs/frontend-standards.md`.

Fuera de alcance: renombrar el título del juego (es un cambio de una línea si el profe lo pide), habilidades que
cambien el juego, mostrar el personaje de otras personas en la sala, tocar `juegos.html`, el servidor o el formato del
progreso.

## Capabilities

### New Capabilities
<!-- Ninguna: se extiende la capability viva `juegos`. -->

### Modified Capabilities
- `juegos`: requisito nuevo «Personajes de Arcade» (los 4 personajes, selector, guardado, bots y salas) y requisito
  modificado «Diseño visual de Axo y los 12 mundos» (el ajolote se llama Xalli y hay 4 personajes a elegir).

## Impact

- **Superficies:** `juegos/plataformas.html`, `juegos/karts.html` y el módulo nuevo `juegos/personajes.js`. Sin cambios
  en `index.html`, `ingles.html`, `juegos.html`, `secundaria.html`, el servidor Deno, Postgres/Realtime/Auth de
  Supabase, el repo de datos ni Notion.
- **Datos personales:** ninguno. La preferencia `arcade_personaje` (id del personaje) vive solo en el navegador.
  Matriz de acceso: sin cambios (no hay datos nuevos en el servidor).
- **Pruebas:** `tests/e2e/e2e-plataformas.js` y `tests/e2e/e2e-karts.js` (ampliadas); siguen corriendo `mando`,
  `dragon-run` y `juegos`.
- **Acciones externas:** ninguna. Pendiente para el usuario tras el merge: que el profe revise los personajes en un
  celular real.
