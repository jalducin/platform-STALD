## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/futbol-en-linea` desde `origin/main`

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/futbol_red_test.ts`: cuantización de la foto (tamaño y error ≤ 0.05 m), interpolación, predicción y
  reconciliación, entrada empacada, y partido completo simulado con latencia, pérdida y desorden (posiciones dentro de
  tolerancia y mismo marcador)
- [ ] 1.2 `server/futbol_linea_test.ts`: mesa 1 vs 1 sin bots, táctica válida e inválida, resultado confirmado, en
  disputa, solo de una persona, marcador o duración imposibles y una sola vez por persona

## 2. Servidor

- [ ] 2.1 `server/futbol_linea.ts` (táctica, resultado y puntos) y `server/salas.ts`: `futbol` en `JUEGOS_PARTIDA` y
  `MESAS`, `{ tactica }` en `/unirse`, `{ futbol }` en `/respuesta` (marcado `// futbol-en-linea`)

## 3. Netcode y juego

- [ ] 3.1 `juegos/futbol-red.js`: foto cuantizada, entrada, búfer de interpolación, predicción y reconciliación,
  controladores de anfitrión e invitado sobre la API de `EnVivo`
- [ ] 3.2 `juegos/futbol.html`: modo en línea (inicio por `postMessage`, latencia, aviso de desconexión, IA y cierre a
  15 s, Emoción, fin con `fin-linea`) y respaldo con la Clasificatoria semanal

## 4. Página de Juegos

- [ ] 4.1 `juegos/mesas.js`, `juegos/app/salas.js`, `juegos/app/arcade.js`, `juegos/app/arranque.js`: sala en
  «Crear partida», táctica en la espera, iframe con canal y rol, resultado y podio (marcado `// futbol-en-linea`)

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 5.1 `server/mesas_test.ts` y E2E existentes que cuenten juegos de sala; E2E nuevo
  `tests/e2e/e2e-futbol-en-linea.js` (2 contextos, canal simulado) en `tests/e2e/correr.sh`

## 6. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 6.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 6.2 E2E: `futbol futbol-en-linea juegos categorias partidas emocion` (datos copiados; nada en tablas `stald_`)
- [ ] 6.3 Reporte en `openspec/changes/futbol-en-linea/reports/2026-10-12-step-6-pruebas-y-verificacion.md`

## 7. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 7.1 Capturas a 844×390 y 390×844 de la sala de espera con táctica, el partido en vivo con latencia y el aviso
  de desconexión; revisión visual
- [ ] 7.2 curl local: crear sala `futbol`, táctica válida e inválida, resultado válido e imposible

## 8. Documentación técnica (OBLIGATORIO)

- [ ] 8.1 `docs/backend-standards.md` / `docs/data-model.md`: asiento `tactica` y `futbol` de la sala; `?v=` en
  `juegos.html` y `futbol.html`

## 9. Publicación

- [ ] 9.1 Merge de `origin/main` con `juegos/en-vivo.js` real (sin doble local), PR en español, checks, merge y
  verificación en producción. Sin `openspec archive` (lo decide el profe).
