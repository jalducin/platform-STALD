## ADDED Requirements

### Requirement: Esta semana
`ingles.html` SHALL mostrar a cada alumno o alumna la tarjeta "📚 Esta semana" con los elementos de la semana
en orden de fecha: actividades, examen, refuerzo y Meet. Cada uno muestra estado, fecha límite, intentos
usados y mejor calificación. Los elementos SHALL aparecer también como filas del tablero (Hoy, Atrasadas,
Realizadas, Próximas), sin contar en el total x/51 de Notion. Las actividades de Notion se mantienen.

#### Scenario: Martes 29
- **WHEN** el alumno entra el 2026-09-29
- **THEN** la actividad del día aparece en "📌 Hoy" con el botón "Empezar"

### Requirement: Vista de actividad
Al abrir una actividad SHALL verse primero la teoría, luego los ejercicios y, al enviar, el resultado
inmediato (porcentaje, temas con retroalimentación y revisión de errores), con "Intento n de 2 · mejor x %"
y el botón "Reintentar" si queda un intento. Los tips extra (libreta y videos) SHALL verse en la teoría y
en el resultado.

#### Scenario: Reintentar
- **WHEN** el alumno termina su intento 1 con 60 %
- **THEN** ve su resultado y "Reintentar (1 intento restante)"; el intento 2 trae ejercicios distintos

### Requirement: Meet del domingo
El elemento `meet` SHALL mostrarse como fila del domingo con el enlace a la reunión cuando exista en el
JSON (`meetUrl`), o "El enlace se comparte por WhatsApp" si todavía no existe.

#### Scenario: Sin enlace
- **WHEN** `meetUrl` es null
- **THEN** la fila del domingo dice "El enlace se comparte por WhatsApp"
