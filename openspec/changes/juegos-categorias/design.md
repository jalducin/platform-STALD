## Context

- El hub de `juegos.html` lo pinta `pantallaHub(tab)` en `juegos/app/menu.js` (rama `feature/organizar-codigo`,
  sprint 17): con la pestaña 🎮 Juegos recorre `CATEGORIAS` y, por cada una, un `<h2>` y una `.grid` de tarjetas
  `.game[data-juego]`. Los clics se atienden con un solo delegado en `juegos/app/arranque.js`.
- `JUEGOS` se arma en `menu.js` y suma las tarjetas de `ClasicosRapidosUI.TARJETAS` y `TableroUI.TARJETAS`
  (Dominó vive en `juegos/tablero-ui.js`). Golf (sprint 20a) y Futbolito (20b) agregarán más.
- El emoji de cada juego (`j.emoji`) se usa como HTML en la tarjeta, la barra del juego (`marco`), el resultado
  (`terminar`), la barra de la sala, «¿Continuar tu partida?», el 🔥 ranking de juegos, la espera de Arcade 1 vs 1 y
  las portadas de Tablero; y como **texto** en el `<select>` de Partidas y en el aviso de revancha.
- La URL ya lleva `?sala=` (se reemplaza con `replaceState`) y `comun/auth.js` lee el `#hash` solo si trae
  `access_token=` o `error_description=`.
- Más de 40 E2E esperan `[data-juego]` para saber que el hub está listo y hacen clic en `[data-juego="…"]` sin abrir
  nada antes.

## Goals / Non-Goals

**Goals:**
- Pantalla de categorías → lista de una categoría, con «← Categorías», categoría recordada y botón Atrás.
- Conteos dinámicos desde `JUEGOS`.
- Íconos SVG de Blackjack y Dominó con un solo ayudante y respaldo en texto.
- Accesible (botones, foco, `aria-label`) y legible de 320 px a escritorio.

**Non-Goals:**
- Tocar Partidas, Ranking (salvo el ícono), Admin, salas o el servidor.
- Agregar entradas de historial al abrir un juego (el Atrás dentro de un juego no cambia: ver §3).

## Decisions

### 1. Datos de categoría
`CATEGORIAS` gana `emoji`, `nombre` y `d` (descripción corta); `titulo` se conserva (`emoji + ' ' + nombre`) porque lo
usan otras partes. Descripciones:

| id | emoji y nombre | descripción |
|---|---|---|
| ingles | 📘 Inglés | Vocabulario, gramática y pronunciación jugando. |
| cultura | 🧠 Cultura y Conocimiento | Historia, ciencia, ortografía y línea del tiempo. |
| mente | ⚡ Mente ágil | Cálculo, lógica, memoria y estrategia. |
| clasicos | 🎲 Clásicos | Cartas, tablero y juegos de mesa de siempre. |
| arcade | 🕹️ Arcade | Plataformas, carreras y deportes de acción. |

El número de juegos se calcula al pintar (`JUEGOS.filter(j => j.cat === c.id).length`); una categoría sin juegos no
se pinta (como hoy).

### 2. Marcado y estado
- `#tab-body` contiene `<section id="menu-juegos" data-menu="categorias">` (pantalla de categorías) o
  `data-menu="<id>"` (lista de una categoría). `[data-menu]` es el selector «el menú está listo» en las dos vistas.
- Categorías: `<h2 id="menu-titulo" tabindex="-1">Elige una categoría</h2>` y `.cat-grid` con
  `<button class="cat-card cat-<id>" data-categoria="<id>" aria-label="Inglés, 7 juegos. Vocabulario…">`.
  No se usa `data-cat` porque ya lo usa el Maratón de cultura.
- Lista: `<button class="btn ghost sm" data-a="categorias">← Categorías</button>`, `<h2 id="menu-titulo"
  tabindex="-1">📘 Inglés</h2>` y la `.grid` de tarjetas `.game[data-juego]` de siempre.
- `state.cat` = id abierto o `null`. `sessionStorage.juegos_categoria` lo guarda (lectura y escritura con
  `try/catch`; sin almacenamiento solo se pierde el recuerdo). Un id que no existe se ignora.
- Al entrar al hub: si la URL trae `#cat=<id>` válido, manda ella; si no, `sessionStorage`; si no, categorías.

### 3. Historial (Atrás del celular)
- Abrir una categoría desde la pantalla de categorías hace `history.pushState({ cat }, '', ruta + '#cat=<id>')`
  (conserva `?api=`, `?sala=`…).
