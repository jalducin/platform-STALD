## MODIFIED Requirements

### Requirement: Entrada de invitados y Juegos activo
La tarjeta 🎮 Juegos del portal SHALL enlazar a `juegos.html`. La entrada del portal SHALL ofrecer siempre la
opción visible «Crea tu cuenta de Juegos» para quien solo viene a jugar, sin ser alumno o alumna. Con un correo
desconocido, el portal SHALL invitar a crear la cuenta de Juegos, sin presentarlo como error. La cuenta pide un
apodo y una casilla de aceptación del uso del correo. `/perfil` SHALL reconocer a quienes tienen cuenta de Juegos
(invitados registrados), solo con el acceso a Juegos. `index.html?juegos=1` SHALL llevar directo a crear la cuenta.

#### Scenario: Invitado nuevo
- **WHEN** un correo desconocido pone su apodo, acepta y entra
- **THEN** ve el portal con su apodo y solo la tarjeta Juegos

#### Scenario: Crear cuenta desde el botón visible
- **WHEN** alguien sin clases toca «Crea tu cuenta de Juegos» en el portal
- **THEN** llega a Juegos, recibe su enlace por correo y, al entrar, elige su apodo y juega

#### Scenario: Enlace para compartir
- **WHEN** alguien abre `index.html?juegos=1`
- **THEN** llega a la entrada de Juegos para crear su cuenta

#### Scenario: Invitado que regresa
- **WHEN** un invitado registrado vuelve a entrar con su correo
- **THEN** ve directamente su tarjeta Juegos

#### Scenario: Sin aceptar
- **WHEN** no marca la casilla de aceptación
- **THEN** no se registra y ve el aviso de que debe aceptarla
