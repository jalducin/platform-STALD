# Reporte Step 5 y 6 — Pruebas y verificación de estado

- Fecha: 2026-10-04
- Cambio: pruebas-en-repo
- Agente: Claude Code (Opus 5.5), worktree aislado, rama `feature/pruebas-en-repo`

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/`
- `DATA_DIR=<copia temporal de datos> npx -y deno test -A server/` (las 6 pruebas que dependen del repo de datos)
- `bash tests/e2e/correr.sh` con casos inválidos (ver abajo)
- `CHROME=<chromium-1228> bash tests/e2e/correr.sh --datos <scratchpad>/data` (todas, sin Postgres)
- `bash tests/e2e/correr.sh --pg --datos <...> <9 pruebas de Inglés>` con `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`
  solo en el entorno del proceso (llave obtenida con `supabase projects api-keys`, nunca escrita en archivos)
- `bash tests/e2e/correr.sh --transicion-terminada --datos <...> <plataforma y juegos>`
- Puertos usados: 8817 (API) y 8795 (estáticos), exclusivamente.

## Resultados de pruebas

### Unitarias
- `deno test -A server/`: **199 pasaron, 0 fallaron, 6 omitidas** (16 s). Las 6 omitidas necesitan `DATA_DIR`.
- `deno check server/main.ts`: OK. `deno lint server/`: OK (50 archivos).
- Con `DATA_DIR`: 204 pasaron, **1 falló** — `actividades_test.ts:75` ("examen: 1 intento…") espera 20 preguntas e
  `intentosMax` 1, pero el examen 2026-10-02 del repo de datos ahora usa `banco` + `segundaOportunidad`. Es una
  prueba desactualizada respecto a los datos, ajena a este cambio (no se toca `server/*`). No afecta a CI (allí no
  hay `DATA_DIR`).

### Casos inválidos de `correr.sh` (todos salen con 2, sin levantar servidores)
| Caso | Mensaje |
|---|---|
| sin `--datos` | `falta --datos <copia del repo privado de datos>` + uso |
| `--datos /c/no/existe` | `no existe la carpeta de datos` |
| `--datos .` (no es el repo de datos) | `no parece el repo de datos (falta alumnos.json o contenido/)` |
| prueba `noexiste` | `prueba desconocida: noexiste. Disponibles: …` |
| `--pg` sin llaves | `--pg requiere SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno` |
| `--pg` con `STALD_TABLAS=stald_` | `--pg solo usa STALD_TABLAS=stald_test_ (recibido: stald_)` |
| `--pg` con una fila en `stald_test_grupos` | `stald_test_* ya tiene filas (¿otra corrida en curso?)…`; la fila se borró después |
| sin Chromium de Playwright ni `CHROME` | cada prueba falla con `Executable doesn't exist` (documentado: `npx playwright install chromium` o `CHROME`) |

### E2E sin Postgres (todas): 29 corridas, 28 PASS, 1 FAIL, 2 omitidas
- Inglés (archivos): alta-alumnos 11, inicio-lunes 6, segunda-oportunidad 8, pronunciacion 11, profe-grupo 7,
  ruta-profe 15, profe-diseno 11 — PASS.
- `grupos` e `ingles-pro`: OMIT (requieren `--pg`).
- Plataforma: login 35, portal 16, juegos 26, partidas 15, enlace-sala 8 — PASS.
- Juegos: conquian-estres 3, clasicos 11, fusion 10, sudoku 15, dragon-run 9, basta-rondas 12, loteria-sala 10,
  una-sala 11, una-robo 3, poker 10, cartas-espanolas 12, ajedrez 12, ajustes-salas 8, ritmo 2, avatar-foto 16 — PASS.
- login-despues (fase `despues`): 6 — PASS.
- **puntos-tipo FAIL** (7/8): en la página nueva de Inglés la tarjeta `#juegos-admin` es un `<details>` plegado y la
  prueba esperaba que fuera visible. Se ajustó a `state: 'attached'` (el texto se revisa igual) y se volvió a correr:
  **PASS 8/8**.

### E2E con Postgres de prueba (`--pg`): 9 corridas, 9 PASS
alta-alumnos 11, inicio-lunes 6, segunda-oportunidad 8, pronunciacion 11, profe-grupo 7, ruta-profe 15,
profe-diseno 11, grupos 11, ingles-pro 32. `stald_test_* al terminar: 0 filas`.

### Juegos con la transición del login terminada (`--transicion-terminada`): 20 corridas, 17 PASS, 3 FAIL
- Todos los juegos PASS (con la sesión de prueba agregada).
- `una-sala` FAIL 1 paso ("mismo estado en cada paso común", 1 de 87 pasos distinto): falla intermitente ya vista
  en la batería anterior (`bateria.txt`); al repetirla: **PASS 11/11**.
- `enlace-sala` FAIL 1 paso: un contexto solo guardaba `stald_email`. Se le agregó la sesión de prueba; repetida
  con la transición terminada: **PASS 8/8**, y sin ella: **PASS 8/8**.
- `portal` FAIL 2 pasos ("Inglés entra sin volver a pedir el correo"): la prueba verifica a propósito el correo
  viejo `ingles_email` del periodo de transición; tras el 2026-10-12 habrá que actualizarla junto con el cambio que
  retire la transición. Queda fuera de este cambio.

## Verificación de estado
- Carpeta de datos del scratchpad: antes `md5(193 archivos) = 1e4c8090…`, git limpio (HEAD 6370510); después: el
  mismo md5 y git limpio. No se modificó.
- `stald_test_*`: antes de la corrida `--pg`, 0/0/0 filas (docs/grupos/inscripciones); después 0/0/0.
  Nota: a las 17:29 había 160 filas en `stald_test_docs` de **otra** corrida en curso (puertos 8787/8765); se esperó
  a que terminara antes de usar `--pg`. De ahí la guardia `--pg-vaciar`.
- Puertos 8817 y 8795: libres al terminar cada corrida. Copias temporales `stald-e2e.*`: ninguna queda.
- Estado restaurado: Sí — `correr.sh` limpia solo; la fila de la prueba de la guardia se borró a mano (204).

## CI
- `.github/workflows/pruebas.yml` validado con `yaml.safe_load`: `on.push.branches=[main]`, `on.pull_request`,
  job `servidor` con checkout, setup-deno v2 y los tres comandos. No se puede correr Actions desde aquí: la primera
  corrida se verá en el PR.

## Resultado
- Estado Step 5: PASS
- Estado Step 6 (verificación manual CLI): PASS
- Bloqueos: ninguno. Pendientes fuera de alcance: `actividades_test.ts:75` desactualizada respecto a los datos;
  `e2e-portal` (paso de `ingles_email`) a revisar cuando termine la transición del login.
