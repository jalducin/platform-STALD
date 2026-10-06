# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-06 (corridas del 2026-10-05, hora local)
- Cambio: cache-estabilidad
- Agente: Claude Code (Opus 5.5)
- Rama: `feature/cache-estabilidad` (desde `origin/main` 1716249)

## Comandos ejecutados
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- `npx -y deno check server/main.ts`
- `npx -y @fission-ai/openspec@1.4.1 validate cache-estabilidad --strict`
- Línea base (código de `main` + la E2E nueva): `MEDIR=1 CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 8857 --puerto-web 8835 peticiones`
- Después: `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 8857 --puerto-web 8835` (suite completa, sin `--pg`)
- Repetición de la intermitente: `… correr.sh … una-sala` (3 veces)
- Experimento de verificación previa en Chromium 1228: script Node + Playwright en el scratchpad (no va al repo)
- Verificación manual con `curl` contra un servidor local (puerto 8859, `ROWS_FIXTURE` y una copia temporal de los datos)

## TDD (en rojo antes de implementar)
- Unitarias nuevas: `cache_test.ts` y `http_cache_test.ts` no compilaban (módulos inexistentes); `store_test.ts`
  «lecturas simultáneas → un solo fetch» FAILED; `cache_main_test.ts` «/config 10 min» y «ranking 304» FAILED.
- E2E `peticiones` sobre el código de `main`: FAIL «503 pasajero» (el ranking mostraba el error), FAIL «red caída 6 s»
  (`fallidas=4 después=0`: el sondeo se detenía para siempre, con «Failed to fetch» sin atrapar en ambas páginas) y
  FAIL «pestaña oculta… al volver consulta enseguida».

## Peticiones al API por flujo (antes → después)
Contadas en el proxy de `e2e-peticiones.js` (incluye `OPTIONS`; cada flujo empieza en un contexto nuevo del navegador,
salvo «navegar», que recorre 4 páginas en el mismo).

| Flujo | Antes | Después | OPTIONS antes → después | Umbral |
|---|---:|---:|---:|---:|
| portal (alumna) | 5 | 5 | 2 → 2 | 5 |
| navegar portal → inglés → portal → juegos (alumna) | 18 | 12 | 7 → 4 | 12 |
| juegos + 1 juego individual | 5 | 5 | 2 → 2 | 5 |
| ranking: abrir y alternar pestañas 4 veces | 12 | 6 | 5 → 2 | 6 |
| sala de 2 personas, ¡Una!, 30 s (ambas) | 64 | 40 | 31 → 7 | 40 |
| inglés (alumna) | 5 | 5 | 2 → 2 | 5 |
| inglés (admin) | 15 | 15 | 6 → 6 | 15 |
| abrir un examen | 2 | 2 | 1 → 1 | 2 |

- Donde no baja (primera carga en un contexto nuevo), cada URL es distinta: la primera verificación previa no se
  puede evitar sin sacar el token del encabezado. En uso real se ahorra al repetir URL (sondeo, navegación, recargas).
- «navegar»: `/config` 4 → 1 (caché de 10 min) y 3 `OPTIONS` menos.
- Sala: el sondeo pagaba un `OPTIONS` por consulta (26); ahora 1 por URL y página.
- `juegos/datos/*.json` (estáticos): 1 descarga en el flujo de juego individual, igual que antes.
- Servidor (no visible en esta tabla porque las E2E usan `ROWS_FIXTURE`): las filas de Notion pasan de 1 consulta
  completa + 1 petición por usuario **en cada** `/perfil`, `/ingles/data`, `/ingles/actividades`, `/ingles/resumen` e
  identidad de Juegos, a 1 por minuto y base por instancia (single-flight). Lo fijan `cache_test.ts` y `store_test.ts`.

## Resultados de pruebas
- Unitarias: **245 pasaron, 0 fallaron, 6 omitidas** (las 6 de `actividades_test.ts` sin `DATA_DIR`, como siempre). ~3 s.
- `deno lint server/`: sin problemas (62 archivos). `deno check server/main.ts`: sin errores.
- OpenSpec: `Change 'cache-estabilidad' is valid`.
- E2E completa (35 corridas, 34 PASS, 1 FAIL, 2 omitidas por `--pg`):