- Si se pinta una lista y la entrada actual del historial no es de esa categoría (recarga, regreso de un juego o enlace
  directo con `#cat=`), primero se reemplaza la entrada por la de categorías (`replaceState({ cat: null }, '', sin
  hash)`) y luego se empuja la de la categoría. Así **debajo de una lista siempre hay una entrada de categorías** y el
  Atrás nunca saca de la página desde una lista.
- «← Categorías» hace `history.back()` si la entrada actual es de categoría; si no, `replaceState` sin hash y pinta.
- `popstate` (y `hashchange`, por si alguien edita el hash): si el menú está a la vista, se lee `#cat=` y se pinta la
  vista que toque con el foco en el encabezado. Si no está a la vista (en un juego, en Partidas o Ranking) no se
  pinta nada: el juego en curso no se interrumpe y, al salir, se regresa a `state.cat`.
- Alternativa descartada: empujar historial también al abrir cada juego. Interfiere con los juegos que avisan antes
  de salir, con la reanudación y con las salas (`?sala=`), y no lo pidieron.

### 4. Foco y movimiento
- Al cambiar de vista por una acción (tocar categoría, «← Categorías», Atrás) el foco pasa a `#menu-titulo`
  (`focus({ preventScroll: true })` y `scrollIntoView` del inicio del menú). En la primera pintura del hub no se mueve
  el foco.
- Las tarjetas de categoría tienen la misma elevación al pasar el mouse que las de juego; con
  `prefers-reduced-motion: reduce` no hay `transform` ni transición (también para `.game`).

### 5. Íconos en imagen
- Catálogo: `{ id: 'blackjack', emoji: '♣️', icono: 'juegos/iconos/blackjack.svg', … }` y
  `{ id: 'domino', emoji: '🔳', icono: 'juegos/iconos/domino.svg', … }`. `emoji` pasa a ser el **respaldo en texto**.
- `icoJuego(j)` (en `menu.js`, global; acepta el objeto o el id): con `icono` →
  `<img class="ico-img" src="<icono>" alt="" width="64" height="64" decoding="async">`; sin `icono` → el emoji. Los
  módulos cargados antes (`tablero-ui.js`, `blackjack.js`) lo llaman en tiempo de ejecución con respaldo a `j.emoji`.
- `.ico-img { width: 1.25em; height: 1.25em; vertical-align: -0.25em; }`: toma el tamaño de letra de donde vive, así
  se alinea con los emojis en la tarjeta (1.4rem), la barra del juego, el resultado (2.4rem), el ranking y las
  portadas.
- Texto escapado (`<option>`, avisos, títulos de ayuda y mensajes de Blackjack y Dominó que hoy dicen 🂡 o 🁫) usa el
  respaldo ♣️ / 🔳. ♣️ no lo usa otro juego; 🎲 lo usan Parchís y la categoría Clásicos, por eso Dominó usa 🔳.
- Las rutas son relativas a `juegos.html` (GitHub Pages sirve la raíz de `main`).

### 6. Pruebas E2E
- `tests/e2e/lib/menu.js`: `esperarMenu(p)` (`[data-menu]`), `irACategorias(p)`, `abrirCategoria(p, id, { tap })`,
  `abrirJuego(p, id, { tap })` (busca la categoría del juego en `JUEGOS` de la página, la abre si hace falta y toca
  `.game[data-juego=id]`), `recorrerMenu(p)` (entra a cada categoría y devuelve `[{ id, titulo, n, ids }]`) y
  `contarMenu(p)` reescrito sobre `recorrerMenu`: sigue devolviendo `ids`, `tarjetas`, `juegos`, `secciones`,
  `categorias` y `completo`, ahora comprobando además que cada categoría pinta exactamente sus juegos.
- Las E2E existentes cambian `esperar: '[data-juego]'` por `'[data-menu]'` y sus clics a tarjetas del menú por
  `abrirJuego`; las verificaciones de tarjetas abren antes su categoría. Ninguna afirmación se quita.
- Nueva `e2e-categorias.js`: pantalla de categorías, cada categoría con exactamente sus juegos, «← Categorías», Atrás,
  regreso desde un juego, recarga con `#cat=`, `sessionStorage` bloqueado, íconos `<img>` cargados
  (`naturalWidth > 0`) y diseño a 320, 390, 844×390 y escritorio (columnas, sin desbordar).

## Risks / Trade-offs

- [Más toques para llegar a un juego] → uno más, a cambio de no desplazarse; la categoría se recuerda.
- [E2E con muchos clics al menú] → un solo ayudante (`abrirJuego`) para que el cambio sea mecánico y no debilite
  pruebas.
- [Atrás dentro de un juego] → se comporta como hoy (sale a la entrada anterior); documentado en §3.
