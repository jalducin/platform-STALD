## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-tablero` desde `origin/main` (tras `git fetch`)

## 1. Motores sin DOM (TDD)

- [ ] 1.1 Escribir primero las pruebas que fallan en `server/tablero_test.ts`:
  - Damas: salida, captura obligatoria, salto múltiple, coronación, sin jugadas y empate por 40 medios movimientos;
    jugadas del bot legales en los 2 niveles.
  - Dominó: reparto, quién sale, embonar a cada lado, pasar, ganar y juego cerrado con empate.
  - Parchís: salir con 5, 6 y comer repiten tiro, casillas seguras, tiro exacto, ganar y dado determinista.
  - Batalla naval: flota válida e inválida, acomodo automático, agua, tocado y hundido, y bot que caza.
- [ ] 1.2 `juegos/tablero.js` (`globalThis.Tablero`) hasta que pasen

## 2. Servidor (TDD)

- [ ] 2.1 Pruebas que fallan en `server/naval_test.ts`:
  - flota inválida y repetida;
  - disparos: turno, casilla repetida, sin flota, `n` tomado, agua, tocado y hundido, y fin;
  - rendirse y reclamar antes y después de 90 s;
  - `GET` que solo trae la flota propia, Realtime sin flotas y flotas reveladas al terminar.
- [ ] 2.2 Pruebas de sala en `server/tablero_test.ts`:
  - formas válidas e inválidas de jugada en `damas`, `domino` y `parchis`;
  - mesas en `MESAS` (`mesas-con-bots`): 2 en `damas` (con bot opcional) y `naval` (solo personas);
  - mesa de 4 en `domino` y `parchis`, con bots que completan los asientos;
  - `faltan_jugadores`.
- [ ] 2.3 `server/naval.ts`, `server/tablero.ts`, ganchos en `server/salas.ts` y catálogo en `server/juegos.ts`, con
  bloques `// juegos-tablero`

## 3. Interfaz

- [ ] 3.1 `juegos/tablero.css` y `juegos/tablero-ui.js`:
  - Damas: individual (2 niveles) y sala;
  - Dominó: individual (3 bots) y sala;
  - Parchís: individual (rápida o completa) y sala;
  - Batalla naval: acomodo manual y automático, contra el bot y sala con «⏰ Reclamar victoria»;
  - «📖 Cómo se juega» de los 4.
- [ ] 3.2 Ganchos mínimos en `juegos.html` (`// juegos-tablero`): tarjetas, ids de sala, participantes, pintar, clic,
  ayuda, nota del selector y aviso de faltan jugadores

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Conteo del menú en `e2e-juegos`, `e2e-fusion` y `e2e-clasicos`: de 24 a 28 juegos
- [ ] 4.2 E2E nueva `tests/e2e/e2e-juegos-tablero.js`, registrada en `tests/e2e/correr.sh` (fase `base`):
  - cada juego en individual;
  - Damas y Batalla naval en sala con 2 personas;
  - Dominó y Parchís en sala con bots, y la mesa del Dominó (3 personas + 1 bot; con la cuarta, sin bot);
  - capturas a 390 px.

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [ ] 5.2 E2E: `juegos-tablero juegos fusion clasicos revancha ranking-juegos partidas ajedrez una-sala poker
  cartas-espanolas`, con la copia de datos de prueba. La copia se descarta al terminar (estado restaurado).
- [ ] 5.3 Revisar las capturas a 390 px de los 4 juegos
- [ ] 5.4 Reporte `openspec/changes/juegos-tablero/reports/AAAA-MM-DD-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 `curl` contra un servidor local:
  - crear una sala de Batalla naval;
  - enviar las flotas;
  - comprobar que el `GET` del rival no trae la flota;
  - disparar fuera de turno (409) y a una casilla válida;
  - consultar sin estar en la sala (403).
  - Al terminar se descarta la copia de datos.

## 7. Documentación (OBLIGATORIO)

- [ ] 7.1 Actualizar `docs/backend-standards.md` (jugadas, mesas y Batalla naval en el servidor) y
  `docs/data-model.md` (campos nuevos de la sala)
- [ ] 7.2 Actualizar `docs/frontend-standards.md` (sección de juegos de tablero) y validar con
  `npx -y @fission-ai/openspec@1.4.1 validate juegos-tablero --strict`

## 8. Cierre

- [ ] 8.1 Tras el merge (usuario): redeploy de Deno Deploy, verificación en producción y `openspec archive juegos-tablero`
