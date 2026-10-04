# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-28
- Cambio: nueva-semana-ingles
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-read --allow-env server/` (sin y con `DATA_DIR=<copia del repo de datos>`)
- `npx -y deno check server/main.ts server/validar_semana.ts`
- `npx -y deno lint server/`
- `npx -y deno run --allow-read server/validar_semana.ts <datos> 2026-09-28` (real y copia alterada)
- Servidor local: `DATA_DIR=<copia con semana futura> ROWS_FIXTURE=… PERMITIR_HOY=1 PORT=8787 deno run -A server/main.ts`
- `cmp ai-specs/skills/nueva-semana-ingles/SKILL.md .claude/skills/nueva-semana-ingles/SKILL.md`

## Resultados de pruebas
- TDD: la prueba "semana futura: ningún elemento visible antes de su lunes" falló antes de la corrección:
  el examen de la semana siguiente aparecía como suelto. Pasa después de la corrección.
- Dirigidas (`semana_test.ts`, datos inline): 12 pasaron, 0 fallaron.
- Suite sin `DATA_DIR`: 30 pasaron, 0 fallaron, 6 omitidas (integración).
- Suite con `DATA_DIR`: 36 pasaron, 0 fallaron.
- `deno check`: OK. `deno lint`: sin problemas. Copia de la skill: idéntica.
- En la primera corrida falló 1 prueba por un texto de aviso mal escrito en la prueba, no en el
  validador; se corrigió la prueba.

## Verificación manual
- Validador contra la semana 1 real: 0 errores, 1 aviso (falta `meetUrl`/`hora`), código 0.
- Copia alterada:
  - Alteraciones: examen abierto desde el lunes, correo en un enunciado y actividad del jueves borrada.
  - Resultado: 4 errores (examen no bloqueado, correo, archivo faltante, `bancoDe` roto) y código 1.
- Entradas inválidas: semana en martes → 2 errores y código 1; sin argumentos → uso y código 2.
- Servidor local con la semana `2026-10-05` de prueba (solo su examen), para admin y para alumna:
  - `hoy=2026-10-03`: `semana = 2026-09-28` y 6 elementos, sin `examen-2026-10-09`.
  - `hoy=2026-10-05`: `semana = 2026-10-05` y aparece `examen-2026-10-09`. El diagnóstico sigue visible.
- Generadores de la semana 1 (en `herramientas/` del repo de datos): reproducen los 6 JSON publicados
  (comparación JSON idéntica).

## Verificación de estado
- Antes: repo de datos con 6 archivos de contenido y 4 resultados del diagnóstico.
- Después: sin cambios en `contenido/` ni en `resultados/`. Se agregó solo `herramientas/` y el README.
- Estado restaurado: Sí. Las copias de prueba (`data-alt`, `data-fut`, `gen-check`) se borraron y el
  servidor local se detuvo.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
