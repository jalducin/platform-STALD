## MODIFIED Requirements

### Requirement: Guion de la clase del domingo en la vista admin
La vista admin SHALL tener los botones «📋 Guion» y «🎬 Presentar» en todo elemento `meet` que traiga `guion` o
`presentacion`, tenga o no reto. El guion SHALL mostrar, en este orden:
1. la retroalimentación por alumno o alumna (mejores calificaciones de la semana y temas a reforzar);
2. los bloques de la clase con sus tiempos;
3. la teoría para compartir en pantalla;
4. las tareas de libreta.

«👁 Probar el reto» SHALL aparecer solo si el Meet tiene reto.

#### Scenario: Retroalimentación en el guion
- **WHEN** el admin abre el guion
- **THEN** ve una tarjeta por alumno o alumna con sus porcentajes de la semana y sus temas a reforzar

#### Scenario: Meet sin reto
- **WHEN** el admin ve un Meet con guion y presentación pero sin reto
- **THEN** tiene «🎬 Presentar» y «📋 Guion», pero no «👁 Reto»
