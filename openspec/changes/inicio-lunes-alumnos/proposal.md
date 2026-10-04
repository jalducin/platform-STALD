## Why

Al dar de alta a un alumno o alumna nuevo a media semana, le aparecen como atrasadas todas las actividades del grupo
que ya vencieron. El profe pide que los nuevos empiecen su curso el lunes siguiente, sin clases en atraso.

## What Changes

- El alta guarda `inicio`, que es el lunes siguiente a la fecha del alta en hora de CDMX. Si el alta cae en lunes,
  `inicio` es el lunes de la semana que sigue.
- Si el alta solo liga un correo a un alumno que ya existe en Notion, no se guarda `inicio`. Esa persona ya
  llevaba el curso y sus atrasos son reales.
- Para quien tiene `inicio`:
  - `GET /ingles/actividades` omite los elementos con `fechaLimite` anterior a `inicio`;
  - los elementos que vencen desde su `inicio` se ven igual que para el grupo.
- La página del admin muestra "inicia el lunes …" al dar de alta y en la lista de alumnos y alumnas.
- Las altas anteriores sin `inicio` no cambian.

## Capabilities

### Modified Capabilities
- `ingles`: alta de alumnos y alumnas, y actividades visibles.

## Impact

- `server/alumnos.ts`, `server/actividades.ts`, `server/main.ts` e `ingles.html`.
- `docs/data-model.md` (`alumnos.json`) y `docs/backend-standards.md`.
