## ADDED Requirements

### Requirement: Ruta de estudio del profe
El admin SHALL tener una subpágina propia con un plan mensual, temas de estudio, ejercicios de práctica y
2 exámenes por semana. Todo SHALL calificarse con el mismo motor que el grupo, y sus intentos SHALL guardarse
como "Profe". Alumnos y alumnas SHALL no verla ni poder abrirla.

#### Scenario: Examen directo de la semana del grupo
- **WHEN** el profe abre su ruta esta semana
- **THEN** encuentra el examen de los temas que su grupo ve en la semana 1 y el diagnóstico B1 → B2
- **AND** al enviar ve su calificación por tema

#### Scenario: Semana del profe
- **WHEN** empieza una semana del mes 1
- **THEN** ve la actividad A (lunes), el examen A (miércoles), la actividad B (jueves) y el examen B (sábado),
  cada examen bloqueado hasta su día

#### Scenario: Plan del mes
- **WHEN** abre la subpágina
- **THEN** ve las 4 semanas con objetivo, temas, meta de Busuu, rutina diaria y sus resultados

#### Scenario: Privado del profe
- **WHEN** un alumno o alumna pide la ruta del profe
- **THEN** responde 403 y la ruta no aparece en sus actividades
