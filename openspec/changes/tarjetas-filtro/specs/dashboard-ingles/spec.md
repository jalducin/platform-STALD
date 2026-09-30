## ADDED Requirements

### Requirement: Tarjetas de resumen que filtran
Las tarjetas "Hechas 3 días", "Atrasadas", "Hoy" y "Próximas" SHALL ser botones.
- Al activar una, su tablero SHALL mostrar solo la sección correspondiente, marcar la tarjeta
  (`aria-pressed="true"`) y ofrecer "Ver todo".
- Al activarla de nuevo, o con "Ver todo", SHALL mostrarse todo.
- En la vista de admin, cada tablero de alumno o alumna SHALL filtrarse por separado.

#### Scenario: Filtrar atrasadas
- **WHEN** la alumna toca la tarjeta "Atrasadas"
- **THEN** solo se ve la sección "⏰ Atrasadas" y la tarjeta queda marcada

#### Scenario: Quitar el filtro
- **WHEN** con el filtro activo toca otra vez la tarjeta, o "Ver todo"
- **THEN** vuelven a verse todas las secciones

#### Scenario: Cambiar de filtro
- **WHEN** con "Atrasadas" activo toca "Próximas"
- **THEN** solo se ve "📅 Próximas" y solo esa tarjeta queda marcada

#### Scenario: Admin por alumno
- **WHEN** el admin filtra "Hoy" en el tablero de Marisol
- **THEN** el tablero de los demás alumnos y alumnas no cambia
