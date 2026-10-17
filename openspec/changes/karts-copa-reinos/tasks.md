## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/karts-copa-reinos` desde `origin/main`; cambio OpenSpec validado con `--strict`

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/karts_pistas_test.ts`: 4 pistas nuevas cerradas, sin encimarse, radio ≥ 100, referencia de 115 a
  140 s, textura ≤ 12.6 M px, minimapa legible, meta afuera, tramos interiores (≥ 600 px, ancho 0.8–1), mecánicas
  nuevas sobre el camino y deterministas (`alturaBloque`, `ladoRoca`, `centroCompuerta`), columnas sobre el camino,
  copas por dificultad con `requiere`, ids válidos y límites por pista
- [ ] 1.2 `server/karts_copa_test.ts`: sala de copa `reinos`, copa mixta de todas las copas, `COPAS_SALA` derivada
- [ ] 1.3 `server/carreras_test.ts`: sala en una pista nueva con su mínimo y su límite; `MAPAS_SALA` = pistas de sala

## 2. Pistas y reglas compartidas

- [ ] 2.1 `juegos/karts-pistas.js`: 4 pistas, `interiores`, `obstaculos`, mecánicas nuevas y sus funciones puras,
  `tramosInteriores`, `muroEn`, copa `reinos` con `dificultad` y `requiere`, `copasPorDificultad`
- [ ] 2.2 `juegos/karts-copa.js`: `COPAS_SALA`, `NOMBRE`, `EMOJI` derivados y copa mixta de todas las copas

## 3. Servidor

- [ ] 3.1 `server/carreras.ts`: `MAPAS_SALA.karts` desde `Arcade.PISTAS`

## 4. Juego y página de Juegos

- [ ] 4.1 `juegos/karts.html`: piso interior, muros 3D, portadas, cielo interior, viñeta y antorchas, física de
  muros, mecánicas nuevas (dibujo y efecto), columnas, esquivar, bots ×`bots`, minimapa con interiores, menú por
  dificultad con candado, ganchos de prueba
- [ ] 4.2 `juegos/app/salas.js`: «Copa completa» desde `KartsPistas.COPAS`; `?v=` en `juegos.html` y `karts.html`

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 5.1 `tests/e2e/e2e-karts.js`: selector con 16 pistas en 3 copas, candado y apertura de la copa, carrera 1 en Giza,
  mecánicas nuevas, vuelta completa con el piloto de prueba, fps con CPU ×4, capturas afuera y adentro a 390×844 y
  844×390; `tests/e2e/e2e-karts-vivo.js`: sala en una pista nueva y fps con 8 karts en vivo adentro

## 6. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 6.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 6.2 E2E: `karts karts-vivo juegos categorias` (datos copiados; nada en tablas `stald_`)
- [ ] 6.3 Reporte en `openspec/changes/karts-copa-reinos/reports/2026-10-17-step-6-pruebas-y-verificacion.md`

## 7. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 7.1 Capturas de cada pista nueva afuera y adentro a 390×844 y 844×390; revisión visual e iteración
- [ ] 7.2 curl local: sala de copa `reinos`, sala en una pista nueva, tiempo debajo del mínimo (400) y copa inválida

## 8. Documentación técnica (OBLIGATORIO)

- [ ] 8.1 `docs/data-model.md` (llaves de copa y pistas nuevas en el progreso de Karts) y `docs/backend-standards.md`
  (mapas de sala derivados); `?v=` por encima de `main`

## 9. Publicación

- [ ] 9.1 Fusionar `origin/main` (conservar ambos lados), PR en español, `gh pr checks --watch` hasta que terminen
  todos, merge, borrar la rama remota y verificar en producción. Sin `openspec archive`.
