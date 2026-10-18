## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/karts-control-sala-y-ceremonia` desde `origin/main`.
- [x] 0.2 Crear el cambio OpenSpec y validarlo con `openspec validate --strict`.

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/karts_ceremonia_test.ts`: orden de la escena (3.º → 2.º → 1.º), datos tomados del podio sin
  reordenar, empates (misma medalla), menos de 3 lugares, momentos (`secuencia`, `estadoEn`) e inicio en sala.
- [ ] 1.2 `tests/e2e/e2e-karts-vivo.js` (`KARTS_VIVO_SOLO=ceremonia`): sala de 2 + espectador (con movimiento
  reducido): «🎮 Tu control» preseleccionado, elegir Joystick aplica en la carrera y se recuerda, permiso del sensor
  en el toque (simulado), ⚙️ a media carrera sin pausa, ceremonia al final en los 3 aparatos a la misma hora con 3
  personajes, «Saltar», versión fija con movimiento reducido, capturas a 390×844 y 844×390.
- [ ] 1.3 `copaEnSala`: ceremonia al final de la copa en sala.
- [ ] 1.4 `tests/e2e/e2e-karts.js` (`KARTS_SOLO=ceremonia`): ceremonia al terminar la copa individual.
- [ ] 1.5 Correr y confirmar que fallan antes de implementar.

## 2. Implementación

- [ ] 2.1 `juegos/karts-ceremonia.js` (`window.KartsCeremonia`).
- [ ] 2.2 `juegos/app/arcade.js`: tarjeta «🎮 Tu control» y permiso del sensor; ceremonia en `finalArcade` y
  `finalCopa` con la hora de cierre del servidor. `juegos/app/arranque.js`: clics. `juegos/app/salas.js`:
  `pintarFinalSala` sin `Emocion.podio` mientras hay ceremonia.
- [ ] 2.3 `juegos/karts.html`: botón ⚙️ y panel en sala, `releerControl` en cada `inicio`, sensor silencioso en sala,
  ceremonia en la copa individual.
- [ ] 2.4 `juegos.html` y `juegos/karts.html`: `?v=` por encima de `main`.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Revisar las E2E que pasan por el podio de Karts en sala (`e2e-karts-vivo.js`, `e2e-espectador.js`,
  `e2e-emocion.js`, `e2e-revancha.js`) por la capa de la ceremonia y el `Emocion.podio`.

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 E2E `karts karts-vivo espectador mando emocion` con datos temporales (sin escribir en tablas `stald_`).
- [ ] 4.2 `npx -y deno test -A server/` y `npx -y deno lint`; `cd tests/calidad && npm run calidad` sin avisos nuevos.
- [ ] 4.3 Reporte `openspec/changes/karts-control-sala-y-ceremonia/reports/2026-10-18-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar las capturas de la ceremonia y del selector a 390×844 y 844×390. Casos de error: ceremonia que ya
  pasó (no se muestra), menos de 3 corredores, sensor sin permiso.

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: control en sala y ceremonia (fuente: este cambio).

## 7. Publicación

- [ ] 7.1 Merge de `origin/main` conservando ambos lados (43a y 43b), PR en español, checks en verde, merge y
  verificación en producción. Sin archivar.
