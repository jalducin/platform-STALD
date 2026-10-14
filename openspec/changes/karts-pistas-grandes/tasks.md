## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/karts-pistas-grandes` desde `origin/main`

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/karts_pistas_test.ts`: largo 2.7–3.3× el original, radio ≥ el original, sin encimarse, separación de
  tramos lejanos en el minimapa de 104×72 (≥ 6 px), caja ≤ 12.6 M px, `vueltas` = 2, mecánicas sobre el camino y sus
  conteos (3 trajineras, 9 rampas, 2 saltos con cenote, 7 lodos), límites por pista (`limitesKarts`)
- [x] 1.2 `server/carreras_test.ts`: mínimo y límite de la pista de la sala (rechaza 20 s en el Lago Helado, acepta un
  tiempo normal, pasado el límite de la pista)
- [x] 1.3 `server/progreso_test.ts`: forma versionada (`pistasV: 2` + `recordsV1`), forma anterior aceptada, versión
  desconocida y `recordsV1` inválido rechazados

## 2. Pistas y reglas compartidas

- [x] 2.1 `juegos/karts-pistas.js`: trazados nuevos, `vueltas: 2`, mecánicas, `fijos`, río y `VERSION_PISTAS`
- [x] 2.2 `juegos/arcade.js`: `vueltasDe`, `refKarts` con las vueltas de la pista, `limitesKarts`, `LIMITE_SALA.karts`
  y `MIN_SALA.karts` (el mayor y el menor)

## 3. Servidor

- [x] 3.1 `server/carreras.ts`: importa las definiciones del juego y valida con los límites de la pista de la sala;
  `server/salas.ts` pasa `sala.opciones.mapa`
- [x] 3.2 `server/progreso.ts`: forma versionada del progreso de Karts

## 4. Juego

- [x] 4.1 `juegos/karts.html`: vueltas de la pista, cajas, monedas, lava, adornos y manchas del piso escalados, varias
  trajineras, turbo de salida ×1.8, minimapa más fino, escenario por celdas, lienzo de trabajo liberado, límite de sala
  por pista, migración de récords con aviso y «pista chica» en el selector, gancho `__karts.rapido(n)`
- [x] 4.2 `juegos/app/arcade.js`: límite de la pista en la espera de la sala; `?v=` en `juegos.html` y `karts.html`

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 5.1 `tests/e2e/e2e-karts.js`: vuelta completa con el piloto de prueba en pistas escaladas (con `rapido`), fps con
  CPU ×4 en las 8 pistas, minimapa, migración de récords, esperas de sala con el mínimo nuevo, capturas 390×844 y
  844×390 de cada pista; `tests/e2e/e2e-karts-vivo.js`: esperas con el mínimo nuevo y fps con 8 karts en vivo

## 6. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 6.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 6.2 E2E: `karts karts-vivo partidas juegos categorias emocion` y al final la suite completa (datos copiados;
  nada en tablas `stald_`)
- [ ] 6.3 Reporte en `openspec/changes/karts-pistas-grandes/reports/2026-10-13-step-6-pruebas-y-verificacion.md`

## 7. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 7.1 Capturas de cada pista a 390×844 y 844×390 y del minimapa; revisión visual e iteración
- [ ] 7.2 curl local: tiempo válido, debajo del mínimo de la pista y progreso con la forma versionada

## 8. Documentación técnica (OBLIGATORIO)

- [x] 8.1 `docs/data-model.md` (progreso de Karts con `pistasV` y `recordsV1`) y `docs/backend-standards.md`
  (límites de carreras por pista); `?v=` por encima de `main`

## 9. Publicación

- [ ] 9.1 PR en español, `gh pr checks --watch` hasta que terminen todos, merge, borrar la rama remota y verificar en
  producción. Sin `openspec archive` (lo decide el profe).
