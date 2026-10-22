## MODIFIED Requirements

### Requirement: Identidad de Inglés sin Notion
La identidad de alumnos y alumnas de Inglés SHALL salir del registro de la plataforma. Las personas que antes solo
existían en Notion SHALL conservar su acceso, porque se copian al registro antes de dejar de leer Notion. La identidad
de Secundaria SHALL salir del mismo registro (marca `secundaria` o clases exclusivas); ningún espacio SHALL leer
Notion para saber quién es una persona, salvo la caída temporal de Secundaria mientras nadie la tenga en el registro.

#### Scenario: Alumna que solo estaba en Notion
- **WHEN** Inglés deja de leer Notion
- **THEN** Marisol sigue entrando con su correo y ve sus resultados

#### Scenario: Inglés no consulta Notion
- **WHEN** alguien abre Inglés, el portal o Juegos
- **THEN** la identidad de Inglés sale solo del registro, sin consultar la base «Clases Inglés» de Notion
- **AND** quien solo aparece en Notion, sin estar en el registro, no entra a Inglés

#### Scenario: Secundaria no consulta Notion
- **WHEN** alguien con Secundaria en el registro abre el portal, Secundaria o Juegos
- **THEN** la identidad de Secundaria sale de ese registro, sin consultar la base «📖 Clases» de Notion

#### Scenario: Ya no se marcan tareas de Notion de Inglés
- **WHEN** alguien pide marcar una tarea de Notion de Inglés (`POST /ingles/data/<id>/completado`)
- **THEN** el servidor responde 404
- **AND** la página de Inglés no muestra tareas, botones ni calificaciones de Notion
