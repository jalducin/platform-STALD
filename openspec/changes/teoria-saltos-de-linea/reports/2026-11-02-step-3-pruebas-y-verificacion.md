# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-11-02
- Cambio: teoria-saltos-de-linea
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts`
- `npx -y deno lint server/`
- `CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" bash tests/e2e/correr.sh --datos <copia> --puerto-api 8963 --puerto-web 8964 teoria-diagramas`
  (antes y después de implementar)
- `… --puerto-api 8973 --puerto-web 8974 teoria-diagramas presentar presentacion-cabe ruta-profe profe-diseno ingles-diseno-profe ingles-alumno-diseno navegacion-dispositivos material`
- `… --puerto-api 8963 --puerto-web 8964 examen-secundaria`
- `… --puerto-api 8973 --puerto-web 8974 --hoy 2026-10-27 secundaria-clase secundaria-clases secundaria-dashboard secundaria-adelantar misiones`
  (`secundaria-clase` también antes del arreglo de `.sec-enlaces .btn`)
- `npx -y @fission-ai/openspec@1.4.1 validate teoria-saltos-de-linea --strict`

El `headless_shell` de Playwright que pide la versión instalada (1223) no existe en la máquina; se usó `CHROME`.

## Resultados de pruebas
- TDD, antes de implementar: `teoria-diagramas` FAIL en las comprobaciones nuevas (`white-space: normal`, sin
  renglones, sin sangría, puntos en un renglón y scroll horizontal de 540 px a 360 px); `secundaria-clase` FAIL en
  «videos sin scroll horizontal a 360 px» con la lectura de título largo.
- Dirigidas, después: `teoria-diagramas` 66 PASS / 0 FAIL (claro y oscuro, 360 y 1280 px); `secundaria-clase` 36 PASS.
- Unitarias: 1115 pasaron, 0 fallaron, 6 omitidas (las de `actividades_test.ts` sin `DATA_DIR`), 1m43s.
  `server/en_vivo_test.ts` pasó a la primera. `deno check` y `deno lint` sin errores.
- E2E de regresión: `presentar` 11, `presentacion-cabe` 31, `ruta-profe` 22, `profe-diseno` 11,
  `ingles-diseno-profe` 95, `ingles-alumno-diseno` 44, `navegacion-dispositivos` 311, `material` 56,
  `examen-secundaria` 10, `secundaria-clases` 27, `secundaria-dashboard` 89 y `misiones` 46 PASS; 0 FAIL.
  `secundaria-adelantar` sale OMIT con `--hoy 2026-10-27` (necesita otro día); no toca la teoría.
- OpenSpec: `Change 'teoria-saltos-de-linea' is valid`.

## Verificación de estado
- Antes: repo de datos clonado en el scratchpad (`datos-fix`), sin cambios.
- Después: `correr.sh` trabaja en una copia temporal que borra al terminar; la verificación visual usó otra copia
  (`datos-vis`, con la clase `sec-tec-2026-11-24` asignada a la persona de ejemplo `valeria`), borrada al terminar.
  Sin Postgres (`--pg` no se usó), sin escritura en `stald_*` ni en el repo de datos.
- Estado restaurado: Sí — copias borradas y servidores locales apagados.

## Verificación manual (Step 4.1)
- Servidor local (`server/main.ts` con `DATA_DIR=<copia>`, `ROWS_FIXTURE`, `HOY_FIJO=2026-11-24`) y estáticos con
  `python -m http.server`; Playwright abre `ingles.html?modo=secundaria` como `valeria@example.com` y la clase
  `sec-tec-2026-11-24`.
- 360 px: `white-space: pre-wrap`; el bloque «Variables» muestra `nombre = 'Luna'`, `edad = 12`, … en renglones
  separados con la línea en blanco; `scrollWidth` 360 = ancho de la pantalla. Antes del arreglo de los enlaces daba
  634 px por los botones «📖 Documentación oficial de Python: …».
- 1280 px: mismo resultado, en renglones; sin scroll horizontal. Capturas revisadas a ojo (fuera del repo).

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno. Queda la verificación en producción (4.2) tras el merge y la prueba del profe en el celular
  antes de archivar.
