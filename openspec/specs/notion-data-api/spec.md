# notion-data-api Specification

## Purpose
Lectura y escritura de las bases de Notion desde el servidor: títulos de fila, marcar tareas como completadas y perfil de acceso por correo. Origen: prorroga-por-alumno, marcar-completadas y portal-acceso.
## Requirements
### Requirement: Título de la fila sin depender del nombre de la propiedad
El sistema SHALL tomar el título de cada fila de Notion de la propiedad de tipo `title`, se llame como se
llame (en "📖 Clases Inglés" hoy no tiene nombre). Solo si no hay texto SHALL usar "(sin título)".

#### Scenario: Propiedad de título renombrada
- **WHEN** la propiedad de título de la base se llama "" (vacío) en lugar de "Name"
- **THEN** la fila muestra su título real, p. ej. "📋 A1 Test #1 — Verbo TO BE + Pronombres"

#### Scenario: Título vacío
- **WHEN** la propiedad de título no tiene texto
- **THEN** la fila muestra "(sin título)"

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

### Requirement: Perfil de acceso
El sistema SHALL exponer `GET /perfil?email=`. Responde `{ email, isAdmin, nombre, accesos: { ingles,
secundaria, juegos }, conocido }`, calculado con las mismas reglas de acceso que `/data` e
`/ingles/data`. SHALL NOT devolver filas ni correos de otras personas.

#### Scenario: Alumna con Inglés y Secundaria
- **WHEN** consulta un correo que aparece en "Usuario" de ambas bases
- **THEN** `accesos.ingles` y `accesos.secundaria` son `true` y `nombre` es su "Nombre" de Inglés

#### Scenario: Solo Secundaria
- **WHEN** el correo solo está en Secundaria
- **THEN** `accesos.ingles` es `false` y `nombre` es su primer nombre de Notion

#### Scenario: Desconocido
- **WHEN** el correo no está en ninguna base
- **THEN** `conocido` es `false` y todos los accesos son `false`

#### Scenario: Sin correo
- **WHEN** falta `email`
- **THEN** responde 400 `missing_email`

