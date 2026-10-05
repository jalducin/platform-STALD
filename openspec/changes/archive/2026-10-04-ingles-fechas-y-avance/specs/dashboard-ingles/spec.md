## ADDED Requirements

### Requirement: Campos de avance en la fila
Cada fila de `/ingles/data` SHALL incluir además `calificacion` (texto o null), `dificultad` (A1–C2 o null)
y `editadoEn` (ISO 8601 de la última edición de la página).

#### Scenario: Calificación presente
- **WHEN** una fila tiene `Calificación` = "93%"
- **THEN** su `calificacion` en la respuesta es "93%"

#### Scenario: Sin calificación
- **WHEN** una fila tiene `Calificación` vacía
- **THEN** su `calificacion` es null

### Requirement: Vista organizada por estado
`ingles.html` SHALL mostrar las clases en este orden de secciones:
1. "Realizadas (últimos 3 días)": `completado` y `editadoEn` dentro de los últimos 3 días, la más reciente primero.
2. "Atrasadas": no completadas con fecha anterior a hoy, la más antigua primero.
3. "Hoy".
4. "Próximas": ascendente.
5. "Realizadas anteriores" y "Sin fecha", plegadas.

Cada fila SHALL mostrar su fecha de entrega y, si existe, su calificación. Las secciones con muchas filas
SHALL tener scroll interno. Arriba SHALL haber contadores de realizadas, atrasadas, hoy y próximas.

#### Scenario: Actividad de hoy
- **WHEN** una actividad no completada tiene fecha de hoy
- **THEN** aparece en "Hoy" y el contador de hoy la incluye

#### Scenario: Realizada ayer
- **WHEN** una actividad está completada y se editó ayer
- **THEN** aparece en "Realizadas (últimos 3 días)" con su calificación

#### Scenario: Realizada hace una semana
- **WHEN** una actividad está completada y se editó hace 7 días
- **THEN** aparece solo en "Realizadas anteriores"

#### Scenario: Vista admin
- **WHEN** el admin inicia sesión
- **THEN** cada alumno se muestra plegable, con sus contadores y el mismo orden de secciones dentro
