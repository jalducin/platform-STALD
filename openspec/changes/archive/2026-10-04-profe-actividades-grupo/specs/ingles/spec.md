## ADDED Requirements

### Requirement: Actividades del grupo en la ruta del profe
La ruta del profe SHALL incluir las actividades, exámenes y refuerzos de su grupo, disponibles en cuanto se suben
y con fecha límite el día anterior a que se abran para el grupo. Sus intentos SHALL guardarse como "Profe" y SHALL
no aparecer en ninguna vista de resultados del grupo.

#### Scenario: Lo ya publicado, en atraso
- **WHEN** el profe abre su ruta el 1 de octubre
- **THEN** ve las actividades del 29 de sep y del 1 de oct y el diagnóstico como atrasadas, el examen del
  viernes para hoy y el refuerzo para mañana, y puede resolverlos

#### Scenario: Semana nueva antes que el grupo
- **WHEN** se sube la semana siguiente el fin de semana
- **THEN** el profe ya puede resolver sus actividades, aunque al grupo se le abran el lunes

#### Scenario: Sin mezclarse con el grupo
- **WHEN** el profe resuelve una actividad del grupo
- **THEN** su calificación no aparece en los resultados, temas a reforzar ni últimas calificaciones del grupo
