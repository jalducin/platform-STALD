## ADDED Requirements

### Requirement: Filtrado por correo en el servidor
`GET /ingles/data?email=<correo>` SHALL devolver solo las filas cuyo `Usuario` incluya a una persona con
ese correo. Si el correo coincide con `SUPER_ADMIN_EMAIL`, SHALL devolver todas las filas con
`isAdmin: true`. Sin `email` SHALL responder 400 `missing_email`.

#### Scenario: Alumno asignado
- **WHEN** un alumno con filas asignadas consulta con su correo
- **THEN** recibe solo sus filas e `isAdmin: false`

#### Scenario: Correo sin filas
- **WHEN** se consulta con un correo que no está en ningún `Usuario`
- **THEN** la respuesta es 200 con `rows: []`

#### Scenario: Sin correo
- **WHEN** se llama sin el parámetro `email`
- **THEN** la respuesta es 400 con `{ "error": "missing_email" }`

#### Scenario: Admin
- **WHEN** se consulta con el correo configurado en `SUPER_ADMIN_EMAIL`
- **THEN** se reciben las filas de todos los alumnos e `isAdmin: true`

### Requirement: Forma de la fila de Inglés
Cada fila SHALL incluir `name`, `label` ("Módulo · Tipo"), `completado`, `fecha` (de `Fecha Entrega `),
`alumno` (de `Nombre`), `userNames` y `url`. La respuesta NO SHALL incluir correos (`userEmails`) ni IDs de usuario.

#### Scenario: Fecha poblada
- **WHEN** una fila tiene `Fecha Entrega ` = 2026-10-01
- **THEN** su `fecha` en la respuesta es "2026-10-01"

#### Scenario: Sin correos en la respuesta
- **WHEN** el admin consulta `/ingles/data`
- **THEN** ninguna fila contiene las claves `userEmails` ni `userIds`

### Requirement: Vista de administrador agrupada por alumno
En `ingles.html`, cuando `isAdmin` es true, las filas SHALL agruparse por `alumno`, con un encabezado por
alumno y su conteo de completadas/total. Para un alumno, SHALL mostrarse una sola lista con pendientes primero.

#### Scenario: Admin ve grupos
- **WHEN** el admin inicia sesión
- **THEN** ve una sección por cada alumno (Angel, Fernando, Jesus, Laura, Marisol) con "x/51"

#### Scenario: Alumno ve su lista
- **WHEN** un alumno inicia sesión
- **THEN** ve solo sus clases, pendientes primero, sin encabezados de otros alumnos

### Requirement: Raíz de la función sin HTML
Cualquier ruta distinta de `/data` e `/ingles/data` SHALL responder 404 JSON `{ "error": "not_found" }`.

#### Scenario: Raíz
- **WHEN** se hace GET a la raíz de la función
- **THEN** la respuesta es 404 con `{ "error": "not_found" }`
