## Why

En la vista del admin de Inglés aparece un alumno llamado "Sin nombre asignado". El origen es una fila vacía en la
base "Clases Inglés" de Notion: título "(sin título)", sin campo Nombre, sin fecha y marcada como completada. Se
editó el 3 de octubre a las 18:59 (CDMX).

El profe ya no usa Notion para Inglés y pidió quitar esa fila, así que la plataforma tiene que dejar de mostrar
filas que no pertenecen a nadie. No se edita Notion.

## What Changes

- `filasNotion()` descarta las filas de Notion que no tienen alumno (campo Nombre vacío), con la función
  `sinHuerfanas` de `server/alumnos.ts`.
- Ya no aparece "Sin nombre asignado" en el admin de Inglés, y esas filas no cuentan en tableros ni en conteos.
- No cambia nada para las filas que sí tienen alumno.

## Impact

- `server/alumnos.ts`, `server/main.ts` y `server/alumnos_test.ts`.
- Documentación: `docs/data-model.md`.
