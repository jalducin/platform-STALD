## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/personajes-xalli` desde `origin/main` (antes de cualquier cambio).

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 Ampliar `tests/e2e/e2e-plataformas.js`:
  - la portada muestra los 4 personajes con nombre y título, y Xalli elegido;
  - el avance viejo (guardado sin personaje) carga con Xalli y el texto habla de «Xalli»;
  - elegir a Yahui, recargar Juegos y verlo elegido y jugando;
  - con cada personaje (juego suelto): se dibuja (píxeles con su color de firma en la caja del jugador, captura de
    cerca) y se termina el 1-1 con «¡Nivel superado!»;
  - valor desconocido en `arcade_personaje` y `localStorage` bloqueado → Xalli sin errores.
- [x] 1.2 Ampliar `tests/e2e/e2e-karts.js`:
  - el menú muestra «🏁 Piloto» con los 4 y Xalli elegido; tras elegir a Itzae y recargar sigue elegido;
  - en la copa tu kart es el de tu personaje y los 7 bots usan los otros 3; en sala los 2 fantasmas también;
  - con cada personaje (juego suelto): se dibuja (color de firma en la caja de tu kart, captura de cerca) y se termina
    una carrera rápida con resultados;
  - valor desconocido → Xalli.
- [x] 1.3 Correr las dos E2E y confirmar que lo nuevo falla antes de implementar.

## 2. Implementación

- [x] 2.1 `juegos/personajes.js`: datos, `normalizar`, `preferencia`, `pintar` (Xalli a partir de `pintarAxo`, Itzae,
  Yahui y Xochiquetzal con todas las poses y poderes) y `retrato` (design §1–§2).
- [x] 2.2 `juegos/plataformas.html`: cargar `personajes.js`, dibujar al elegido, selector en la portada (§5), retrato
  del mapa, partícula del personaje, textos «Xalli», ganchos de prueba (`personaje`, `cajaJugador`).
- [x] 2.3 `juegos/karts.html`: `partesKart` con paleta del personaje y color de identidad, cabeza de espaldas por
  personaje, caché con el personaje, bots con los otros (§3–§4), selector «🏁 Piloto» en el menú, estela del turbo,
  ganchos de prueba (`personaje`, `personajes`, `cajaYo`).
- [x] 2.4 Revisar las capturas de cerca contra la imagen de referencia e iterar hasta que se lean claro.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar que las verificaciones de `e2e-plataformas.js`, `e2e-karts.js`, `e2e-mando.js`, `e2e-dragon-run.js`
  y `e2e-juegos.js` sigan válidas (p. ej. «Axo camina con el teclado» pasa a hablar de Xalli sin cambiar expectativa).

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 E2E: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9139 --puerto-web 9149 (9049 lo ocupaba otro agente)
  plataformas karts mando dragon-run juegos` (la copia temporal se descarta; no se escribe en tablas `stald_`).
- [x] 4.2 `npx -y deno test -A server/` y lint.
- [x] 4.3 Medir fps con CPU ×4 (Playwright + `Emulation.setCPUThrottlingRate`) en los dos juegos a 390×844 y 844×390
  con cada personaje.
- [x] 4.4 Reporte `openspec/changes/personajes-xalli/reports/2026-10-12-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar capturas de cerca de cada personaje (plataformas: quieto, saltando y festejando; Karts: de espaldas en
  carrera) y los selectores a 320×640, 390×844 y 844×390; corregir lo que no se lea.
- [x] 5.2 Casos de error: `prefers-reduced-motion` (sin partículas), valor desconocido, `localStorage` bloqueado.
- [ ] 5.3 Tras el merge (usuario): que el profe los vea en un celular real.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md`: personajes (módulo, preferencia, dibujo por juego, bots y salas). Sin cambios en
  `docs/data-model.md` (el progreso no cambia).
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate personajes-xalli --strict`.

## 7. Cierre

- [ ] 7.1 Commits en español; sin push, PR ni merge (lo integra el coordinador). Tras el merge:
  `openspec archive personajes-xalli`.
