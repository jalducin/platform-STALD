## Why

El profe quiere que la semana nueva se vea desde el domingo, para que quien quiera vaya adelantando. Hoy cada semana
aparece hasta su lunes.

## What Changes

- El domingo ya se ve la semana del lunes siguiente, en la tarjeta «⏩ Adelanta la próxima semana». «Esta semana»
  sigue mostrando la semana en curso, con lo que vence ese domingo.
- Lo que se abre el lunes (las actividades de la semana y los repasos) se puede empezar desde el domingo.
- El examen del viernes, el refuerzo y el Meet se siguen abriendo en su día.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `actividades-online`: «Semanas publicadas por adelantado» abre la semana el domingo anterior.

## Impact

- `server/motor.ts`: `abreYa` y `lunesSiguiente`, que usan `estadoItem`.
- `server/actividades.ts`: visibilidad de las semanas y material del Meet.
- `server/resumen.ts` e `ingles/comun.js` (tarjeta para adelantar).
- Pruebas: `server/semana_domingo_test.ts` y `server/motor_test.ts`.
