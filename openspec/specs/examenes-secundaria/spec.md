# examenes-secundaria Specification

## Purpose
TBD - created by archiving change examen-secundaria. Update Purpose after archive.
## Requirements
### Requirement: Exámenes de Secundaria
La plataforma SHALL ofrecer exámenes de Secundaria en `ingles.html?modo=secundaria`, con el motor de actividades y
contenido en `contenido/secundaria/`. La identidad SHALL salir de las filas de Secundaria. El admin SHALL ver los
resultados por persona y por materia.

#### Scenario: Alumna de Secundaria
- **WHEN** una alumna de Secundaria entra a «📝 Exámenes»
- **THEN** ve sus exámenes, los resuelve y ve su calificación por materia

#### Scenario: Sin Secundaria
- **WHEN** entra un correo sin filas de Secundaria
- **THEN** recibe un aviso de que la sección es solo para alumnos y alumnas de Secundaria

### Requirement: Examen exclusivo
Un elemento con `alumnos` SHALL verse y abrirse solo por esas personas. Para cualquier otra persona SHALL no
aparecer en la lista y SHALL responder 404 al abrirlo por id.

#### Scenario: Otra persona
- **WHEN** otra persona de Secundaria pide el examen exclusivo
- **THEN** no lo ve en su lista y al abrirlo recibe 404

### Requirement: Dos oportunidades, cuenta la mejor
Un examen de Secundaria con `intentos: 2` SHALL permitir el segundo intento sin esperar y SHALL conservar la mejor
calificación de los dos.

#### Scenario: Mejora en el segundo intento
- **WHEN** saca 50 % en el primer intento y 100 % en el segundo
- **THEN** su calificación es 100 % y no hay un tercer intento

### Requirement: Examen separado por secciones
Un elemento con `porSecciones: true` SHALL entregar sus preguntas agrupadas por tema (materia), en el orden de
`temas`, con un encabezado por sección. Dentro de cada sección el orden SHALL variar por intento.

#### Scenario: Examen mensual por materias
- **WHEN** la alumna abre el examen mensual con `porSecciones`
- **THEN** ve primero todas las preguntas de la primera materia, luego las de la segunda, y así sucesivamente, cada
  bloque con su encabezado

