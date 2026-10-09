## MODIFIED Requirements

### Requirement: Registro en Juegos sin validar el correo
Quien no es alumno, alumna ni el profe SHALL poder registrarse o volver a entrar a Juegos con correo y nick, al
instante, sin contraseña, enlace ni código. Los correos de las clases SHALL entrar con su contraseña: si el
registro responde `correo_de_clase`, la misma pantalla SHALL pedir la contraseña.

#### Scenario: Invitado nuevo
- **WHEN** alguien escribe su nick, acepta el aviso y escribe un correo que no es de las clases
- **THEN** entra a Juegos con su nick sin revisar su correo

#### Scenario: Invitado que regresa
- **WHEN** un invitado ya registrado escribe su correo y su nick
- **THEN** entra a Juegos

#### Scenario: Correo de una alumna
- **WHEN** alguien escribe en Juegos el correo de una alumna
- **THEN** no se crea sesión y se le pide la contraseña de ese correo

## REMOVED Requirements

### Requirement: Código de acceso de 8 dígitos
**Reason**: ya no hay códigos por correo.
**Migration**: las clases entran con correo y contraseña, y los invitados de Juegos con correo y nick.
