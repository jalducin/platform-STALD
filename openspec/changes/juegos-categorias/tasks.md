## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear `feature/juegos-categorias` desde la rama local `feature/organizar-codigo` (sprint 17, aún sin merge):
  `git checkout -b feature/juegos-categorias feature/organizar-codigo`.

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 Ayudantes en `tests/e2e/lib/menu.js`: `esperarMenu`, `irACategorias`, `abrirCategoria`, `abrirJuego`,
  `recorrerMenu` y `contarMenu` sobre categorías (design §6).
- [x] 1.2 `tests/e2e/e2e-categorias.js` (y en `ORDEN` de `correr.sh`): pantalla de categorías (5 tarjetas en orden,
  conteo = `JUEGOS` por categoría, `aria-label` con el número, botones con foco visible), cada categoría con
  exactamente sus juegos y su encabezado, «← Categorías», Atrás, volver de un juego (✕ y «🎮 Otros juegos») a la misma
  categoría, recarga con `#cat=`, enlace directo `#cat=arcade`, `#cat=` inválido, `sessionStorage` bloqueado, foco en
  el encabezado, Partidas y Ranking sin cambios, íconos de Blackjack y Dominó como `<img>` cargadas
  (`naturalWidth > 0`) en tarjeta, barra, portada y ranking, respaldo ♣️/🔳 en el selector de Partidas, sin 🂡 ni 🁫,
  y diseño a 320×640 (1 columna), 390×844 (2), 844×390 y 1280×800 (3) sin desbordar, con capturas.
- [x] 1.3 Correr `e2e-categorias` y confirmar que falla antes de implementar.

## 2. Implementación

- [x] 2.1 Copiar los SVG a `juegos/iconos/blackjack.svg` y `juegos/iconos/domino.svg`; `icono` y emoji de respaldo
  (♣️, 🔳) en el catálogo (`menu.js`, `tablero-ui.js`).
- [x] 2.2 `icoJuego(j)` en `menu.js` y usarlo en tarjeta, 🔥 ranking, `marco`, `terminar`, barra de sala,
  «¿Continuar?», espera de Arcade 1 vs 1, portada de Tablero y de Blackjack; textos con 🂡/🁫 → respaldo (design §5).
- [x] 2.3 `CATEGORIAS` con `emoji`, `nombre` y `d`; `pantallaHub` pinta categorías o lista (`pintarMenuJuegos`),
  estado `state.cat` con `sessionStorage` y `#cat=`, historial y foco (design §2–§4).
- [x] 2.4 Delegado en `arranque.js` (`[data-categoria]`, `data-a="categorias"`) y `popstate`/`hashchange`.
- [x] 2.5 Estilos en `juegos/app/juegos.css` (`.cat-grid`, `.cat-card`, `.menu-top`, `.ico-img`,
  `prefers-reduced-motion`) y versiones de scripts/estilos en `juegos.html`.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 E2E que esperan el hub o tocan tarjetas del menú: `esperar`/`waitForSelector('[data-juego]')` →
  `[data-menu]` y clics a `[data-juego="…"]` del menú → `abrirJuego` (los de `.result [data-juego]` no cambian);
  verificaciones de tarjetas y secciones abren su categoría o usan `recorrerMenu`/`contarMenu`. Sin quitar
  afirmaciones.

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `e2e-categorias` y las E2E tocadas, una por una.
- [x] 4.2 Suite E2E completa: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9159
  --puerto-web 9169` (la copia temporal se descarta; nunca se escribe en tablas `stald_`); las inestables conocidas
  (futbolito «toque real», sudoku, loteria-sala, una-robo, tiempos de karts) se repiten solas. Comparar con la línea
  base de `feature/organizar-codigo` corrida en una copia aparte.
- [x] 4.3 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`.
- [x] 4.4 Reporte `openspec/changes/juegos-categorias/reports/2026-10-12-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar capturas a 320×640, 390×844, 844×390 y 1280×800 (categorías, lista, íconos en tarjeta, barra,
  resultado y ranking) y corregir lo que se vea mal.
- [x] 5.2 Casos de error: `#cat=` inválido, `sessionStorage` bloqueado, enlace `?sala=` con categoría guardada.
- [ ] 5.3 Tras el merge (usuario): que el profe lo pruebe en un celular real.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md`: navegación por categorías (estado, historial, foco) e íconos en imagen
  (`icono`, `icoJuego`, respaldo en texto); ayudantes de `tests/e2e/lib/menu.js` en `docs/pruebas.md` si aplica.
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate juegos-categorias --strict`.

## 7. Cierre

- [x] 7.1 `git fetch` y revisar si `organizar-codigo` ya está en `origin/main`: si sí, merge de `origin/main` y repetir
  pruebas; si no, dejar la rama sobre `feature/organizar-codigo`. (Ya estaba: merges de `origin/main` con #176, #179
  golf y #180 futbolito-equipos, con las pruebas repetidas.)
- [ ] 7.2 Commits en español; sin push, PR ni merge (lo integra el coordinador tras los sprints 17, 20a y 20b). Tras
  el merge: `openspec archive juegos-categorias`.
