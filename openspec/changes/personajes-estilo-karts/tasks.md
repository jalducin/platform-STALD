## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/personajes-estilo-karts` desde `origin/main` (antes de cualquier cambio).

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/personajes_test.ts` (nuevo, Deno, carga `juegos/personajes.js`): los 8 con datos completos (id,
  nombre, título, personalidad, peso, partícula única, firma, colores de kart, paletas `base`/`fuego`, estela y
  encuadre); cada pose y poder se dibuja sin errores y con detalle (contexto de canvas falso); `piloto(id)` de los 4
  nuevos en 4 vistas; `pintarParticula` de las 4 partículas nuevas; masa y `repartoChoque`.
- [ ] 1.2 `tests/e2e/lib/personajes.js` con los 8 y `tests/e2e/e2e-plataformas.js`: selector con 8 y línea de detalle;
  caben a 320×640, 390×844 y 844×390; elegir a Tona y recargar; cada personaje nuevo dibujado (color de firma) y
  terminando el 1-1; hoja de perfiles con los 8; capturas de cerca.
- [ ] 1.3 `tests/e2e/e2e-karts.js`: «🏁 Piloto» con 8, detalle con peso; recordado tras recargar; rivales = los 7
  otros; cada personaje nuevo en su kart (color de firma) con carrera terminada; estela; capturas de cerca y hoja de
  vistas; selector a 320×640 y 844×390.
- [ ] 1.4 Correr las pruebas y confirmar que lo nuevo falla antes de implementar.

## 2. Implementación

- [ ] 2.1 `juegos/personajes.js`: Xolo, Tlali, Tona y Kinich (datos, perfil con todas las poses y poderes, `piloto(id)`
  con accesorio, `pintarParticula`), `peso`/`personalidad`/`estela`/`encuadre` para los 8, `MASA`, `masa(id)` y
  `repartoChoque`.
- [ ] 2.2 `juegos/karts.html`: selector de 8 con detalle y peso, cabezas nuevas vía `Personajes.piloto`, partículas
  nuevas, reparto del choque por masa, `masa` en `estado()`.
- [ ] 2.3 `juegos/plataformas.html`: selector de 8 con detalle y partículas nuevas.
- [ ] 2.4 `?v=` de `personajes.js` arriba de `main` en las dos páginas.
- [ ] 2.5 Revisar las capturas de cerca de cada personaje nuevo en Axo y en Karts e iterar hasta que se vean del mismo
  juego y se reconozcan.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Revisar que `e2e-karts.js`, `e2e-plataformas.js`, `e2e-mando.js`, `e2e-emocion.js`, `e2e-juegos.js` y
  `e2e-categorias.js` sigan válidas con 8 personajes (p. ej. «4 tarjetas» → 8).

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/` y `npx -y deno lint server/`.
- [ ] 4.2 E2E: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9319 --puerto-web 9329 karts
  plataformas mando emocion juegos categorias` (la copia temporal se descarta; no se escribe en tablas `stald_`).
- [ ] 4.3 `cd tests/calidad && npm run calidad` sin avisos nuevos.
- [ ] 4.4 Medir fps con CPU ×4 en Axo y Karts con los personajes nuevos a 390×844 y 844×390.
- [ ] 4.5 Reporte `openspec/changes/personajes-estilo-karts/reports/2026-10-12-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar capturas de cerca: cada personaje nuevo en Axo (hoja de poses, champiñón y chile) y en Karts (de
  espaldas en carrera y hoja de vistas); selectores a 320×640, 390×844 y 844×390. Corregir lo que no se lea.
- [ ] 5.2 Casos de error: `prefers-reduced-motion` (sin partículas) y `arcade_personaje` desconocido → Xalli.
- [ ] 5.3 Tras el merge: verificar en producción que Pages sirve `personajes.js` nuevo y los 8 en el selector.
- [ ] 5.4 Tras el merge (usuario): que el profe los pruebe en un celular real.

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: personajes (8, peso, `piloto`, `pintarParticula`, selectores).
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate personajes-estilo-karts --strict`.

## 7. Cierre

- [ ] 7.1 Commits en español; integrar `origin/main` (conservando los dos lados), PR, `gh pr checks --watch`, merge,
  borrar la rama remota y verificar producción.
- [ ] 7.2 No archivar: espera la prueba del profe. Después: `openspec archive personajes-xalli` y luego
  `openspec archive personajes-estilo-karts`.
