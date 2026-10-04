## ADDED Requirements

### Requirement: Inicio el lunes siguiente para alumnos y alumnas nuevos
Un alta nueva SHALL guardar `inicio`, que es el lunes siguiente a la fecha del alta en CDMX. Las actividades con
fecha límite anterior a `inicio` SHALL NOT aparecer en la lista de esa persona, ni como atrasadas ni como
pendientes.

#### Scenario: Alta a media semana
- **WHEN** el profe da de alta a Luz el miércoles 30 de septiembre
- **THEN** su `inicio` es el lunes 5 de octubre y no ve como atrasadas las actividades que vencieron antes

#### Scenario: Antes de su lunes
- **WHEN** Luz entra a Inglés antes de su lunes de inicio
- **THEN** ve "Tu curso empieza el lunes 5 de oct" en lugar de una lista vacía

#### Scenario: Actividades desde su inicio
- **WHEN** hay un examen con fecha límite del 9 de octubre
- **THEN** Luz lo ve igual que el resto del grupo

#### Scenario: Liga de un alumno existente
- **WHEN** el alta solo liga un correo a un alumno que ya tiene clases en Notion
- **THEN** no se guarda `inicio` y sus atrasos se ven como siempre
