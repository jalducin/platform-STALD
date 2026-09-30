## ADDED Requirements

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
