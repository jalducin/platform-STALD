# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-04
- Cambio: examen-secundaria
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/` · `deno check server/main.ts` · `deno lint server/`
- `bash tests/e2e/correr.sh --datos <copia> alta-alumnos inicio-lunes segunda-oportunidad pronunciacion profe-grupo ruta-profe profe-diseno examen-secundaria portal login`
- `bash tests/e2e/correr.sh --datos <copia> ruta-profe profe-diseno examen-secundaria`
- Validación del examen real con `validateItem` (script fuera del repo): 0 errores, 67 preguntas y 13 materias.

## Resultados de pruebas
- TDD: `server/secundaria_test.ts` falló al principio (no existía `handleSecundaria`); ahora pasan las 5.
- Unitarias: 207 pasaron, 0 fallaron, 6 omitidas. Check y lint sin errores.
- E2E `examen-secundaria`: 10/10.
  - La alumna entra desde Secundaria.
  - Saca 50 % en la 1.ª oportunidad y 100 % en la 2.ª; se queda el 100 % y ya no hay 3.ª.
  - Una persona sin Secundaria ve el aviso.
  - El admin ve el resultado por materia.
- Regresión E2E:
  - alta-alumnos 11, inicio-lunes 6, segunda-oportunidad 8, pronunciacion 11, profe-grupo 7, ruta-profe 15,
    profe-diseno 11, portal 16 y login 39: todo PASS.
- Incidencia corregida: la E2E escribía su examen en la copia después de que el servidor la cargaba en memoria
  (`MemoryStore.fromDir`).
  - Fallaba cuando corría después de otra prueba.
  - Ahora el examen de prueba vive en `tests/fixtures/datos/` (solo datos de ejemplo) y `correr.sh` lo copia antes de
    arrancar el servidor.

## Verificación de estado
- `correr.sh` trabaja sobre una copia temporal y la borra. La copia original del repo de datos no cambió.
- Sin Postgres. Servidores apagados.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
