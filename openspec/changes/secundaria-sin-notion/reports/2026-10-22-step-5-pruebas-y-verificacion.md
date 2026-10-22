# Reporte Step 5 — Pruebas y verificación de estado (PR 1, hotfix)

- Fecha: 2026-10-22 (corridas la noche del 2026-10-21, hora de CDMX)
- Cambio: secundaria-sin-notion
- Agente: Claude Code (Opus), con los subagentes `verificador-pruebas` y `revisor-solo-lectura`

## Comandos ejecutados
- `npx -y deno test -A server/` (subagente `verificador-pruebas`)
- `npx -y deno check server/main.ts`
- `npx -y deno lint server/`
- `npx -y @fission-ai/openspec@1.4.1 validate secundaria-sin-notion --strict`
- `bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 8897 --puerto-web 8898 [--hoy 2026-10-27] examen-secundaria secundaria-clases portal login`
- Línea base de `portal` sobre `origin/main` (`git archive`), puertos 8899/8900
- Servidor local sin `NOTION_TOKEN` (`DATA_DIR` con una copia, registro de prueba `@example.com`, `HOY_FIJO=2026-10-22`)
  y `curl` (script `curl-manual.sh` en la carpeta de trabajo)

## Resultados de pruebas
- Dirigidas: `server/secundaria_sin_notion_test.ts` 22 pasaron, `server/secundaria_sin_notion_main_test.ts` 4
  pasaron, `server/secundaria_test.ts` sin cambios y en verde.
- Suite completa: 937 pasaron, 0 fallaron, 6 omitidas (marcadas `ignore` desde antes). Check y lint sin hallazgos.
- E2E:
  - `secundaria-clases` (con `--hoy 2026-10-27`): PASS 27/27.
  - `examen-secundaria`: PASS 10/10, tras adaptar la prueba al puente (ya no hay enlace «📚 Mis clases» en
    `secundaria.html`: la página lleva directo a la vista).
  - `login`: PASS 67/67. Requirió que `ingles/secundaria.js` no ponga `?email=` en la URL cuando hay sesión (antes lo
    hacía `secundaria.html`).
  - `portal`: PASS 16/16 sola. Una vez falló «Inglés entra sin volver a pedir el correo» al correr junto a otras
    pruebas; no se reprodujo al repetirla y la línea base sobre `origin/main` pasa: se considera intermitente.
  - Con `--hoy 2026-10-27`, `login` falla «alumna con ?email= sin token funciona en la transición» porque ese día la
    transición (`LOGIN_TRANSICION_HASTA` 2026-10-12) ya terminó: es efecto de la fecha, no del cambio.
- Duración: suite Deno ≈ 71 s; E2E ≈ 3–6 min por corrida.

## Verificación manual (servidor local sin NOTION_TOKEN)

| Caso | Resultado |
|---|---|
| Sofy (de baja de Inglés, clases exclusivas `sofia`/`sofy`) → `/secundaria/actividades` | 200, sus repasos |
| Sofy → `/perfil` | 200, `accesos: { ingles: false, secundaria: true, juegos: true }`, nombre «Sofy» |
| Marisol (Inglés) → `/secundaria/actividades` | 403 `sin_acceso` |
| Marisol → `/perfil` | 200, `secundaria: false` |
| Admin → lista | 200, `isAdmin`, `alumnas: [{ nombre: "Sofy", slug: "sofy" }]` |
| Admin → `?alumna=sofy` | 200, su vista con `vistaDe` |
| Admin → `?alumna=nadie` | 404 `alumna_no_encontrada` |
| Sofy → `?alumna=marisol` | 200, solo lo suyo (`isAdmin: false`) |
| Sin sesión → `/secundaria/actividades` y `/perfil` | 401 `inicia_sesion` |
| Sofy → `/juegos/yo` | 200, jugador `a-sofy` (sin cambio) |
| Admin → `/data` (historial) | 500 `upstream_error` (esperado: sin Notion; ninguna página lo llama) |

## Verificación de estado
- Antes: repo de datos sin cambios; tablas `stald_*` sin tocar (E2E sin `--pg`).
- Después: igual. Las E2E y el servidor manual usaron copias temporales (`correr.sh` borra la suya; la copia manual
  está en la carpeta de trabajo de la sesión, fuera del repo).
- Estado restaurado: Sí — no hubo escrituras fuera de las copias.

## Hallazgos del revisor (`revisor-solo-lectura`)
- Sin bloqueantes. Menores:
  - Slug: Sofía entra como `sofy`. Si sus resultados de Secundaria anteriores están bajo `sofia` (slug del primer
    nombre en Notion), no se ven. No se pudo leer Postgres de producción desde esta sesión. Acción opcional: revisar
    `select path from stald_docs where path like 'resultados/sec-%'` y, si están en `sofia`, poner
    `"slugSecundaria": "sofia"` en su entrada de `alumnos.json`.
  - Una persona de Inglés cuyo nombre diera el slug `sofia` o `sofy` tendría acceso por la regla de exclusivos: hoy no
    existe; queda anotado.
  - El acceso por exclusivos usa las clases visibles (semanas iniciadas, la del domingo siguiente y sueltos).
  - Comentario de `server/main.ts` corregido para mencionar la regla de exclusivos.

## Resultado
- Estado Step 5 (PR 1): PASS
- Bloqueos: ninguno
