# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-01
- Cambio: ruta-profe
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- `python herramientas/profe-mes-1/gen_profe_mes1.py .` (repo de datos)
- `npx deno run --allow-read server/validar_semana.ts <datos> <lunes> --profe` para 2026-09-28, 10-05, 10-12, 10-19 y 10-26
- Servidor local con copia desechable del repo de datos y `ROWS_FIXTURE`; estáticos en `localhost:8765`
- `node e2e-ruta-profe.js` (nuevo) y regresiones `e2e-alta-alumnos`, `e2e-semana`, `e2e-correccion`

## Resultados de pruebas
- Dirigidas (TDD, `server/profe_test.ts`): 5 pruebas, primero en rojo (sin `AMBITO_PROFE`) y luego en verde.
- Suite del servidor: 100 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- Contenido: 5 semanas, 18 elementos, 325 ejercicios. Validador: 0 errores en las 5 semanas; 2 avisos en la
  semana 0 (los exámenes caen en jueves porque la ruta arranca a media semana), aceptados.
  - La posición de la respuesta correcta queda repartida (0: 67, 1: 65, 2: 53, 3: 61).
  - 79 ejercicios son de escribir (24 %).
- E2E `e2e-ruta-profe`: 15/15 PASS
  - título "Mi ruta B1 → C1"; plan con 5 semanas, la actual marcada y las 18 tareas con fecha;
  - "Esta semana" con examen directo y diagnóstico; examen directo de 27 preguntas resuelto con 100 % y
    retroalimentación por tema; el plan refleja ⭐ 100 % y el servidor lo da por completo;
  - vista del grupo con enlace a la ruta y sin elementos del profe; tile en el portal del admin;
  - alumna: aviso "solo para el profe", 403 en la API, sin tile y sin elementos del profe en su lista.
- Regresiones: `e2e-alta-alumnos` 11/11. `e2e-semana` (1 fallo) y `e2e-correccion` (no corre: falta un
  archivo de apoyo) dan **lo mismo en `main`** (verificado con `git stash`); dependen de la fecha o de
  archivos de apoyo, no de este cambio.

## Verificación de estado
- Antes: copia desechable del repo de datos (`data-rp`), recreada antes de cada corrida.
- Después: el resultado de prueba del examen directo quedó solo en la copia; el repo de datos real no se tocó.
- Estado restaurado: Sí — se borró la copia desechable.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
