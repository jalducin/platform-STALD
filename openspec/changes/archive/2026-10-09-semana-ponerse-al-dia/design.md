## Decisions

- **Dónde:** en `renderWeekCard`, que comparten la vista de alumnos y alumnas y la ruta del profe.
- **Qué entra:** el rango va del lunes de `act.semana.id` (o del de hoy) al domingo siguiente. Entran los elementos
  con `fechaLimite` en ese rango que no pertenecen a `act.semana.ids`.
- **Formato:** se pintan con la misma fila (`data-fecha`), así el filtro por día funciona sin cambios.
- **Sin servidor:** no se toca el servidor. La lista ya trae los elementos con la fecha de la prórroga
  (`paraAlumno`).
