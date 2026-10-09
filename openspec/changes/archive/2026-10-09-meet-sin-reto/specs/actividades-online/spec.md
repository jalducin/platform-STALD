## MODIFIED Requirements

### Requirement: Clase del domingo (Meet)
El elemento `meet` SHALL ser solo la clase: el enlace del Meet (`meetUrl`, `hora`) y el material del profe.
El material del profe puede incluir:
- `guion` (solo admin): bloques con tiempo, objetivo y pasos para dar la clase. El primero es la
  retroalimentación, que la vista admin completa con los datos de cada alumno o alumna.
- `presentacion` (solo admin): las diapositivas para proyectar.
- `teoria` y `tips` de libreta, que el profe comparte en pantalla.

El Meet NO SHALL traer reto ni preguntas. Su actividad para alumnos y alumnas SHALL ser **leer el material**:
desde `disponibleDesde`, el Meet SHALL mostrar «📖 Material», que abre la teoría y los tips de la clase, sin
preguntas, junto al enlace. El `guion` y la `presentacion` NO SHALL enviarse a quien no sea admin.

#### Scenario: Material para leer
- **WHEN** una alumna toca «📖 Material» en la clase del domingo
- **THEN** lee la teoría y los tips de la clase, sin preguntas, y no recibe el `guion` ni la `presentacion`

#### Scenario: Antes de su fecha
- **WHEN** una alumna pide el material antes de `disponibleDesde`
- **THEN** recibe 403 `no_disponible`

#### Scenario: Sin reto en vivo
- **WHEN** el profe publica un Meet sin `banco`
- **THEN** no hay «Reto en vivo» para alumnos y alumnas, y el Meet no cuenta en sus calificaciones
