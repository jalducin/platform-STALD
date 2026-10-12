# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: revancha-partidas
- Agente: Claude Code (Opus 5.5), worktree aislado, rama `feature/revancha-partidas`

## Comandos ejecutados
- `npx -y @fission-ai/openspec@1.4.1 validate revancha-partidas --strict`
- `npx -y deno test -A server/salas_test.ts` (en rojo antes de implementar y en verde después)
- `npx -y deno test -A server/`, `npx -y deno lint server/`, `npx -y deno check server/main.ts`
- E2E (puertos 8937/8915, `CHROME=…/chromium-1228/chrome-win64/chrome.exe`):
  `bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8937 --puerto-web 8915 revancha juegos partidas
  enlace-sala juegos-recarga conquian-estres clasicos basta-rondas loteria-sala una-sala una-robo poker
  cartas-espanolas ajedrez ajustes-salas ritmo`
- Verificación manual con `curl` contra un servidor local en el puerto 8947 (sección «Verificación manual»).

## Resultados de pruebas
- OpenSpec: `Change 'revancha-partidas' is valid`.
- TDD: las 4 pruebas nuevas de `salas_test.ts` fallaron antes de implementar (16 pasaron, 4 fallaron) y
  pasaron después (20/20):
  - revancha con la misma configuración, anfitriona quien la pidió, `siguiente` en la vieja, idempotente e indexada;
  - dos peticiones a la vez: una sola sala nueva (2 `sala.json` en total) y una sola entrada nueva en el índice;
  - 404, 409 `no_termino` (sin empezar y sin podio), 403 `no_en_sala` sin crear archivos, 409 `ya_empezo`, 405 y 410;
  - ajedrez conserva el reloj, sin bots y con cupo de 2.
- Unitarias Deno: **262 pasaron, 0 fallaron, 6 omitidas** (las de `actividades_test.ts` sin `DATA_DIR`).
- `deno lint server/`: «Checked 65 files», sin hallazgos. `deno check server/main.ts`: sin errores.
- E2E nueva `revancha` sola: PASS, 20 pasos, a la primera.
- **Regresión: 16 corridas, 16 PASS, 0 FAIL, 0 omitidas** (juegos 28, partidas 15, enlace-sala 7,
  juegos-recarga 37, revancha 20, conquian-estres 3, clasicos 10, basta-rondas 12, loteria-sala 10, una-sala 12,
  una-robo 3, poker 27, cartas-espanolas 21, ajedrez 12, ajustes-salas 8 y ritmo 2: 227 pasos). Ninguna falla
  intermitente.
- Duración de la regresión: 22 min (17:59 a 18:21).

## Verificación manual — EL AGENTE EJECUTA
Servidor local (`server/main.ts`, puerto 8947, `ROWS_FIXTURE`, `DATA_DIR` = copia temporal de la carpeta de datos con
los alumnos y alumnas de ejemplo; `MemoryStore`, nada se escribe en disco). Sala de Basta (5 rondas, con bots) de
Marisol con Angel:

| Caso | Resultado |
|---|---|
| Revancha sin empezar | 409 `no_termino` |
| Empezada, sin podio | 409 `no_termino` |
| Laura (no jugó) | 403 `no_en_sala` |
| Sala `ZZZZ` | 404 `sala_no_existe` |
| Sin sesión ni correo | 400 `missing_email` (el mismo control de todo Juegos) |
| Angel y Marisol a la vez (dos `curl` en paralelo) | 200 y 200, mismo `codigo` |
| GET de la vieja | `siguiente` = código nuevo, `siguienteHost` = `a-angel` |
| GET de la nueva | `basta-es`, `rondas: 5`, bots, Angel y Marisol, Angel anfitrión |
| GET a `…/revancha` | 405 |

UI: la E2E recorre el flujo en el navegador a 390 px. Capturas en `tests/e2e/salida/`: `revancha-podio.png`
(botón «Otra con los mismos»), `revancha-aviso.png` («Angel abrió la revancha · Unirme»), `revancha-recarga.png`
(tarjeta en el inicio tras recargar en el podio) y `revancha-sala.png` (sala de espera nueva con 4 personas y 2
bots). Sin desplazamiento horizontal (ancho 390).

## Verificación de estado
- Antes: la carpeta de datos del scratchpad es la copia original del repo privado de datos.
- Después: sin cambios. `correr.sh` trabaja sobre una copia temporal que borra al terminar; el servidor de `curl` usó
  otra copia (`scratchpad/curl-datos`), borrada al terminar, y se detuvo (puerto 8947 libre).
- Sin Postgres, Supabase, `stald_*`, `.env` ni Notion.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente la verificación en producción tras el merge (6.3, la hace el usuario).
