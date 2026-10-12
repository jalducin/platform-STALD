## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/karts-mando` desde `4380726` (HEAD local de `release/juegos-lote`, que ya trae
  `mando-arcade` y `karts-pseudo3d`). No tocar `release/juegos-lote` ni el worktree del integrador.

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 Ampliar `tests/e2e/e2e-karts.js` con el mando (toques reales por CDP, `hasTouch` + `isMobile`):
  - «🎮 Mando clásico» en el selector, elegido y recordado tras recargar; con él se ve `.mando` y no `#mandos`;
  - cruceta ◀ con toque real gira a la izquierda (y al soltar deja de girar);
  - A con «Con botón» acelera (sin A no avanza);
  - R + ◀ más de 2 s → mini-turbo morado;
  - X usa el ítem (con el gancho de prueba `darItem`);
  - START pausa y START otra vez sigue;
  - control físico simulado (`navigator.getGamepads` en `addInitScript`): palanca proporcional, botón de abajo
    acelera, Start pausa; también con «Botones» elegido;
  - el teclado de Karts sigue igual con el mando elegido (P pausa una sola vez);
  - distribución a 320×640, 390×844 y 844×390, suelto y dentro de `juegos.html`: mando completo, sin cruzarse con el
    minimapa ni el HUD, `--mando-alto` y capturas.
- [x] 1.2 Correr la E2E y confirmar que las verificaciones nuevas fallan antes de implementar.

## 2. Implementación

- [x] 2.1 `juegos/karts.html`: cargar `mando.js?v=1`, `Mando.crear` con el mapeo de `design.md` §1 (sin teclas) y
  adaptador `KartsEntrada.registrar` (giro solo por `eje`, §2).
- [x] 2.2 Activar el mando en `carrera`/`pausa` y mostrarlo solo con `control === 'mando'`; ocultar `#mandos` con el
  mando; en horizontal, ocultarlo fuera de la carrera (§4, §6).
- [x] 2.3 Selector con «🎮 Mando clásico» (2×2), preferencia `karts_control = mando`, omisión `botones` (§5).
- [x] 2.4 Tutorial y aviso de arranque con los botones del mando (§7); gancho de prueba `darItem` y `item` en
  `estado()` (solo con `?prueba=1`).

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar que las verificaciones existentes de `e2e-karts.js` (Botones por omisión, joystick, sensor,
  teclado, sala) y `e2e-mando.js` sigan válidas sin cambios de expectativa.

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 E2E: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 8989 --puerto-web 8969 karts
  mando plataformas dragon-run juegos` (la copia temporal de datos se descarta al terminar: estado restaurado; no se
  escribe en tablas `stald_`).
- [x] 4.2 `npx -y deno test -A server/` y `npx -y deno lint`.
- [x] 4.3 Reporte `openspec/changes/karts-mando/reports/2026-10-12-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar las capturas (320, 390 y 844×390, suelto y en Juegos): el mando cabe, no tapa la pista, el
  minimapa ni el HUD; corregir lo que se vea mal. Casos de error: sin `localStorage` (modo privado), valor
  desconocido en `karts_control` → Botones.
- [ ] 5.2 Tras el merge (usuario): probar en un Android, un iPhone y con un control físico real.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md`: Karts (selector, mapeo, omisión) y «Mando de Arcade» (uso en Karts).
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-mando --strict`.

## 7. Cierre

- [ ] 7.1 Commits en español; sin push, PR ni merge (se integra cuando el lote llegue a producción). Tras el merge:
  `openspec archive karts-mando`.
