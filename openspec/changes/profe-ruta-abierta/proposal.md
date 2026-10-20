## Why

El profe pidió (2026-10-19): «desbloquea todas porque mañana le daré duro a este curso». Su ruta propia de IA
(`contenido/profe/`, 8 semanas del 2026-10-19 al 2026-12-07, 24 elementos) ya tiene en el repo de datos
`disponibleDesde: "2026-10-19"` en los 24 y deja `fechaLimite` como ritmo sugerido. Faltaban dos cosas:

- `server/validar_semana.ts --profe` rechazaba esos datos («disponibleDesde fuera de <lunes>…» y «el examen debe
  quedar bloqueado hasta su día»), reglas pensadas para alumnos y alumnas.
- `/ingles/profe/actividades` solo listaba las semanas ya iniciadas (y el domingo, la siguiente). Los elementos de
  semanas futuras se abrían por id, pero la vista no los mostraba ni tenía cómo llegar a ellos.

## What Changes

- **Validador (`server/semana.ts`):** en modo `--profe`, `disponibleDesde` puede ser anterior al lunes de su semana
  (nunca posterior a `fechaLimite`) y la regla «examen bloqueado hasta su día» no aplica. El modo normal no cambia.
- **Servidor (`visibleItems`, solo ámbito del profe):** además de sus semanas iniciadas, lista los elementos de sus
  semanas futuras que ya abrieron (`disponibleDesde` ≤ hoy). «Esta semana» (`semanaPropia`) no cambia.
- **Vista (`ingles/profe.js`):** la pestaña «Plan del mes» pone el botón para resolver (o ver resultado) en cada
  elemento ya abierto de las 8 semanas, y avisa «🔓 Tu ruta ya está abierta…» cuando hay semanas futuras abiertas.
- **Pruebas:** unitarias en `server/profe_test.ts` y pasos nuevos en `e2e-ruta-profe` (24 abiertos, abribles desde el
  plan, sin atraso por `fechaLimite` futura).

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: requisito nuevo «Ruta propia del profe abierta a su ritmo» (ADDED, para no chocar con los cambios sin
  archivar `profe-semanas-del-grupo` y `profe-grupo-y-ruta-ia`, que modifican «Ruta de estudio del profe»).
- `carga-semanal`: requisito nuevo «Validar la ruta del profe a su ritmo» (ADDED).

## Impact

- Superficies: servidor Deno (`server/actividades.ts`, `server/semana.ts`, `server/validar_semana.ts`),
  `ingles.html` (`ingles/profe.js`, `ingles/ingles.css`), repo de datos (ya preparado por el profe; sin cambios aquí).
- Matriz de acceso: sin cambios. Solo el admin abre `/ingles/profe/actividades`; alumnos y alumnas siguen viendo
  solo semanas iniciadas del grupo (el cambio en `visibleItems` aplica solo al ámbito `profe`) y reciben 403/404 en
  la ruta y los elementos del profe. Sus intentos siguen en `resultados/<id>/profe.json`.
- Acciones externas: push del commit del repo de datos (usuario o sesión principal); redeploy automático al merge
  (agente); verificación de producción solo lectura (agente).

## Cómo revertir

Revertir el PR. Con los datos actuales, sin este cambio la vista vuelve a mostrar solo la semana en curso y el
validador `--profe` vuelve a marcar errores.