| Prueba | Resultado | Prueba | Resultado |
|---|---|---|---|
| actividades-datos | PASS (6) | conquian-estres | PASS (3) |
| alta-alumnos | PASS (11) | clasicos | PASS (11) |
| inicio-lunes | PASS (6) | fusion | PASS (10) |
| segunda-oportunidad | PASS (8) | sudoku | PASS (15) |
| pronunciacion | PASS (11) | dragon-run | PASS (9) |
| profe-grupo | PASS (7) | puntos-tipo | PASS (8) |
| ruta-profe | PASS (15) | basta-rondas | PASS (12) |
| profe-diseno | PASS (11) | loteria-sala | PASS (10) |
| examen-secundaria | PASS (10) | **una-sala** | **FAIL (11/12) en la corrida completa; PASS 3 de 3 sola** |
| autoguardado | PASS (24) | una-robo | PASS (3) |
| grupos | OMIT (`--pg`) | poker | PASS (10) |
| ingles-pro | OMIT (`--pg`) | cartas-espanolas | PASS (12) |
| login | PASS (58) | ajedrez | PASS (12) |
| portal | PASS (16) | ajustes-salas | PASS (8) |
| juegos | PASS (26) | ritmo | PASS (2) |
| jugadores | PASS (7) | avatar-foto | PASS (16) |
| partidas | PASS (15) | **peticiones** (nueva) | PASS (11) |
| enlace-sala | PASS (8) | login-despues | PASS (6) |
| juegos-recarga | PASS (37) | | |

- `una-sala` intermitente: «mismo estado en cada paso común… 1 distinto» en el paso 15 con `castigo: true` (manos
  `[3,…]` vs `[5,…]`). El castigo del botón UNA se calcula con los segundos entre jugadas al reproducir; en la corrida
  completa (máquina cargada) una de las páginas vio el aviso con otro tiempo. Repetida sola 3 veces: PASS, PASS, PASS.
  No depende de la caché: las jugadas de ¡Una! son `POST` (no se cachean ni se reintentan) y la sala se lee siempre
  fresca. Queda como pendiente.
- Estabilidad (E2E `peticiones`): 503 pasajero → `503,200` y el ranking se muestra sin aviso; red caída 6 s →
  `fallidas=8 después=9` (el sondeo sigue en ambas páginas); pestaña oculta → `oculta=0`, al volver 1 consulta en 1.2 s.

## Verificación manual (Step 7.1, `curl` contra `http://127.0.0.1:8859`)
- `GET /config` → 200, `cache-control: public, max-age=600`, `etag: W/"…"`.
- `OPTIONS /juegos/ranking` → 200, `access-control-max-age: 86400`.
- `GET /juegos/ranking?tipo=individual` (alumna) → 200, `private, no-cache`, `etag`, `vary: Authorization`, sin correos.
- Mismo con `If-None-Match: <etag>` → **304**, sin cuerpo, con `access-control-allow-origin: *` y el mismo `etag`.
- Con `If-None-Match: W/"otro"` → 200.
- `GET /perfil` (alumna) → 200, `no-store, no-cache, must-revalidate`, sin `etag`.
- Admin por `?email=` sin token → 401 `inicia_sesion` (`no-store`). Tipo inválido → 400 `tipo_invalido` (`no-store`).
  Correo no registrado → 403 `no_registrado` (`no-store`).

## Verificación de estado
- Antes: carpeta de datos del scratchpad sin cambios (solo lectura); `correr.sh` trabaja sobre una copia temporal.
- Después: `correr.sh` borró su copia al terminar; la copia temporal de `curl` (`scratchpad/curl-datos`) se borró y el
  servidor de 8859 se detuvo. El servidor guarda en memoria (`MemoryStore`), nunca en disco.
- Estado restaurado: Sí. Sin Supabase, sin producción, sin Notion.

## Resultado
- Estado Step 6: **PASS** con 1 prueba intermitente (`una-sala`) documentada: pasa sola 3 de 3.
- Bloqueos: ninguno. Pendiente tras el merge (usuario): 7.3, revisar en DevTools que el sondeo publicado ya no paga un
  `OPTIONS` por consulta.
