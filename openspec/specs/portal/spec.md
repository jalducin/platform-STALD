# portal Specification

## Purpose
Portal de acceso único (`index.html`): entrada por correo, tarjetas por espacio, Secundaria en su propia página y entrada de invitados a Juegos. Origen: portal-acceso y juegos-plataforma.
## Requirements
### Requirement: Portal de acceso único
La dirección principal SHALL mostrar un portal:
- pide el correo una sola vez;
- saluda por nombre;
- muestra una tarjeta por cada espacio al que el correo tiene acceso, según `/perfil`.

Al abrir una tarjeta, la página del espacio SHALL entrar sin volver a pedir el correo.

#### Scenario: Alumna de Inglés
- **WHEN** Marisol entra al portal con su correo
- **THEN** ve "Hola, Marisol" y las tarjetas de Inglés y Juegos, pero no la de Secundaria
- **AND** al tocar Inglés entra directo a su tablero

#### Scenario: Admin
- **WHEN** el admin entra
- **THEN** ve las tarjetas de Inglés, Secundaria y Juegos, con la etiqueta "Modo maestro"

#### Scenario: Correo desconocido
- **WHEN** entra un correo sin filas
- **THEN** ve un mensaje claro de que no hay clases con ese correo y puede intentar con otro

#### Scenario: Sesión recordada
- **WHEN** alguien que ya tenía sesión en Secundaria o Inglés abre el portal
- **THEN** entra sin escribir el correo

#### Scenario: Cerrar sesión
- **WHEN** cierra sesión en el portal o en cualquier página
- **THEN** al volver al portal se pide el correo de nuevo

### Requirement: Secundaria en su propia página
El tablero de Secundaria SHALL servirse en `secundaria.html`, con el mismo contenido, y SHALL tener un
enlace "← Inicio" al portal, igual que `ingles.html`.

#### Scenario: Liga de Secundaria
- **WHEN** se abre `secundaria.html` con sesión
- **THEN** se ve el tablero de Secundaria como antes, con "← Inicio"

### Requirement: Entrada de invitados y Juegos activo
La tarjeta 🎮 Juegos del portal SHALL enlazar a `juegos.html`. Con un correo desconocido, el portal SHALL
ofrecer "Entrar como invitado a Juegos": pide un apodo y una casilla de aceptación del uso del correo.
`/perfil` SHALL reconocer a los invitados registrados, solo con el acceso a Juegos.

#### Scenario: Invitado nuevo
- **WHEN** un correo desconocido pone su apodo, acepta y entra
- **THEN** ve el portal con su apodo y solo la tarjeta Juegos

#### Scenario: Invitado que regresa
- **WHEN** un invitado registrado vuelve a entrar con su correo
- **THEN** ve directamente su tarjeta Juegos

#### Scenario: Sin aceptar
- **WHEN** no marca la casilla de aceptación
- **THEN** no se registra y ve el aviso de que debe aceptarla

