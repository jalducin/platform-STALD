## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/karts-curvas-complejas` desde `origin/main`; `git merge origin/main` al
  entrar la Copa Reinos Antiguos (PR #199)

## 1. Datos y reglas (TDD)

- [x] 1.1 Prueba que falla: `server/karts_curvas_test.ts` (complejidad por pista, cerrado sin encimarse, radio, minimapa,
  largo ±15 %, mecánicas sobre el camino, límites de sala, récords versionados y forma del progreso)
- [x] 1.2 `juegos/karts-pistas.js`: trazados nuevos de las 4 pistas del Espacio con sus mecánicas reubicadas;
  `trazado: 3`, `VERSION_PISTAS = 3`, `complejidad(M)`
- [x] 1.3 `juegos/karts-pistas.js`: trazados nuevos de las 4 pistas de Reinos Antiguos (interiores, columnas, adornos y
  mecánicas recalculados)
- [x] 1.4 `server/progreso.ts`: forma `pistasV: 3` + `recordsV1` + `recordsV2`

## 2. Juego (karts.html)

- [x] 2.1 `migrarRecords` por trazado, aviso de curvas nuevas y «trazado anterior» en «Carrera rápida»
  (`// karts-curvas-complejas`)
- [x] 2.2 Revisar que los bots completen las vueltas nuevas: entre muros miran más cerca (como en el espacio); un
  interior largo en espiral se parte en tramos seguidos (solo se dibujan los muros del tramo: 60 fps)

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `server/karts_pistas_test.ts`, `server/karts_espacio_test.ts`, `server/karts_reinos_test.ts`,
  `server/progreso_test.ts` con la versión 3 (sin fijar listas)
- [x] 3.2 `tests/e2e/e2e-karts.js`: vuelta completa con el piloto de prueba en cada pista rediseñada, bots que
  terminan, fps con CPU ×4 y 8 karts, capturas del minimapa y de la carrera a 390×844; récords del trazado anterior

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/`, `deno lint` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 4.2 E2E `karts karts-vivo` con la copia de datos de prueba (`correr.sh` trabaja sobre una copia temporal y la
  borra: estado restaurado; nunca se escribe en tablas `stald_`)
- [ ] 4.3 Reporte `openspec/changes/karts-curvas-complejas/reports/2026-10-17-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Capturas del minimapa de cada pista (antes y después) y de la carrera a 390×844; iterar hasta que se vean
  claramente más técnicas
- [ ] 5.2 Tras el merge: abrir `juegos/karts.html` publicado y confirmar que carga los trazados nuevos (`?v=`)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (progreso de Karts versión 3) y `docs/frontend-standards.md` (trazados y complejidad);
  `?v=` de los scripts de Karts arriba de `main`
