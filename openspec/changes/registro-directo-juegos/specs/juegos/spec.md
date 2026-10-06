## ADDED Requirements

### Requirement: Registro en Juegos sin validar el correo
Quien no es alumno, alumna ni el profe SHALL poder crear su cuenta de Juegos con correo y apodo y entrar a jugar al
instante, sin abrir ningún enlace ni escribir un código. Los correos de las clases SHALL seguir entrando con su
enlace.

#### Scenario: Invitado nuevo
- **WHEN** alguien elige su apodo, acepta el aviso y escribe un correo que no es de las clases
- **THEN** entra a Juegos con su apodo sin revisar su correo

#### Scenario: Correo de una alumna
- **WHEN** alguien escribe en el registro el correo de una alumna
- **THEN** no se crea sesión y se le pide entrar con el enlace que llega a ese correo

### Requirement: Código de acceso de 8 dígitos
La pantalla del código SHALL aceptar códigos de 6 a 8 dígitos, porque Supabase manda códigos de 8.

#### Scenario: Código de 8 dígitos
- **WHEN** alguien escribe el código de 8 dígitos de su correo
- **THEN** puede enviarlo y entra
