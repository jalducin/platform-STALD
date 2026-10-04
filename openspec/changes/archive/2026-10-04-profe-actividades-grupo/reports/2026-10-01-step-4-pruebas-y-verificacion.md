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

## Step 5 — Verificación manual en producción (EL AGENTE EJECUTA)
- Tras el despliegue, un script Python (solo GET) contra `https://stald.jalducin.deno.net`: 3/3 PASS.
  - La ruta del profe lista los 5 elementos del grupo, sin Meet:
    - `diagnostico-a1` → 25 sep;
    - `act-2026-09-29` y `act-2026-10-01` → 27 sep;
    - `examen-2026-10-02` → 1 oct;
    - `refuerzo-2026-10-03` → 2 oct.
  - Abrir `act-2026-09-29` sin enviar: intento 1, 12 preguntas y sin respuestas expuestas.
  - La vista del grupo no tiene resultados de Profe ni lo incluye en el resumen.
- Estado: sin escrituras. Los intentos del profe siguen sin usar.
