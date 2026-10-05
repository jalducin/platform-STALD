# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-05
- Cambio: examen-por-secciones
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/` · `deno lint server/` (salida completa) · `deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia> ruta-profe segunda-oportunidad examen-secundaria`
- Mismas E2E sobre `main` en un worktree temporal, para comparar.
- Validación del examen real (`validateItem`): 0 errores, 100 preguntas y 13 materias.

## Resultados de pruebas
- TDD: la prueba nueva `porSecciones` falló antes de implementar.
- Unitarias: 208 pasaron, 0 fallaron, 6 omitidas. Lint y check sin problemas.
- E2E `examen-secundaria`: 10/10.
- `segunda-oportunidad`: 8/8 sola, dos veces en la rama y una en `main`. En la corrida conjunta falló una vez
  (intermitente, depende del orden).
- `ruta-profe`: 14/15 en la rama **y también en `main`**.
  - Falla «la actual marcada»: la prueba espera que la semana actual del profe sea la Semana 0, y desde el lunes
    2026-10-05 es la Semana 1.
  - Es deuda previa de la prueba, porque depende de la fecha; no la causa este cambio.

## Verificación de estado
- Sofía no tenía intentos del examen (`resultados/sec-mensual*` vacío en Postgres). Por eso se pueden renumerar los
  ids de las preguntas.
- Copias temporales borradas, servidores apagados y worktree de comparación eliminado.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS (con la deuda de `ruta-profe` documentada)
