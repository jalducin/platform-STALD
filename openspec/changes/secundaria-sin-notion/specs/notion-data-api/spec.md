## ADDED Requirements

### Requirement: Base «📖 Clases» como historial
La base de Notion «📖 Clases» de Secundaria SHALL quedar como historial: ninguna página SHALL leerla ni escribirla y
la identidad de Secundaria SHALL NOT depender de ella (salvo la caída temporal mientras falte el registro). `GET /data`
SHALL seguir en el servidor con sus reglas de acceso, sin consumidores en las páginas. `NOTION_TOKEN` SHALL ser
opcional: sin él, las demás rutas SHALL funcionar.

#### Scenario: Ninguna página pide /data
- **WHEN** la alumna o el profe abren `secundaria.html` o el portal
- **THEN** ninguna petición va a `/data`

#### Scenario: Servidor sin token
- **WHEN** el servidor corre sin `NOTION_TOKEN` (o las bases de Notion ya no existen)
- **THEN** `/perfil`, `/secundaria/actividades` y Juegos responden como siempre

## MODIFIED Requirements

### Requirement: Perfil de acceso
El sistema SHALL exponer `GET /perfil?email=`. Responde `{ email, isAdmin, nombre, accesos: { ingles,
secundaria, juegos }, conocido }`. Inglés SHALL calcularse con el registro de alumnos y alumnas y Secundaria
con el mismo registro (marca `secundaria` o clases exclusivas), con las mismas reglas que `/ingles/data` y
`/secundaria/actividades`. SHALL NOT devolver filas ni correos de otras personas.

#### Scenario: Alumna con Inglés y Secundaria
- **WHEN** consulta un correo que está en los dos registros
- **THEN** `accesos.ingles` y `accesos.secundaria` son `true` y `nombre` es su "Nombre" de Inglés

#### Scenario: Solo Secundaria
- **WHEN** el correo tiene Secundaria y está de baja de Inglés, con `"nombre": "Sofy"`
- **THEN** `accesos.ingles` es `false`, `accesos.secundaria` es `true` y `nombre` es «Sofy»

#### Scenario: Desconocido
- **WHEN** el correo no está en ningún registro
- **THEN** `conocido` es `false` y todos los accesos son `false`

#### Scenario: Sin correo
- **WHEN** falta `email`
- **THEN** responde 400 `missing_email`
