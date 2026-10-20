# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-19
- Cambio: profe-ruta-abierta
- Agente: Claude Code (Opus) + subagente verificador-pruebas

## Comandos ejecutados
- `npx -y deno test -A server/profe_test.ts server/semana_test.ts` (TDD: 2 fallaban antes del cambio)
- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/`
- `node tests/calidad/calidad.mjs`
- `npx -y deno run --allow-read server/validar_semana.ts <copia-datos> <lunes> --profe` para los 8 lunes
  2026-10-19 … 2026-12-07
- `CHROME=… bash tests/e2e/correr.sh --datos <copia-datos> --puerto-api 8881 --puerto-web 8882 --hoy 2026-10-20 profe-grupo ruta-profe profe-diseno`
- `bash tests/e2e/correr.sh --datos <copia-datos> --puerto-api 8891 --puerto-web 8892 <14 pruebas de la fase inglés>` (hoy por omisión 2026-10-04)

## Resultados de pruebas
- Dirigidas (`profe_test` + `semana_test`): 29 pasaron, 0 fallaron (5 nuevas).
- Suite del servidor: 897 pasaron, 0 fallaron, 6 omitidas; check y lint sin errores; calidad sin avisos nuevos en las
  líneas del diff.
- Validador `--profe` con la copia de datos: 0 errores en las 8 semanas (copia con 27 elementos, commit 4902bc3); 2 avisos esperados «actividad el miércoles; se esperaba examen» (fechas pedidas por el profe).
- E2E con hoy 2026-10-20: `ruta-profe` 21/21 PASS (27 abiertos, sin «próximamente», 27 × 200 por id, botón en el plan,
  sin atraso por fecha futura, abre `profe-examen-2026-12-12` desde el plan con preguntas); `profe-diseno` 11/11 PASS.
  `profe-grupo` 6/7: falla «la alumna sigue viendo sus 6 elementos», conteo fijo escrito para el 2026-10-04
  (35 elementos el 2026-10-20); no depende de este cambio.
- E2E con hoy 2026-10-04 (fase inglés): 11 PASS, 2 FAIL, 1 omitida (pronunciación, sin datos). Fallan
  `ruta-profe`/`profe-diseno` en pasos de «sin ruta propia»: con estos datos el plan existe pero su primera semana es
  el 2026-10-19, así que el 10-04 no hay `semanaPropia`; supuesto de las pruebas previo a este cambio (el código nuevo
  no actúa: ningún `disponibleDesde` del profe ≤ 2026-10-04). Con hoy ≥ 2026-10-19 pasan.

## Verificación de estado
- Antes: copia de datos de solo lectura (scratchpad `data-profe-ia`), sin cambios.
- Después: igual; `correr.sh` trabaja sobre su propia copia temporal y nunca escribe en tablas `stald_` (sin `--pg`).
- Estado restaurado: No aplica.

## Resultado
- Estado Step 5: PASS (fallas E2E restantes dependen de fecha/datos y existían antes)
- Bloqueos: ninguno
