## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/futbolito-arena` desde `origin/main`

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/arena_motor_test.ts`: física determinista (balón, paredes, postes, choques, embestida y giro con
  recarga), detección de gol y saque, fin por goles y por tiempo con gol de oro, IA (Fácil vencible, Difícil > Fácil),
  reparto de equipos y puntos
- [x] 1.2 `server/arena_red_test.ts`: foto cuantizada (tamaño 2v2 y 3v3, error ≤ 0.05), entrada con contador de
  presiones, partido 2 vs 2 con `EnVivo.redSimulada` (latencia, pérdida y desorden): mismo marcador, robot propio
  predicho cerca del autoritativo, desconexión con IA y regreso, caída del anfitrión; mensajes por segundo medidos
- [x] 1.3 `server/arena_test.ts`: catálogo, sala 2v2/1v1/1v2/3v3, equipos y robot, equipo lleno, resultado confirmado,
  en disputa, imposible, una vez por persona, puntos de ranking del servidor; `server/mesas_test.ts` con la mesa nueva

## 2. Motor y red (sin DOM)

- [x] 2.1 `juegos/arena-motor.js`: arenas, física, reglas, IA, reparto, validación y puntos
- [x] 2.2 `juegos/arena-red.js`: foto, entrada, anfitrión e invitado sobre la API de `EnVivo`

## 3. Servidor

- [x] 3.1 `server/arena.ts` (opciones, equipo, robot, resultado) y cambios marcados `// futbolito-arena` en
  `server/salas.ts` (JUEGOS_PARTIDA, MESAS, /unirse, /respuesta, vista) y `server/juegos.ts` (CATALOGO y puntos de sala)

## 4. Juego

- [x] 4.1 `juegos/futbolito-arena.html`: vista con arena pre-dibujada y rotación, HUD, controles (toques, mando,
  Gamepad, teclado), menú contra la IA, Emoción, fin con puntos y revancha
- [x] 4.2 Modo sala: inicio por `postMessage`, local (una persona + bots), en vivo (anfitrión/invitado), latencia,
  avisos de desconexión, respaldo y `fin-sala`

## 5. Página de Juegos

- [x] 5.1 `juegos/app/menu.js`, `juegos/mesas.js`, `juegos/app/salas.js`, `juegos/app/arcade.js`, `juegos/app/arranque.js`,
  `juegos.html`: tarjeta, opciones al crear, equipos y robot en la espera, iframe con canal, resultado y podio (marcado
  `// futbolito-arena`)

## 6. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 6.1 Pruebas del servidor y E2E existentes que cuenten juegos o mesas; E2E nuevo `tests/e2e/e2e-futbolito-arena.js`
  (solo con toques reales, mando, teclado, gol, sala 2 vs 2 con 4 contextos en canal simulado, desconexión, respaldo,
  podio, capturas y fps con CPU ×4) en `tests/e2e/correr.sh`

## 7. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 7.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 7.2 E2E: `futbolito-arena futbol futbol-en-linea juegos categorias partidas emocion mando` (datos copiados; nada en
  tablas `stald_`)
- [x] 7.3 Reporte en `openspec/changes/futbolito-arena/reports/2026-10-17-step-7-pruebas-y-verificacion.md`

## 8. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 8.1 Revisión de capturas a 390×844, 844×390 y escritorio (arena, controles, gol, sala de espera 2 vs 2, podio) e
  iteración
- [x] 8.2 curl local: crear sala 2v2 y 3v3, equipo válido, lleno e inválido, robot, resultado válido e imposible

## 9. Documentación técnica (OBLIGATORIO)

- [x] 9.1 `docs/frontend-standards.md` (Futbolito Arena), `docs/backend-standards.md` / `docs/data-model.md` (asiento
  `equipo`, `robot` y `arena`), `?v=` en `juegos.html`

## 10. Publicación

- [ ] 10.1 Merge de `origin/main`, PR en español, checks, merge y verificación en producción. Sin `openspec archive`
  (lo decide el profe).
