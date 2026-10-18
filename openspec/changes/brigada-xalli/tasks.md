## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/brigada-xalli` desde `origin/main` (PR 1); para el PR 2,
  `feature/brigada-xalli-coop` desde `origin/main` ya con el PR 1

## PR 1 — Juego individual, misiones, avance y ranking

### 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/brigada_motor_test.ts`: física determinista (correr con inercia, salto variable, escalones,
  plataformas, agacharse), apuntado de 8 y 4 direcciones, armas (cadencia, munición, abanico, láser que atraviesa,
  globo de área), enemigos (aparecen con la cámara, disparan, Escudobot), rescates y premios, vehículo, corazones,
  vidas, burbuja y revivir, puntos de control y reintento, cámara compartida con liga, jefes con patrón de semilla
  (misma semilla → misma partida), estrellas, puntos, `puntosMaximos`, escalado por personajes, avance válido e
  inválido, y las 4 misiones terminadas por el piloto automático (1, 4 y 8 personajes, varias semillas)
- [x] 1.2 `server/brigada_test.ts`: catálogo (tope 1000), progreso `brigada` (forma exacta, versión, récord imposible,
  misión bloqueada, 409 `version_vieja`)

### 2. Motor y misiones (sin DOM)

- [x] 2.1 `juegos/brigada-misiones.js`: 4 misiones (suelo, plataformas, puntos de control, enemigos, jaulas, objetos,
  vehículo, minijefe y jefe)
- [x] 2.2 `juegos/brigada-motor.js`: física, armas, enemigos, jefes, rescates, vehículo, cámara, IA, puntos, estrellas,
  plausibilidad y avance

### 3. Servidor

- [x] 3.1 `server/brigada.ts` (avance y reglas del motor) y cambios marcados `// brigada` en `server/progreso.ts`
  (`JUEGOS_PROGRESO`, validación) y `server/juegos.ts` (`CATALOGO`)

### 4. Juego

- [x] 4.1 `juegos/brigada.html`: vista con fondos y sprites pre-dibujados, HUD, controles (toques A/B/X/Y, mando,
  Gamepad, teclado), portada con personaje, mapa de misiones y compañeros IA, Emoción, fin de misión con estrellas,
  récord, puntos y siguiente misión; avance por `postMessage`

### 5. Página de Juegos

- [x] 5.1 `juegos/app/menu.js` (tarjeta) y `?v=` en `juegos.html` (marcado `// brigada`)

### 6. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 6.1 Pruebas del servidor y E2E existentes que cuenten juegos de Arcade o progreso; E2E nueva
  `tests/e2e/e2e-brigada.js` (misión con toques reales, mando y control físico, teclado, rescate, jefe vencido, fin con
  estrellas y avance guardado, capturas y fps con CPU ×4) en `tests/e2e/correr.sh`

### 7. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 7.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 7.2 E2E: `brigada juegos categorias partidas emocion mando` (datos copiados; nada en tablas `stald_`)
- [x] 7.3 Reporte en `openspec/changes/brigada-xalli/reports/2026-10-17-step-7-pruebas-y-verificacion.md`

### 8. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 8.1 Revisión de capturas a 390×844 (vertical), 844×390 y escritorio (acción, rescate, jefe, fin) e iteración
- [x] 8.2 curl local: GET/PUT del avance válido, forma inválida, récord imposible, versión vieja; ranking topado

### 9. Documentación técnica (OBLIGATORIO)

- [x] 9.1 `docs/frontend-standards.md` (Brigada Xalli), `docs/backend-standards.md` / `docs/data-model.md` (avance
  `brigada`), `?v=` en `juegos.html`

### 10. Publicación PR 1

- [x] 10.1 Merge de `origin/main`, PR en español, checks, merge, borrar la rama remota y verificación en producción

## PR 2 — Cooperativo en vivo de hasta 8

### 11. Pruebas que fallan primero (TDD)

- [x] 11.1 `server/brigada_red_test.ts`: foto cuantizada (8 personajes, 24 enemigos, 16 proyectiles < 1700 B), entrada
  con contadores de presiones, misión en red de 4 y de 8 con `EnVivo.redSimulada` (latencia, pérdida y desorden): los
  mismos enemigos en todos, jefe vencido visto por todos, personaje propio predicho cerca del autoritativo,
  desconexión con IA y regreso, caída del anfitrión; envíos por segundo medidos
- [x] 11.2 `server/brigada_test.ts`: sala de 1 a 8 (sin bots y con compañeros), mesa igual en servidor y página,
  misión de la sala, personaje por asiento, resultado válido, implausible, una vez por persona, estado
  confirmado/disputa e invitado, puntos de ranking del servidor

### 12. Red y servidor

- [x] 12.1 `juegos/brigada-red.js`: foto, entrada, anfitrión e invitado
- [x] 12.2 `server/brigada.ts` (opciones, reporte, resultado y puntos) y cambios marcados `// brigada` en
  `server/salas.ts` (JUEGOS_PARTIDA, MESAS, personaje, /respuesta, vista) y `server/juegos.ts` (puntos de sala)

### 13. Juego y página en sala

- [x] 13.1 `juegos/brigada.html` modo sala: local (una persona + compañeros), en vivo (anfitrión/invitado), latencia,
  avisos de desconexión, respaldo y `fin-sala`
- [x] 13.2 `juegos/mesas.js`, `juegos/app/salas.js`, `juegos/app/arcade.js`, `juegos/app/arranque.js`, `juegos.html`:
  misión al crear, personaje en la espera, iframe con canal, resultado y podio (marcado `// brigada`)

### 14. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 14.1 `tests/e2e/e2e-brigada.js` con sala de 4 contextos en el canal simulado (mismos enemigos, jefe vencido,
  desconexión, podio en todos), chequeo ligero con 8 contextos, fps del anfitrión con 8 personajes y CPU ×4, respaldo y
  capturas

### 15. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 15.1 `npx -y deno test -A server/`, `deno lint`, calidad sin avisos nuevos
- [x] 15.2 E2E: `brigada juegos categorias partidas emocion mando`
- [x] 15.3 Reporte en `openspec/changes/brigada-xalli/reports/2026-10-17-step-15-pruebas-y-verificacion.md`

### 16. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 16.1 Capturas del cooperativo con 4+ personas, jefe y podio (390×844, 844×390 y escritorio) e iteración
- [x] 16.2 curl local: crear sala de 8, personaje, resultado válido e imposible, ranking de sala

### 17. Documentación técnica (OBLIGATORIO)

- [x] 17.1 `docs/frontend-standards.md`, `docs/backend-standards.md` y `docs/data-model.md` (sala `brigada`), `?v=`

### 18. Publicación PR 2

- [ ] 18.1 Merge de `origin/main`, PR en español, checks, merge, borrar la rama remota y verificación en producción.
  Sin `openspec archive` (lo decide el profe).
