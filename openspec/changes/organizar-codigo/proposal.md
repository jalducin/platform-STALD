## Why

`juegos.html` creció a unas 4,280 líneas en un solo archivo (HTML, unas 520 de CSS en `<style>` y unas 3,700 de JS en
un `<script>`). Es el archivo donde más chocan los cambios en paralelo: cualquier juego nuevo, ajuste de sala o de
ranking toca el mismo archivo y los conflictos de merge son frecuentes. Además hay código repetido (el guardado del
avance de Dragon Run y el de los demás juegos de Arcade, el conteo del menú en las pruebas E2E) y documentación que
quedó vieja (`CUPO` / `BOTS_FIJOS`, que ya son la tabla `MESAS`). Es el Sprint 17, fase B: ordenar el código **sin
cambiar el comportamiento**.

## What Changes

- **`juegos.html` queda como estructura**: solo el HTML, los `<link>` y los `<script>`.
  - El CSS pasa a `juegos/app/juegos.css`.
  - El JS pasa a 13 scripts clásicos en `juegos/app/` (sin build ni módulos ES, como `juegos/mesas.js` y `comun/`),
    partidos por responsabilidad y cargados en el mismo orden que tenían en el `<script>`: `nucleo.js`, `menu.js`,
    `ranking.js`, `admin.js`, `individuales.js`, `arcade.js`, `mente.js`, `clasicos.js`, `naipes.js`, `salas.js`,
    `salas-mesa.js`, `musica.js` y `arranque.js`. Cada uno con `?v=1` para el caché.
  - Los nombres globales no cambian (`JUEGOS`, `CATEGORIAS`, `state`, `api`, `terminar`, …): los scripts de `juegos/`
    que ya los usaban y las pruebas E2E siguen funcionando igual.
- **Menos duplicación**:
  - `jugarArcade` (Axo, Karts, Futbolito y Billar) usa el mismo `canalProgreso` que Dragon Run para leer y guardar el
    avance en `/juegos/progreso/<juego>` (una sola implementación del `PUT` encadenado con versión).
  - Las E2E cuentan el menú con un solo ayudante (`tests/e2e/lib/menu.js`) en lugar de repetir
    `JUEGOS.length` / `CATEGORIAS.length` en 7 pruebas.
- **Documentación al día**: `docs/frontend-standards.md` describe la estructura de `juegos/app/`;
  `docs/backend-standards.md` deja de mencionar `CUPO` / `BOTS_FIJOS` y remite a `MESAS`; 0 enlaces rotos.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: se agrega «Código de Juegos organizado por responsabilidad» (requisito de mantenimiento: la página se
  comporta igual que antes de partirla).

## Impact

- Superficies: solo `juegos.html` (y sus archivos nuevos en `juegos/app/`) y las pruebas E2E. No toca `index.html`,
  `ingles.html`, `secundaria.html`, el servidor Deno, Postgres, Realtime, Auth, el repo privado de datos ni Notion.
- Contrato HTTP: sin cambios.
- Datos personales: ninguno nuevo; no se guarda nada distinto en `localStorage`.
- Matriz de acceso: sin cambios (la página no decide permisos; el servidor sigue siendo el mismo).
- Acciones externas: ninguna. GitHub Pages publica los archivos nuevos con el merge a `main` (agente verifica con
  `curl`); Deno Deploy redespliega el mismo servidor.
