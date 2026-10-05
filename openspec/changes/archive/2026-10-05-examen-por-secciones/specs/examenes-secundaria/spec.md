## ADDED Requirements

### Requirement: Examen separado por secciones
Un elemento con `porSecciones: true` SHALL entregar sus preguntas agrupadas por tema (materia), en el orden de
`temas`, con un encabezado por sección. Dentro de cada sección el orden SHALL variar por intento.

#### Scenario: Examen mensual por materias
- **WHEN** la alumna abre el examen mensual con `porSecciones`
- **THEN** ve primero todas las preguntas de la primera materia, luego las de la segunda, y así sucesivamente, cada
  bloque con su encabezado
