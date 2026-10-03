## ADDED Requirements

### Requirement: Examen semanal con segunda oportunidad
El examen semanal SHALL ofrecer dos oportunidades: la primera desde su día (viernes) y la segunda desde la fecha de
`segundaOportunidad` (domingo), con una selección nueva de preguntas. SHALL contar la mejor de las dos. Entre una y
otra SHALL quedar en espera y mostrar la fecha de la segunda.

#### Scenario: Primera oportunidad el viernes
- **WHEN** una alumna resuelve el examen el viernes
- **THEN** ve su resultado y el aviso "Tienes una 2.ª oportunidad el dom 4 de oct"

#### Scenario: Esperando el domingo
- **WHEN** intenta abrir el examen el sábado
- **THEN** no puede (en espera) y ve la fecha de su 2.ª oportunidad

#### Scenario: Segunda oportunidad el domingo
- **WHEN** abre el examen el domingo
- **THEN** recibe preguntas nuevas del banco, y su calificación es la mejor de las dos

#### Scenario: Validación
- **WHEN** un examen trae `segundaOportunidad` sin `intentos: 2` o con una fecha que no es posterior a su día
- **THEN** el validador lo marca como error
