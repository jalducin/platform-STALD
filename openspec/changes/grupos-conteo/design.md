## Decisiones
- `cuantos(id)` en `renderGruposAdmin` (`ingles/admin.js`) recorre `state.alumnosAdmin` (la lista del registro) y
  cuenta `grupoDeNombre(nombre).id === id`. Si la lista aún no carga, usa las inscripciones explícitas, como antes.
- No se crean inscripciones nuevas en la base: la regla del primer grupo activo ya cubre a quien no tiene una, y
  cambiarla movería a todos al mover el orden de los grupos.

## Pruebas
- E2E `grupos` (con `--pg`): la suma de los contadores de todos los grupos es igual al total del registro, y el
  grupo por omisión cuenta a quien no tiene inscripción.
