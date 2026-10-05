## ADDED Requirements

### Requirement: Juegos guardados en Postgres
Los datos de Juegos (salas, partidas, ranking, perfiles, fotos e invitados) SHALL guardarse en Postgres. SHALL NOT
consumir el límite de la API de GitHub.

#### Scenario: Partida sin GitHub
- **WHEN** dos personas juegan una partida
- **THEN** cada jugada se guarda en Postgres
- **AND** no se hace ninguna petición a la API de GitHub para guardarla

### Requirement: Fallas visibles en lugar de datos viejos
Si Postgres no responde, el servidor SHALL responder un error recuperable (503). SHALL NOT mostrar una copia vieja
de los datos.

#### Scenario: Base caída
- **WHEN** Postgres no responde al consultar resultados
- **THEN** la página muestra que intente de nuevo, sin calificaciones desactualizadas

### Requirement: Identidad de Inglés sin Notion
La identidad de alumnos y alumnas de Inglés SHALL salir del registro de la plataforma. Las personas que antes solo
existían en Notion SHALL conservar su acceso, porque se copian al registro antes de dejar de leer Notion.

#### Scenario: Alumna que solo estaba en Notion
- **WHEN** Inglés deja de leer Notion
- **THEN** Marisol sigue entrando con su correo y ve sus resultados
