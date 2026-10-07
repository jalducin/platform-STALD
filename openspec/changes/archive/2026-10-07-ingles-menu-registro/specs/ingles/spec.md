## ADDED Requirements

### Requirement: Registro y avance separados en el menú del profe
La vista del profe en Inglés SHALL tener una opción de menú «Registro» con el alta y la administración de alumnos
y alumnas (grupo y quitar), separada de «Alumnos», que SHALL mostrar solo el avance de cada quien.

#### Scenario: Dar de alta sin empalmarse con el avance
- **WHEN** el profe abre «Registro»
- **THEN** ve el formulario de alta y la lista para administrar, sin los bloques de avance

#### Scenario: Revisar el avance
- **WHEN** el profe abre «Alumnos»
- **THEN** ve el avance de cada alumno o alumna, sin el formulario de alta
