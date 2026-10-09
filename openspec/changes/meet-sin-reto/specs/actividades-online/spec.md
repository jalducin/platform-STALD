## MODIFIED Requirements

### Requirement: Clase del domingo (Meet)
El elemento `meet` SHALL ser solo la clase: el enlace del Meet (`meetUrl`, `hora`) y el material del profe.
El material del profe puede incluir:
- `guion` (solo admin): bloques con tiempo, objetivo y pasos para dar la clase. El primero es la
  retroalimentación, que la vista admin completa con los datos de cada alumno o alumna.
- `presentacion` (solo admin): las diapositivas para proyectar.
- `teoria` y `tips` de libreta, que el profe comparte en pantalla.

El Meet NO SHALL traer reto ni otra actividad de repaso para alumnos y alumnas. En su semana, alumnos y alumnas
SHALL ver el Meet solo con su enlace. El `guion` y la `presentacion` NO SHALL enviarse a quien no sea admin.

#### Scenario: Guion solo para admin
- **WHEN** una alumna ve la clase del domingo en su semana
- **THEN** ve el enlace del Meet («Unirme» o «Enlace por WhatsApp»), sin reto, y no recibe el `guion`

#### Scenario: Sin reto en vivo
- **WHEN** el profe publica un Meet sin `banco`
- **THEN** no hay «Reto en vivo» para alumnos y alumnas, y el Meet no cuenta en sus calificaciones
