## ADDED Requirements

### Requirement: Tarjeta de exámenes del alumno
`ingles.html` SHALL mostrar al alumno, arriba de su tablero, una tarjeta "📝 Exámenes" con cada examen y su
estado: "Disponible el <fecha>", botón "Resolver" o el resultado (porcentaje, nivel sugerido y secciones).

#### Scenario: Examen disponible
- **WHEN** el alumno entra el 2026-09-27 sin haberlo resuelto
- **THEN** ve "Diagnóstico A1" con el botón "Resolver"

#### Scenario: Resolver
- **WHEN** el alumno responde las 33 preguntas y confirma el envío
- **THEN** ve de inmediato su porcentaje, su nivel sugerido, sus fortalezas y debilidades por tema con su retroalimentación y la revisión de sus errores, y la tarjeta queda como resuelta

#### Scenario: Envío incompleto
- **WHEN** faltan preguntas por responder
- **THEN** el botón de enviar está deshabilitado y se indica cuántas faltan

### Requirement: Última calificación y diagnóstico en la vista admin
En la vista admin, el encabezado de cada alumno SHALL mostrar la calificación de su última actividad
completada (la de `editadoEn` más reciente con `calificacion`) y el resultado del diagnóstico o "pendiente".
Dentro del bloque del alumno SHALL verse el resultado por sección con fortalezas, debilidades y los temas a reforzar.

#### Scenario: Alumno con actividad calificada
- **WHEN** la última actividad completada de Jesus tiene calificación "9"
- **THEN** su encabezado muestra "⭐ 9"

#### Scenario: Diagnóstico pendiente
- **WHEN** un alumno no ha resuelto el diagnóstico
- **THEN** su encabezado muestra "📝 pendiente"
