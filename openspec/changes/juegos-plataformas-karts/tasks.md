## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-plataformas-karts` desde `origin/main` (tras `git fetch`)

## 1. Servidor: progreso individual (TDD)

- [x] 1.1 Pruebas que fallan en `server/progreso_test.ts`: GET vacío, PUT y GET, versión vieja (409), forma y tamaño
  inválidos (400/413), juego sin progreso, método no permitido, aislamiento por jugador y sin registro (403)
- [x] 1.2 `server/progreso.ts` (validadores de `plataformas` y `karts`, escritura condicional) y la ruta
  `/juegos/progreso/<juego>` en `server/juegos.ts`; `plataformas` y `karts` en `CATALOGO` (`arcade`, tope 2000)

## 2. Servidor: carreras en sala (TDD)

- [x] 2.1 Pruebas que fallan en `server/carreras_test.ts`: crear sala de `plataformas`/`karts`, enviar tiempo,
  solo cuenta el primero, mínimos y límites, tiempo que no cuadra con el reloj, `ms: null`, antes de empezar (409)
- [x] 2.2 `server/carreras.ts` y el campo `carrera` en `server/salas.ts` (cambio localizado)

## 3. Módulo compartido

- [x] 3.1 `juegos/arcade.js`: RNG, mundos, pistas y muestreo, referencias, mapa de sala, tiempos de bots, puntos
  por lugar y límites

## 4. Juego de plataformas

- [x] 4.1 `juegos/plataformas.html`: motor (paso fijo, cámara, tiles, física por mundo), personaje, enemigos,
  power-ups, checkpoint, i-frames, jefe y tramos
- [x] 4.2 Mapa de mundos, avance, mensajes con la plataforma, modo sala, audio, pausa, accesibilidad y ganchos de
  prueba

## 5. Juego de karts

- [x] 5.1 `juegos/karts.html`: pista pre-dibujada, conducción, derrape y mini-turbo, turbo de salida, monedas,
  ítems y bots con ajuste acotado
- [x] 5.2 Copa, carrera rápida, taller, avance, modo sala con bots fantasma, audio, pausa y ganchos de prueba

## 6. Integración en `juegos.html`

- [x] 6.1 Categoría 🕹️ Arcade, tarjetas, `jugarArcade` (iframe e intermediario de mensajes: progreso y puntos)
- [x] 6.2 Salas: ids en `JUEGOS_PARTIDA`, selector de nivel o pista, `pintarArcadeSala` (iframe, envío del tiempo,
  espera y podio con tiempos vía `pintarFinalSala`)
- [x] 6.3 Integrar `origin/main` (revancha `revancha-partidas`): mapa en `sala.opciones.mapa` (servidor, TDD) para que
  la revancha lo herede; E2E `revancha` en la regresión

## 7. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 7.1 E2E que cuentan juegos y categorías del inicio (`e2e-juegos`, `e2e-clasicos`, `e2e-fusion`: 21 → 23
  juegos, 5 → 6 categorías)
- [x] 7.2 E2E nuevas `tests/e2e/e2e-plataformas.js` y `tests/e2e/e2e-karts.js`, registradas en
  `tests/e2e/correr.sh` (fase `base`): jugar, progreso guardado y recuperado tras recargar, partida sin progreso,
  podio con bots, capturas a 390 px y en escritorio

## 8. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 8.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [x] 8.2 E2E: `plataformas karts juegos partidas juegos-recarga ajustes-salas ritmo dragon-run peticiones` (más
  `clasicos fusion revancha`) con la copia de datos de prueba; la copia se descarta al terminar (estado restaurado)
- [x] 8.3 Revisar las capturas (390 px y escritorio) de ambos juegos
- [x] 8.4 Reporte `openspec/changes/juegos-plataformas-karts/reports/2026-10-11-step-8-pruebas-y-verificacion.md`

## 9. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 9.1 `curl` contra el servidor local: GET/PUT de progreso (válido, versión vieja, forma inválida, sin registro,
  juego sin progreso) y envío de carrera en sala (válido e imposible)
- [ ] 9.2 Tras el merge (usuario): redeploy y Pages; en producción, solo lectura: el inicio muestra Arcade y
  `/juegos/yo` lista `plataformas` y `karts`

## 10. Documentación (OBLIGATORIO)

- [x] 10.1 `docs/backend-standards.md` (ruta de progreso, `carrera` en salas, catálogo 23),
  `docs/data-model.md` (`juegos/progreso/…` y `carrera` del jugador en sala) y `docs/frontend-standards.md`
  (juegos de Arcade en iframe y `juegos/arcade.js`)
- [x] 10.2 `openspec validate juegos-plataformas-karts --strict`

## 11. Cierre

- [ ] 11.1 Commits en español; sin push, PR ni merge (los hace el usuario). Tras el merge: `openspec archive`
