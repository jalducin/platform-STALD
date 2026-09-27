## ADDED Requirements

### Requirement: Tarjeta de exámenes del alumno
`ingles.html` SHALL mostrar al alumno, arriba de su tablero, una tarjeta "📝 Exámenes" con cada examen y su
estado: "Disponible el <fecha>", botón "Resolver" con su fecha límite, o el resultado (porcentaje, nivel sugerido y secciones).

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

### Requirement: El examen aparece como actividad del día
Cada examen SHALL aparecer también como una fila del tablero del alumno con fecha = `fechaLimite`, en
la misma lógica de secciones: "📌 Hoy" en su fecha, "⏰ Atrasadas" después si no se ha resuelto y
"✅ Realizadas" cuando se resuelve, con su porcentaje como calificación. La fila SHALL tener el botón
"Resolver" (o "Ver resultado") en lugar de "Abrir ↗". La fila de examen NO SHALL contar en el total x/51
de actividades. En la vista admin, la fila se muestra en el tablero de cada alumno según su resultado.

#### Scenario: Día del examen
- **WHEN** el alumno entra el 2026-09-27 sin haberlo resuelto
- **THEN** "📝 Examen diagnóstico A1" aparece en "📌 Hoy" con el botón "Resolver" y el contador de hoy lo incluye

#### Scenario: Examen resuelto
- **WHEN** el alumno ya resolvió el diagnóstico con 76 %
- **THEN** la fila aparece en "✅ Realizadas" con "⭐ 76%" y el botón "Ver resultado"

#### Scenario: Adelantar desde Próximas
- **WHEN** el alumno entra el 2026-09-26 sin haberlo resuelto
- **THEN** la fila aparece en "📅 Próximas" como "en 1d" y ya tiene el botón "Resolver"
