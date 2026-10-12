## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/juegos-salas-grandes` desde `origin/main` (tras `git fetch`)

## 1. Servidor (TDD)

- [ ] 1.1 Pruebas que fallan en `server/salas_grandes_test.ts`: Bingo (canto y cartón deterministas, paridad con
  `juegos/bingo.js`, figuras, bingo falso o verdadero, figura inválida), Blackjack (acciones y montos), Dibuja
  (cupo y mínimo, turnos y calendario, la palabra no se filtra en GET ni en Realtime, trazo de quien no dibuja,
  tamaño y frecuencia, adivinar bien, mal, «casi» y repetido) y Memorama/Sopa en sala (criterio, resultado válido,
  imposible y repetido)
- [ ] 1.2 `server/salas_grandes.ts` y ganchos en `server/salas.ts` (`// juegos-salas-grandes`)
- [ ] 1.3 `bingo`, `blackjack` y `dibuja` en `CATALOGO` de `server/juegos.ts`

## 2. Cliente

- [ ] 2.1 `juegos/bingo.js`: reglas puras, individual contra bots y sala (canto, cartón, ¡Bingo! validado, podio)
- [ ] 2.2 `juegos/blackjack.js`: motor, fichas, individual contra la banca y sala por pasos
- [ ] 2.3 `juegos/dibuja.js`: lienzo, trazo simplificado y por lotes, adivinar, turnos, pausa y práctica individual
- [ ] 2.4 `juegos/memo-sopa-sala.js`: tablero por semilla, envío de resultado, avance, bots y podio
- [ ] 2.5 Ganchos en `juegos.html` (`// juegos-salas-grandes`): scripts, tarjetas, `JUEGOS_PARTIDA`,
  `TIEMPO_REAL`, `entrarSala`, `participantes`, `pintarSala`, clic, opciones del formulario y ayuda

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Conteo del menú en `e2e-juegos`, `e2e-fusion` y `e2e-clasicos` (24 → 27 juegos; Clásicos 7 → 9)
- [ ] 3.2 E2E nueva `tests/e2e/e2e-salas-grandes.js` registrada en `tests/e2e/correr.sh` (fase `base`): Bingo con 3
  personas y bots, Blackjack individual y en sala, Dibuja y adivina con 3 personas, Memorama y Sopa en sala y
  capturas a 390 px

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [ ] 4.2 E2E: `salas-grandes juegos fusion clasicos revancha ranking-juegos partidas loteria-sala poker peticiones`
  con la copia de datos de prueba (la copia se descarta al terminar: estado restaurado)
- [ ] 4.3 Revisar las capturas a 390 px de los cinco juegos
- [ ] 4.4 Reporte `openspec/changes/juegos-salas-grandes/reports/2026-10-11-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 `curl` contra un servidor local: crear salas de los cinco juegos (opciones válidas e inválidas), bingo falso,
  jugada de blackjack con monto inválido, empezar Dibuja con 2 personas, GET de quien adivina sin la palabra y
  resultado imposible de Sopa; sin sesión y correo sin registro
- [ ] 5.2 Tras el merge (usuario): redeploy y Pages; en producción, solo lectura: el inicio muestra los 27 juegos y
  `/juegos/yo` lista `bingo`, `blackjack` y `dibuja`

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/backend-standards.md` (respuestas nuevas de sala, secreto de Dibuja, catálogo 27) y
  `docs/data-model.md` (campos nuevos de sala y jugador)
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate juegos-salas-grandes --strict`

## 7. Cierre

- [ ] 7.1 Commits en español; sin push, PR ni merge (los hace el usuario). Tras el merge: `openspec archive`
