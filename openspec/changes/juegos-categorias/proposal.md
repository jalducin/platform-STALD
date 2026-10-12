## Why

El profe pidió: «en la parte de juegos que selecciones categoría y después el juego para que sea más fácil la
navegación». Hoy la pestaña 🎮 Juegos pinta los más de 40 juegos en secciones seguidas (Inglés, Cultura y
Conocimiento, Mente ágil, Clásicos, Arcade…) y en el celular hay que desplazarse mucho para encontrar uno. Además, dos
íconos se ven mal: Blackjack usa 🂡 y Dominó usa 🁫, caracteres que pocas fuentes dibujan (en muchos celulares salen
como un cuadro vacío).

## What Changes

- **Primero la categoría, luego el juego.** La pestaña 🎮 Juegos abre en una pantalla de **tarjetas grandes de
  categoría** (emoji, nombre, cuántos juegos tiene y una descripción corta), en el orden actual. Rejilla: 1 columna a
  320 px, 2 a 390 px y 3 en escritorio. El número de juegos se cuenta del catálogo (`JUEGOS`), nunca fijo: Golf y los
  cambios de Futbolito que vienen sumarán tarjetas solos.
- **Al tocar una categoría** se ven **solo sus juegos**, con las tarjetas de siempre (ícono, título, descripción y la
  ⭐ del mejor de la semana), un botón claro **«← Categorías»** y el nombre de la categoría como encabezado.
- **Categoría recordada:** al salir de un juego se regresa a la misma categoría. Se guarda en `sessionStorage`
  (con `try/catch`) y en la URL `#cat=<id>`; el botón Atrás del navegador o del celular regresa de la lista de juegos a
  las categorías (`history.pushState` + `popstate`).
- **Accesibilidad:** las tarjetas de categoría son `<button>` con contorno de foco visible y `aria-label` con el
  número de juegos; al cambiar de vista el foco pasa al encabezado. Sin animaciones nuevas con
  `prefers-reduced-motion`.
- **Íconos nuevos de Blackjack y Dominó** en SVG (`juegos/iconos/blackjack.svg`: A♠ y K♥ en abanico con ficha verde
  «21»; `juegos/iconos/domino.svg`: ficha 6|3 color crema inclinada). Campo opcional `icono` en el catálogo y un solo
  ayudante `icoJuego(j)` que pinta `<img class="ico-img">` si hay `icono` y el emoji si no; se usa en la tarjeta del
  menú, el 🔥 ranking de juegos, la barra del juego, la pantalla de resultado, el encabezado de las salas, la
  portada del juego y «¿Continuar tu partida?». Donde el ícono va como texto escapado (opciones del selector de
  partidas, avisos, mensajes y ayudas) queda un emoji de respaldo que sí se dibuja: **♣️** para Blackjack y **🔳** para
  Dominó (🎲 ya es de Parchís y de la categoría Clásicos).
- **Sin cambios** en las pestañas Partidas, Ranking (salvo el ícono del 🔥 ranking) y Admin, en las salas ni en los
  enlaces que abren una partida directo (`?sala=`).
- **Pruebas:** E2E nueva `tests/e2e/e2e-categorias.js` (en `correr.sh`) y ayudantes en `tests/e2e/lib/menu.js`
  (`abrirCategoria`, `abrirJuego`, `recorrerMenu`, `contarMenu` por categorías) para las E2E que daban por hecho que
  todas las tarjetas estaban a la vista.
- **Documentación:** `docs/frontend-standards.md`.

Fuera de alcance: buscador de juegos, reordenar categorías o juegos, cambiar los textos de las tarjetas de juego,
tocar el servidor.

## Capabilities

### New Capabilities
<!-- Ninguna: se extiende la capability viva `juegos`. -->

### Modified Capabilities
- `juegos`: requisito modificado «Catálogo de juegos» (primero las categorías, luego sus juegos) y requisitos nuevos
  «Navegación por categorías» e «Íconos de juego en imagen».

## Impact

- **Superficies:** `juegos.html` (versiones de scripts), `juegos/app/menu.js`, `juegos/app/arranque.js`,
  `juegos/app/juegos.css`, `juegos/app/individuales.js`, `juegos/app/salas.js`, `juegos/app/ranking.js`,
  `juegos/app/arcade.js`, `juegos/tablero-ui.js`, `juegos/blackjack.js` y los SVG nuevos en `juegos/iconos/`. Sin
  cambios en `index.html`, `ingles.html`, `secundaria.html`, el servidor Deno, Postgres/Realtime/Auth de Supabase, el
  repo de datos ni Notion.
- **Datos personales:** ninguno. En el navegador solo se guarda el id de la categoría abierta
  (`sessionStorage.juegos_categoria`) y va en la URL (`#cat=<id>`). Matriz de acceso: sin cambios.
- **Pruebas:** `tests/e2e/e2e-categorias.js` (nueva) y las E2E que abren juegos desde el menú (ver `tasks.md`).
- **Acciones externas:** ninguna. Tras el merge (usuario): que el profe lo pruebe en un celular real.
