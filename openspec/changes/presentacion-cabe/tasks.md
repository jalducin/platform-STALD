## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/presentacion-cabe` desde `main` (1779326); merge de `main` antes del PR

## 1. Reproducir con datos reales

- [x] 1.1 Copia temporal del repo de datos (`gh repo clone jalducin/platform-STALD-data`, fuera del repo) y
  medición en Playwright, como admin, de `meet-2026-10-25`, `meet-2026-10-11`, `meet-g1-2026-10-21` y una presentación
  sintética, en 1280×720, 1366×768, 1920×1080, 1024×768, 360×740 y 740×360. Se comparó `scrollHeight` con
  `clientHeight` en la diapositiva y en sus hijos. Resultado: 24 de 24 recorridos con contenido cortado (ver
  proposal). Capturas «antes» guardadas fuera del repo

## 2. Prueba que falla primero (TDD)

- [x] 2.1 `tests/e2e/e2e-presentacion-cabe.js` (nueva) y registro en `tests/e2e/correr.sh` (fase `ingles`). Contra
  `main` falla en todos los tamaños

## 3. Implementación (solo archivos de la presentación)

- [x] 3.1 `ingles/presentacion.js`: `slideHtml` con diseño RPG (misión de la semana, ruta de la misión, teoría en
  tarjetas con chips, reto, arena, tarea, misión cumplida); `ajustarDiapositiva` (escala por búsqueda binaria hasta
  70 % y 14 px; si no cabe, `.desborda` con «⬇️ Hay más · parte x/y»); → / ← y ↓ / ↑ recorren las partes antes de
  cambiar de diapositiva; `ResizeObserver` para pantalla completa y giro; tema ☀️/🌙 (tecla T, `localStorage`);
  barra con botones reales, `rpg-contador` y `rpg-xp-barra` con `role="progressbar"`
- [x] 3.2 `ingles/presentacion.css` (nuevo): tema oscuro para proyector y tema claro, tonos por tipo, letra
  `clamp()` × `--escala` con medidas en `em`, tablas con scroll horizontal propio, diagramas con la paleta de la
  presentación y diapositiva a todo el alto en vertical
- [x] 3.3 `ingles/ingles.css`: se quita el bloque viejo del modo presentación y `.slide .dg`; `ingles.html`: enlace a
  `presentacion.css?v=1`, `ingles.css?v=12` y `presentacion.js?v=4`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Revisar las E2E que abren la presentación (`presentar`, `teoria-diagramas`, `ingles-admin`,
  `ingles-diseno-profe`): siguen usando `#deck-stage`, `#deck-count`, `[data-deck="exit"]` y `.slide`, sin cambios

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `presentacion-cabe` en los 6 tamaños (`TAMANOS=todos`) y en los 3 de omisión; `presentar`,
  `teoria-diagramas` e `ingles-admin`; `deno test -A server/` (incluye la prueba de espejos), `deno check` y
  `deno lint`. Puertos 9011/9012, solo la copia temporal de datos, sin tablas `stald_` reales
- [x] 5.2 Reporte en `openspec/changes/presentacion-cabe/reports/2026-10-22-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 6.1 Recorrer en Playwright las diapositivas con capturas antes y después (1280×720, 1920×1080, 360×740 y
  740×360; oscuro y claro), y revisar que → baje las partes y luego cambie de diapositiva, que ← regrese y que Esc
  salga
- [x] 6.2 Tras el merge: verificar en producción (GitHub Pages) que `ingles.html` sirve `presentacion.css?v=1` y
  `presentacion.js?v=4` con `ajustarDiapositiva`

## 7. Actualizar documentación técnica (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md`: `presentacion.css` y la regla «ninguna diapositiva recorta contenido»;
  `docs/pruebas.md`: la E2E `presentacion-cabe` y sus variables `TAMANOS` y `CAPTURAS`
