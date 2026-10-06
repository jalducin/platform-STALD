# Reporte Step 4.3 — Fase 2 de «Inglés sin Notion»: pruebas y verificación

- Fecha: 2026-10-06 (corridas en la noche del 2026-10-05, hora de CDMX)
- Cambio: cierre-tecnico (tarea 4.3, post-apply)
- Rama: `feature/ingles-sin-notion-fase2` (desde `origin/main` 4fd44e8)
- Agente: Claude Code (Opus 5.5)

## Qué cambió

- Servidor: `filasIngles()` = `aplicarAlumnos([], registro)`; `handleAlumnos` con `filas: () => Promise.resolve([])`;
  sin importación de la fase 1; sin `POST /ingles/data/<id>/completado` (404 `not_found`); fuera `server/completar.ts`,
  `filasNotion`, `marcasFixture`, `parcheCompletado`, `CLASES_INGLES_DB_ID`, `extractInglesRow`, `sinHuerfanas` e
  `importarNotion`. Secundaria sin cambios.
- Páginas (`ingles/*.js`): sin tareas, botones ni calificaciones de Notion; bloques del admin desde el registro.
- E2E: `tests/fixtures/alumnos-ejemplo.json` (Marisol, Angel, Jesus, Laura y Fernando, `@example.com`,
  `origen: "notion"`) se combina en `correr.sh` con el `alumnos.json` de la copia; `rows-fixture.json` sin `ingles`.

## Comandos ejecutados

- Línea base sobre una exportación de `origin/main` (`git archive` en el scratchpad, para no mezclarla con la rama):
  `CHROME=<chromium-1228> bash <base>/tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8877 --puerto-web 8855`
- `npx -y deno test -A server/` (en la base y en la rama)
- `npx -y deno lint server/`
- `npx -y deno check server/main.ts`
- `npx -y @fission-ai/openspec@1.4.1 validate cierre-tecnico --strict`
- Rama: `CHROME=<chromium-1228> bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8877 --puerto-web 8855`
- Repetición de intermitentes: `... correr.sh ... loteria-sala` y `... correr.sh ... loteria-sala una-sala`
- Prueba aislada de la combinación del registro (script del heredoc de `correr.sh` sobre una copia de `alumnos.json`
  en el scratchpad): dos corridas, sin `alumnos.json` y con una entrada de ejemplo ya presente.

## Resultados de pruebas

### Unitarias (Deno)

| | Base (`origin/main`) | Rama |
|---|---|---|
| `deno test -A server/` | 228 pasaron, 0 fallaron, 6 omitidas | 217 pasaron, 0 fallaron, 6 omitidas |
| `deno lint server/` | — | `Checked 56 files`, sin hallazgos (rc 0) |
| `deno check server/main.ts` | — | sin errores (rc 0) |

Diferencia 228 → 217 (−13 retiradas, +2 nuevas):

- Retiradas porque su código se elimina a propósito: `completar_test.ts` (6), las 5 de `extractInglesRow` en
  `rows_test.ts`, `sinHuerfanas` en `alumnos_test.ts` (1) e `importarNotion` en `cierre_test.ts` (1).
- Nuevas (TDD): `main: fase 2 — Inglés no lee Notion; ya no se importan ni se marcan tareas de Notion`
  (`auth_main_test.ts`, en rojo antes de cambiar `main.ts`: la persona que solo está en las filas de Inglés del
  fixture tenía 1 fila) y `cierre: fase 2 — filasIngles = aplicarAlumnos([], registro) conserva la identidad del
  registro`.
- Actualizadas: `auth_main_test.ts` toma a Luz del `alumnos.json` del `DATA_DIR` (la fila de Notion del fixture ahora es
  de «Nora», que debe ignorarse); las 3 de `filterForEmail` y la del título en `rows_test.ts` usan páginas de
  Secundaria. Las pruebas de Juegos, perfil, registro y salas inyectan filas de identidad mínimas
  (`{ alumno, userEmails, userNames }`), que ya son equivalentes a las del registro: no cambian.

### E2E — línea base contra rama (PASS por prueba, con pasos)

| Prueba | Fase | Base | Rama |
|---|---|---|---|
| actividades-datos | ingles | PASS (6) | PASS (6) |
| alta-alumnos | ingles | PASS (11) | PASS (11) |
| inicio-lunes | ingles | PASS (6) | PASS (6) |
| segunda-oportunidad | ingles | PASS (8) | PASS (8) |
| pronunciacion | ingles | PASS (11) | PASS (11) |
| profe-grupo | ingles | PASS (7) | PASS (7) |
| ruta-profe | ingles | PASS (15) | PASS (15) |
| profe-diseno | ingles | PASS (11) | PASS (11) |
| examen-secundaria | ingles | PASS (10) | PASS (10) |
| autoguardado | ingles | PASS (24) | PASS (24) |
| grupos | grupos | OMIT (requiere `--pg`) | OMIT (requiere `--pg`) |
| ingles-pro | pro | OMIT (requiere `--pg`) | OMIT (requiere `--pg`) |
| login | base | PASS (58) | PASS (58) |
| portal | base | PASS (16) | PASS (16) |
| juegos | base | PASS (26) | PASS (26) |
| jugadores | base | PASS (7) | PASS (7) |
| nick | base | PASS (7) | PASS (7) |
| partidas | base | PASS (15) | PASS (15) |
| enlace-sala | base | PASS (8) | PASS (8) |
| juegos-recarga | base | PASS (37) | PASS (37) |
| conquian-estres | base | PASS (3) | PASS (3) |
| clasicos | base | PASS (11) | PASS (11) |
| fusion | base | PASS (10) | PASS (10) |
| sudoku | base | PASS (15) | PASS (15) |
| dragon-run | base | PASS (9) | PASS (9) |
| puntos-tipo | base | PASS (8) | PASS (8) |
| basta-rondas | base | PASS (12) | PASS (12) |
| loteria-sala | base | PASS (10) | FAIL (8/2) en la suite → PASS (10) sola, 2 de 2 repeticiones |
| una-sala | base | PASS (12) | PASS (11) → PASS (11) repetida |
| una-robo | base | PASS (3) | PASS (3) |
| poker | base | PASS (10) | PASS (10) |
| cartas-espanolas | base | PASS (12) | PASS (12) |
| ajedrez | base | PASS (12) | PASS (12) |
| ajustes-salas | base | PASS (8) | PASS (8) |
| ritmo | base | PASS (2) | PASS (2) |
| avatar-foto | base | PASS (16) | PASS (16) |
| login-despues | despues | PASS (6) | PASS (6) |
| **Total** | | **35 PASS, 0 FAIL, 2 omitidas** | **34 PASS, 1 FAIL, 2 omitidas; con repetición, 35 PASS** |

