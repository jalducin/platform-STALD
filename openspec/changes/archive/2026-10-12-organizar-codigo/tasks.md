## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/organizar-codigo` desde `origin/main` (`eae63e5`)

## 1. Línea base antes de tocar nada

- [x] 1.1 E2E completa con una copia de datos (`correr.sh --datos … --puerto-api 8999 --puerto-web 8979`) sobre
  `origin/main`; anotar las que fallan y repetir cada falla sola para separar intermitentes de fallas reales
  - Base: 47 PASS, 3 FAIL (juegos, juegos-tablero, peticiones), 2 OMIT; las 3 pasan solas → intermitentes
- [x] 1.2 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`

## 2. Partir `juegos.html` (un commit por paso; E2E `juegos` y la de la familia movida tras cada uno)

- [x] 2.1 CSS → `juegos/app/juegos.css` (mismo lugar en la cascada)
- [x] 2.2 `nucleo.js` (configuración, estado, recarga, utilidades, api, sonido y voz)
- [x] 2.3 `menu.js` (catálogo, avatar, sesión y registro, hub)
- [x] 2.4 `ranking.js` y `admin.js`
- [x] 2.5 `individuales.js` (marco común, quiz y juegos de aprender)
- [x] 2.6 `arcade.js` (Dragon Run, Axo, Karts, Futbolito y Billar, también en sala)
- [x] 2.7 `mente.js` (Sudoku y Ajedrez individual)
- [x] 2.8 `clasicos.js` (Basta, ¡Una!, Lotería) y `naipes.js` (Póker, Brisca y Conquián)
- [x] 2.9 `salas.js` y `salas-mesa.js`
- [x] 2.10 `musica.js` y `arranque.js`; `juegos.html` queda sin `<style>` ni `<script>` en línea

- [x] 2.11 Merge de `origin/main` (personajes-xalli, #175): conflicto en `e2e-karts.js` resuelto conservando los dos `require`

## 3. Quitar duplicación

- [x] 3.1 `jugarArcade` usa `canalProgreso` (opción `sinAvance` para Futbolito y Billar) y `mensajeA(frame)`
- [x] 3.2 `tests/e2e/lib/menu.js` (`contarMenu`) en las 7 E2E que contaban `JUEGOS.length` / `CATEGORIAS.length`
- [x] 3.3 Resto de duplicación: anotado en `design.md` («Pendiente»)

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Las E2E que leen globales de la página (`JUEGOS`, `CATEGORIAS`) siguen funcionando con los scripts nuevos
  (D1 de `design.md`); conteo del menú con `lib/menu.js`
- [x] 4.2 Las pruebas de Deno no leen `juegos.html`: sin cambios

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/` en verde
- [x] 5.2 E2E completa con la misma copia de datos: igual o mejor que la línea base, sin fallas nuevas (las
  intermitentes se repiten solas). El orquestador trabaja sobre una copia; la carpeta original no se modifica
- [x] 5.3 Reporte en `openspec/changes/organizar-codigo/reports/2026-10-12-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 6.1 UI con Playwright: `juegos.html` a 390 px y en escritorio carga el menú completo, sin errores de consola ni
  peticiones fallidas a `juegos/app/*`
- [x] 6.2 Caso de error: con `?api=` hacia un puerto sin servidor, la página muestra su pantalla de entrada (no se rompe) y
  la consola no reporta errores de script

## 7. Documentación técnica (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md`: estructura de `juegos/app/`, orden de carga y regla de `?v=`
- [x] 7.2 `docs/backend-standards.md`: `CUPO` / `BOTS_FIJOS` → tabla `MESAS`
- [x] 7.3 Índice de documentación (`README.md`) y enlaces rotos: 0
- [x] 7.4 `npx -y @fission-ai/openspec@1.4.1 validate organizar-codigo --strict`

## 8. Publicación y cierre

- [x] 8.1 Push, PR en español, esperar todos los checks («Pruebas del servidor» y el preview de Deno) y merge
  - PR #176: «Pruebas del servidor» y el deploy de Deno en verde; merge `c0f28b5`
- [x] 8.2 Producción: GitHub Pages sirve `juegos.html`, `juegos/app/juegos.css` y `juegos/app/*.js` (curl 200) y
  Deno Deploy queda en verde
  - Verificado el 2026-10-12: Pages sirve `juegos.html` (72 líneas) y los 14 archivos de `juegos/app/` con 200;
    estado del commit en verde (deploy de Deno) y `/salud` 200
- [x] 8.3 `openspec archive organizar-codigo` en un PR aparte
