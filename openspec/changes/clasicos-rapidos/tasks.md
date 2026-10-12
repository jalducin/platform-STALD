## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/clasicos-rapidos` desde `origin/main` (tras `git fetch`)

## 1. Servidor: clásicos rápidos en sala (TDD)

- [ ] 1.1 Pruebas que fallan en `server/clasicos_rapidos_test.ts`: crear sala de los 5 juegos, jugadas válidas e
  inválidas de cada juego, `turno_tomado`, primera elección por ronda en `ppt`, ocultar la elección ajena, cupos,
  sin bots y `faltan_jugadores` en Gato y Conecta 4, modo del Ahorcado (y revancha que lo conserva), catálogo y tope
- [ ] 1.2 `server/clasicos_rapidos.ts` y ganchos localizados (`// clasicos-rapidos`) en `server/salas.ts` y
  `server/juegos.ts`

## 2. Motor compartido (TDD)

- [ ] 2.1 Pruebas que fallan en `server/clasicos_rapidos_motor_test.ts`: líneas y empates de Gato, minimax que nunca
  pierde, caída/columna llena/4 en línea/empate de Conecta 4, reglas y puntos de Piedra, papel o tijera, estado del
  Ahorcado, escaleras/serpientes/meta, y reproducción de cada sala (turnos, jugadas inválidas ignoradas, tiempo
  agotado, fin de partida y empates)
- [ ] 2.2 `juegos/clasicos-rapidos.js` (reglas, bots y reproducción de salas)

## 3. Interfaz

- [ ] 3.1 `juegos/clasicos-rapidos-ui.js` y `juegos/clasicos-rapidos.css`: modos individuales de los 5 juegos
- [ ] 3.2 Salas de los 5 juegos (dibujo, clics, podio con `pintarFinalSala`) y ayudas «📖 Cómo se juega»
- [ ] 3.3 Ganchos en `juegos.html` (tarjetas, ids de partida y de tiempo real, `pintarSala`, opciones al crear y
  ayudas), marcados con `// clasicos-rapidos`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Conteo del menú en `e2e-juegos`, `e2e-fusion` y `e2e-clasicos`: 24 → 29 juegos (Clásicos 7 → 12)
- [ ] 4.2 E2E nueva `tests/e2e/e2e-clasicos-rapidos.js`, registrada en `tests/e2e/correr.sh` (fase `base`): cada juego
  en individual, Gato y Conecta 4 en sala con 2 personas, Piedra, papel o tijera con bots y capturas a 390 px

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [ ] 5.2 E2E `clasicos-rapidos juegos fusion clasicos revancha ranking-juegos partidas ajedrez una-sala` con la copia
  de datos de prueba (la carpeta original no se modifica; `correr.sh` descarta su copia: estado restaurado)
- [ ] 5.3 Revisar las capturas a 390 px de los 5 juegos
- [ ] 5.4 Reporte `openspec/changes/clasicos-rapidos/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 `curl` contra un servidor local con una copia de datos: crear sala de cada juego, jugada válida e inválida,
  `ppt` oculto y revelado, sala llena, `faltan_jugadores`, modo inválido y sin sesión; restaurar (copia descartada)
- [ ] 6.2 Tras el merge (usuario): redeploy y Pages; en producción, solo lectura: el inicio muestra los 5 juegos y
  `/juegos/yo` los lista en el catálogo

## 7. Documentación (OBLIGATORIO)

- [ ] 7.1 `docs/backend-standards.md` (jugadas, cupos, ocultamiento, catálogo 29), `docs/data-model.md` (campos de
  `jugadas[]` y `opciones.modo`) y `docs/frontend-standards.md` (módulos y ganchos)

## 8. Cierre

- [ ] 8.1 `npx -y @fission-ai/openspec@1.4.1 validate clasicos-rapidos --strict`
- [ ] 8.2 Tras el merge (usuario): `openspec archive clasicos-rapidos`
