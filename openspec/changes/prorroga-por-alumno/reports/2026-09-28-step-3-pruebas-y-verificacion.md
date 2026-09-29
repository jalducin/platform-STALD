# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-28
- Cambio: prorroga-por-alumno
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/` (sin y con `DATA_DIR`)
- `npx -y deno check server/main.ts server/validar_semana.ts` y `npx -y deno lint server/`
- API de Notion: alta de la fila de Sofy (propiedades + 33 bloques copiados de "A1 Test #1")

## Resultados de pruebas
- TDD: `prorroga_test.ts` falló antes de implementar (3 de 4). La prueba del formato del diagnóstico
  (`secciones`/`preguntas`) falló aparte, porque `normalizeItem` perdía `prorrogas`; se corrigió.
- Dirigidas (`prorroga_test.ts`): 5 pasaron, 0 fallaron.
- Suite sin `DATA_DIR`: 35 pasaron, 0 fallaron, 6 omitidas. Con `DATA_DIR`: 41 pasaron, 0 fallaron.
- `check` y `lint`: sin problemas.
- Los helpers de datos inline pasaron a `server/test_datos.ts`, para que las pruebas de `semana_test.ts`
  no se registren dos veces.

## Verificación de estado
- Notion "📖 Clases Inglés": antes 7 filas; después 8 (fila nueva de Sofy, entrega 2026-09-29).
  - El primer intento de copia de bloques falló con 400 por campos de solo lectura.
  - La página quedó vacía y se completó en el mismo registro, sin duplicados.
- Repo de datos: `diagnostico-a1.json` con `prorrogas.sofy = 2026-09-29`. Sin cambios en `resultados/`.
- Estado restaurado: no aplica. Los cambios son el alta pedida por el usuario.

## Corrección post-apply 1.3 (título de fila)
- Hallazgo al verificar en producción: `/ingles/data` devolvía "(sin título)" en todas las filas de Inglés.
  La propiedad de título de la base ya no se llama "Name".
- TDD: la prueba nueva en `rows_test.ts` falló antes y pasa después.
- Suite: 36 pasaron + 6 omitidas sin `DATA_DIR`; 42 pasaron con `DATA_DIR`. `check` y `lint` limpios.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