- `loteria-sala` (intermitente de sincronía entre clientes): en la suite, los dos navegadores vieron ganadores
  distintos («Lotería de Marisol» contra «Lotería de BOT-VACHIRA»). No toca identidad de Inglés ni Notion. Repetida sola
  dos veces: PASS (10) ambas.
- `una-sala`: el paso «castigo por no presionar UNA» depende del azar de la partida; cuando no ocurre sale como `INFO`
  y no como `PASS` (11 en lugar de 12). Pasó en la suite y en la repetición.
- `alta-alumnos` muestra 7 alumnos y alumnas en la lista del admin: 2 de la copia de datos + 5 de
  `alumnos-ejemplo.json`. La combinación funciona y no pisa la copia.

### E2E actualizadas o retiradas y por qué

- **Ninguna E2E se retiró.** La suite ya no tenía una prueba dedicada a marcar tareas de Notion ni a contadores de
  tareas de Notion de Inglés; esa función se cubría solo con `completar_test.ts` (unitaria), que se retira con
  `server/completar.ts`.
- **Actualizada `e2e-alta-alumnos.js`**: solo los textos de dos pasos («con la lista de Notion» → «con la lista del
  registro»; «aunque no tenga tareas en Notion» → «aunque no tenga actividades entregadas»). Las condiciones no
  cambian.
- **Cambia el origen de las personas de ejemplo** para todas las E2E: Marisol, Angel, Jesus, Laura y Fernando
  (`@example.com`) salen del registro (`alumnos-ejemplo.json`), ya no de `rows-fixture.json`. Mismos nombres y correos.
- Las de Secundaria (`examen-secundaria`, `login` y `portal` en su parte de Secundaria) siguen igual y pasan.

### Combinación del registro (prueba aislada)

- Con el `alumnos.json` de la copia: 7 entradas; las 2 originales intactas; segunda corrida igual (idempotente).
- Sin `alumnos.json`: crea el archivo con las 5 de ejemplo.
- Con `marisol@example.com` ya presente con otro nombre: se respeta (no pisa).

## Verificación de estado

- Antes: copia de datos del scratchpad (`<scratchpad>/data`), `alumnos.json` con fecha 2026-10-03 23:55.
- Después: ningún archivo de `<scratchpad>/data` es más nuevo que la exportación de la base; `alumnos.json` sin cambios.
  `correr.sh` trabaja sobre una copia temporal y la borra al terminar.
- Estado restaurado: no hizo falta. Sin `--pg`: no se tocó `stald_test_*`; no se tocó Supabase ni producción.

## Pendiente (fuera de este agente)

- 4.3.10 Publicar y verificar en producción (integrador, después del merge): las personas importadas siguen entrando
  (perfil 200 con sesión o por la transición) y ven sus resultados; Secundaria sigue igual.
- `grupos` e `ingles-pro` no se corrieron (requieren `--pg` y llaves de Supabase); conviene correrlas con `--pg` antes
  de publicar, porque usan la vista del admin de Inglés.

## Resultado

- Estado Step 4.3.8: PASS (unitarias, lint, check y E2E; la única falla fue la intermitente `loteria-sala`, que pasa
  sola).
- Bloqueos: ninguno.

## Integración (agente integrador, 2026-10-06)
- Unión con `main` (sprint 4, caché): había un conflicto en `server/main.ts`; quedó la versión de la fase 2 (sin
  `filasNotion` ni `parcheCompletado`).
- `cache_main_test.ts` (sprint 4) armaba su usuaria con filas de Notion de Inglés; ahora usa `alumnos.json`.
  Unitarias: 237 pasaron, 0 fallaron.
- E2E tras la unión: 15/15. actividades-datos, alta-alumnos, inicio-lunes, segunda-oportunidad, pronunciacion,
  profe-grupo, ruta-profe, profe-diseno, examen-secundaria, autoguardado, login, portal, juegos, jugadores y
  peticiones.
- Con Postgres de prueba (`--pg`, tablas `stald_test_*`; 0 filas al terminar):
  - `grupos` 11/11;
  - `ingles-pro` falló 1 paso, «racha: entregar hoy».
  - Causa: la entrega guardaba `enviadoEn` con la hora real, y el «hoy» del servidor de pruebas está fijo
    (`HOY_FIJO`, cambio `pruebas-fecha-fija`).
  - Se cambió a `ahoraIso()`, que en producción es idéntico; después pasó 32/32.
- 4.2 verificada en producción, en solo lectura:
  - `alumnos.json` tiene 8 personas: las 6 importadas de Notion (Angel, Fernando, Jesus, Laura, Marisol y Sofy) y
    las altas Adela e Irving;
  - incluye a todas las que tienen resultados (angel, jesus, laura, marisol y sofy).
