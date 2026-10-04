## Why

El profe pidió (2026-10-01) tener en su ruta **las actividades de su grupo**: su deber es resolverlas antes que
ellos, y quiere hoy mismo las que ya están publicadas, en atraso.

## What Changes

- La ruta del profe (`/ingles/profe/actividades`) incluye los elementos del grupo de tipo `actividad`, `examen`
  y `refuerzo`, de **todas** las semanas subidas y los exámenes sueltos (p. ej. el diagnóstico). El Meet no se
  incluye, porque esa clase la da el profe.
- Para el profe:
  - se abren en cuanto se suben (aunque al grupo todavía no se le abran);
  - su **fecha límite es el día anterior a que se abran para el grupo**, así que lo ya publicado le aparece
    en atraso;
  - el listado los marca con `grupo: true` y la página los muestra en una tarjeta "📚 Lo de tu grupo".
- Los intentos del profe se guardan como "Profe" en `resultados/<id>/profe.json` y **se excluyen** de las
  vistas del grupo: resultados del admin, resumen de temas y últimas calificaciones.
- El refuerzo del profe se arma con sus propios resultados del examen de la semana (mismo motor).

## Capabilities

### Modified Capabilities
- `ingles`: la ruta del profe incluye los elementos del grupo.

## Impact

- `server/actividades.ts` y `ingles.html` (modo profe). Sin datos nuevos.
- Acciones externas: redeploy al hacer merge y verificación en producción (solo lectura).
