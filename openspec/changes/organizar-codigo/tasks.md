## 0. Rama (OBLIGATORIO)

- [ ] 0.1 `git fetch` y crear `feature/organizar-codigo` desde `origin/main` (`eae63e5`)

## 1. Línea base antes de tocar nada

- [ ] 1.1 E2E completa con una copia de datos (`correr.sh --datos … --puerto-api 8999 --puerto-web 8979`) sobre
  `origin/main`; anotar las que fallan y repetir cada falla sola para separar intermitentes de fallas reales
- [ ] 1.2 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`

## 2. Partir `juegos.html` (un commit por paso; E2E `juegos` y la de la familia movida tras cada uno)

- [ ] 2.1 CSS → `juegos/app/juegos.css` (mismo lugar en la cascada)
- [ ] 2.2 `nucleo.js` (configuración, estado, recarga, utilidades, api, sonido y voz)
- [ ] 2.3 `menu.js` (catálogo, avatar, sesión y registro, hub)
- [ ] 2.4 `ranking.js` y `admin.js`
- [ ] 2.5 `individuales.js` (marco común, quiz y juegos de aprender)
- [ ] 2.6 `arcade.js` (Dragon Run, Axo, Karts, Futbolito y Billar, también en sala)
- [ ] 2.7 `mente.js` (Sudoku y Ajedrez individual)
- [ ] 2.8 `clasicos.js` (Basta, ¡Una!, Lotería) y `naipes.js` (Póker, Brisca y Conquián)
- [ ] 2.9 `salas.js` y `salas-mesa.js`
- [ ] 2.10 `musica.js` y `arranque.js`; `juegos.html` queda sin `<style>` ni `<script>` en línea

## 3. Quitar duplicación

- [ ] 3.1 `jugarArcade` usa `canalProgreso` (opción `sinAvance` para Futbolito y Billar) y `mensajeA(frame)`
- [ ] 3.2 `tests/e2e/lib/menu.js` (`contarMenu`) en las 7 E2E que contaban `JUEGOS.length` / `CATEGORIAS.length`
- [ ] 3.3 Resto de duplicación: anotado en `design.md` («Pendiente»)

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Las E2E que leen globales de la página (`JUEGOS`, `CATEGORIAS`) siguen funcionando con los scripts nuevos
  (D1 de `design.md`); conteo del menú con `lib/menu.js`
- [ ] 4.2 Las pruebas de Deno no leen `juegos.html`: sin cambios

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/` en verde
- [ ] 5.2 E2E completa con la misma copia de datos: igual o mejor que la línea base, sin fallas nuevas (las
  intermitentes se repiten solas). El orquestador trabaja sobre una copia; la carpeta original no se modifica
- [ ] 5.3 Reporte en `openspec/changes/organizar-codigo/reports/2026-10-12-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 6.1 UI con Playwright: `juegos.html` a 390 px y en escritorio carga el menú completo, sin errores de consola ni
  peticiones fallidas a `juegos/app/*`
- [ ] 6.2 Caso de error: con `?api=` hacia un puerto sin servidor, la página muestra su error de red (no se rompe) y
  la consola no reporta errores de script

## 7. Documentación técnica (OBLIGATORIO)

- [ ] 7.1 `docs/frontend-standards.md`: estructura de `juegos/app/`, orden de carga y regla de `?v=`
- [ ] 7.2 `docs/backend-standards.md`: `CUPO` / `BOTS_FIJOS` → tabla `MESAS`
- [ ] 7.3 Índice de documentación (`README.md`) y enlaces rotos: 0
- [ ] 7.4 `npx -y @fission-ai/openspec@1.4.1 validate organizar-codigo --strict`

## 8. Publicación y cierre

- [ ] 8.1 Push, PR en español, esperar todos los checks («Pruebas del servidor» y el preview de Deno) y merge
- [ ] 8.2 Producción: GitHub Pages sirve `juegos.html`, `juegos/app/juegos.css` y `juegos/app/*.js` (curl 200) y
  Deno Deploy queda en verde
- [ ] 8.3 `openspec archive organizar-codigo` en un PR aparte
