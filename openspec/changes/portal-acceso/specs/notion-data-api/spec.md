## ADDED Requirements

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
