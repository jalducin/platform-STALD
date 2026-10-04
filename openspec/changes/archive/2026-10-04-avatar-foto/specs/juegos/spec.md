## ADDED Requirements

### Requirement: Foto como avatar
Cada jugador SHALL poder subir una imagen de su galería como avatar, solo si marca la casilla de permiso
de su mamá, papá o tutor. El navegador SHALL reducirla a 128×128 JPEG y el servidor SHALL rechazar
imágenes que no sean JPEG o pesen más de 40 KB. La foto SHALL verse donde se ve el avatar, servida por
un enlace no adivinable, y elegir un personaje SHALL quitarla.

#### Scenario: Subir foto
- **WHEN** Sofy elige una foto de su galería, marca el permiso y guarda
- **THEN** su chip, el ranking y las partidas muestran su foto

#### Scenario: Sin permiso
- **WHEN** se envía una foto sin `acepto: true`
- **THEN** responde 400 `debe_aceptar` y no cambia el avatar

#### Scenario: Imagen inválida o grande
- **WHEN** se envía algo que no es JPEG o pesa más de 40 KB
- **THEN** responde 400 y no se guarda nada

#### Scenario: Volver a un personaje
- **WHEN** quien tiene foto elige un personaje
- **THEN** su avatar es el personaje y la foto anterior deja de existir (404)

#### Scenario: Foto borrada
- **WHEN** una página muestra un avatar cuya foto ya no existe
- **THEN** se ve el personaje en su lugar

### Requirement: Moderación de fotos
El admin SHALL ver la lista de fotos activas y SHALL poder quitar la de cualquier jugador; el jugador
vuelve a su personaje. Nadie más SHALL poder listar o quitar fotos ajenas.

#### Scenario: Quitar foto
- **WHEN** el admin quita la foto de un jugador
- **THEN** la foto deja de existir y el jugador aparece con su personaje

#### Scenario: Sin permiso de admin
- **WHEN** un alumno o alumna pide la lista o quitar una foto
- **THEN** responde 403
