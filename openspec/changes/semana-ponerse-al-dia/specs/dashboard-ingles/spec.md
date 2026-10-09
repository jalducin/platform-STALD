## ADDED Requirements

### Requirement: Aviso de hoy y atrasadas
Inicio y Semana SHALL mostrar arriba el aviso «Tienes N para hoy y M atrasadas» cuando alumnos y alumnas
tengan elementos pendientes que vencen hoy o ya vencieron, de cualquier semana (incluido el material de
lectura del Meet). Su botón «Ver solo hoy y atrasadas →» SHALL abrir una vista que muestra solo esos elementos, en orden
de fecha, cada uno con su acción. Sin pendientes, el aviso NO SHALL aparecer.

#### Scenario: Alumno con atrasos
- **WHEN** Fernando tiene 2 actividades para hoy y 3 atrasadas
- **THEN** ve «⏰ Tienes 2 para hoy y 3 atrasadas» y, al tocar el botón, solo esas 5 con «Empezar»

## MODIFIED Requirements

### Requirement: Esta semana
`ingles.html` SHALL mostrar a cada alumno o alumna la tarjeta "📚 Esta semana" con los elementos de la semana
en orden de fecha: actividades, examen, refuerzo y Meet. Cada uno muestra estado, fecha límite, intentos
usados y mejor calificación. Los elementos SHALL aparecer también como filas del tablero (Hoy, Atrasadas,
Realizadas, Próximas), sin contar en el total x/51 de Notion. Las actividades de Notion se mantienen.
Debajo SHALL mostrar «📌 Para ponerte al día» con los elementos de **otras** semanas cuya fecha límite (con su
prórroga) cae entre el lunes y el domingo de la semana actual, en orden de fecha y con el mismo formato y
acción. También se filtran al tocar un día en «Lunes a domingo».

#### Scenario: Martes 29
- **WHEN** el alumno entra el 2026-09-29
- **THEN** la actividad del día aparece en "📌 Hoy" con el botón "Empezar"

#### Scenario: Alumno que se pone al día
- **WHEN** Fernando tiene la actividad del 29 de septiembre con prórroga al viernes 9 de octubre
- **THEN** la ve en «📌 Para ponerte al día» de la semana del 5 de octubre, con el botón «Empezar»
