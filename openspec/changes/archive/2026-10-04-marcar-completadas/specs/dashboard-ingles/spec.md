## ADDED Requirements

### Requirement: Marcar hecha desde el tablero
Cada tarea de Notion del tablero de Inglés SHALL tener un botón "✓ Marcar hecha" si no está completada, y
"↩" para desmarcar si lo está. Al confirmar, la página SHALL llamar a la ruta de completado, recargar los
datos y mostrar la tarea en su nueva sección.

#### Scenario: Marcar
- **WHEN** la alumna toca "✓ Marcar hecha" en una tarea atrasada y confirma
- **THEN** la tarea pasa a "✅ Realizadas · últimos 3 días"

#### Scenario: Desmarcar
- **WHEN** toca "↩" en una tarea realizada y confirma
- **THEN** la tarea vuelve a su sección según su fecha

### Requirement: Actividad con intento cuenta como hecha
Una actividad en línea (actividad, refuerzo, reto) con al menos un intento enviado SHALL contar como hecha
en el tablero y en el progreso, con su calificación. El botón "Corregir errores" SHALL seguir disponible
mientras quede intento, porque la corrección es opcional.

#### Scenario: Primer intento enviado
- **WHEN** la alumna envió el intento 1 de una actividad con 75 %
- **THEN** la actividad aparece como hecha, con ⭐ 75 % y el botón "Corregir errores"
