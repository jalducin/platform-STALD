# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-01
- Cambio: profe-actividades-grupo
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- Servidor local con copia desechable del repo de datos (contenido real de la semana 1); estáticos en `localhost:8765`
- `node e2e-profe-grupo.js` (nuevo) y regresiones `e2e-ruta-profe` y `e2e-pronunciacion`

## Resultados de pruebas
- Dirigidas (TDD, `server/profe_test.ts`): 2 pruebas nuevas, primero en rojo y luego en verde.
  - Lo del grupo: sin Meet, abierto ya, con la fecha del día anterior y `grupo: true`, también de semanas futuras.
  - Intento en `resultados/<id>/profe.json`, excluido del admin y del resumen.
  - Se ajustó 1 prueba existente que contaba solo los elementos propios del profe.
- Suite del servidor: 110 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- E2E `e2e-profe-grupo`: 7/7 PASS.
  - La tarjeta "Lo de tu grupo" trae las 2 actividades, el examen semanal, el refuerzo y el diagnóstico, sin el
    Meet; 3 aparecen en atraso.
  - Resolver la actividad del 29 de sep da 100 % y la tarjeta la marca como hecha.
  - El admin del grupo no ve un resultado de Profe ni en el resumen; tampoco hay bloque ni calificaciones de Profe.
  - La alumna sigue con sus 6 elementos.
- Regresiones: `e2e-ruta-profe` 15/15 y `e2e-pronunciacion` 11/11. En ambas se actualizó un selector: leían la
  primera tarjeta, que ahora es la del grupo.

## Verificación de estado
- Copias desechables (`data-pg`) recreadas antes de cada corrida; el repo de datos real no se tocó.
- Estado restaurado: Sí — se borró la copia desechable.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
