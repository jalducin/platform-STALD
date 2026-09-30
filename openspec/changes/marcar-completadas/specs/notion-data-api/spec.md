## ADDED Requirements

### Requirement: Marcar tareas de Notion como completadas
El sistema SHALL exponer `POST /ingles/data/<pageId>/completado?email=` con `{ completado: boolean }`,
que actualiza la propiedad "Completado" de esa página en Notion. SHALL permitirlo solo si la fila es
visible para ese correo, con las mismas reglas de `/ingles/data`. El admin puede en cualquier fila.

#### Scenario: La alumna marca su tarea
- **WHEN** Sofy envía `completado: true` para una fila donde su correo está en "Usuario"
- **THEN** responde 200 y la fila queda con "Completado" en Notion

#### Scenario: Fila de otra persona
- **WHEN** una alumna intenta marcar una fila que no es suya
- **THEN** responde 403 `sin_acceso` y Notion no cambia

#### Scenario: Admin
- **WHEN** el admin marca o desmarca cualquier fila
- **THEN** responde 200

#### Scenario: Datos inválidos
- **WHEN** falta el correo, o el cuerpo no trae `completado` booleano
- **THEN** responde 400

#### Scenario: Notion sin permiso de escritura
- **WHEN** Notion rechaza la actualización con 403
- **THEN** responde 502 `sin_permiso_notion`

#### Scenario: Filas con id
- **WHEN** se consulta `/ingles/data`
- **THEN** cada fila trae `id` (id de la página de Notion)
