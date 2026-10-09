## ADDED Requirements

### Requirement: Entrada con correo y contraseña
Las clases (alumnos, alumnas y el profe) SHALL entrar con correo y contraseña en `pintarEntrada` de
`comun/auth.js` y en el portal, sin enlaces ni códigos por correo. La contraseña inicial SHALL ser «clase» para
alumnos y alumnas y «sensei» para el profe. Si el inicio de sesión falla, la página SHALL llamar a
`POST /auth/preparar`. El servidor SHALL preparar la cuenta (crearla con el correo confirmado o ponerle la
contraseña inicial) solo si la contraseña es la inicial de esa persona y aún no tiene una propia. Con otra
contraseña, o con un correo que no es de las clases, SHALL responder 401. Tras 10 intentos por correo en 10
minutos SHALL responder 429. El error en la página SHALL ser «Correo o contraseña incorrectos. Si la olvidaste,
pídele a tu profe que la restablezca.»

#### Scenario: Primera entrada de una alumna
- **WHEN** Marisol, que nunca ha usado contraseña, entra con su correo y «clase»
- **THEN** el servidor le prepara la cuenta sin mandar correo y ella entra

#### Scenario: Contraseña equivocada
- **WHEN** alguien escribe una contraseña que no es la suya
- **THEN** no entra y ve «Correo o contraseña incorrectos…»

#### Scenario: Ya tiene contraseña propia
- **WHEN** alguien que ya cambió su contraseña escribe «clase»
- **THEN** no entra

### Requirement: Cambio de contraseña
Al entrar con la contraseña inicial, la página SHALL pedir una nueva. Con «sensei», el cambio SHALL ser
obligatorio; con «clase», SHALL ofrecer «Ahora no». El portal SHALL ofrecer «🔑 Cambiar contraseña».
`POST /auth/contrasena { nueva }` SHALL exigir sesión y aceptar de 6 a 72 caracteres distintos de las iniciales.
Al aceptarla, SHALL marcar que la cuenta tiene contraseña propia.

#### Scenario: El profe entra con la inicial
- **WHEN** el profe entra con «sensei»
- **THEN** debe poner una contraseña nueva antes de ver el portal

#### Scenario: Alumna lo deja para después
- **WHEN** una alumna entra con «clase» y toca «Ahora no»
- **THEN** entra normal y se le vuelve a pedir la próxima vez

### Requirement: Restablecer contraseña desde el portal
El profe SHALL poder restablecer la contraseña de un correo desde el portal con «🔑 Restablecer contraseña», que
usa `POST /auth/restablecer { email }`. Solo el profe con sesión SHALL poder usar esa ruta. Tras restablecerla, la
cuenta SHALL volver a entrar con su contraseña inicial.

#### Scenario: Alumna olvidó su contraseña
- **WHEN** el profe restablece el correo de Sofía
- **THEN** Sofía entra con «clase» y se le pide una nueva

### Requirement: ¿Olvidaste tu contraseña?
Las pantallas de entrada SHALL ofrecer «¿Olvidaste tu contraseña?». `POST /auth/olvide { email }` (sin sesión)
SHALL mandar un enlace de acceso por correo (Supabase `/auth/v1/otp`) solo a los correos de las clases y del
profe, como máximo 3 por correo cada hora. Para otro correo SHALL responder 404 `no_es_de_clase`; si el correo de
Supabase se agotó, 429 `limite_correo`, y la página SHALL sugerir pedirle al profe que restablezca la contraseña.
Al volver con el enlace, el portal SHALL pedir una contraseña nueva.

#### Scenario: Alumna que olvidó su contraseña
- **WHEN** Sofía escribe su correo y toca «¿Olvidaste tu contraseña?»
- **THEN** le llega un enlace; al abrirlo entra al portal y se le pide una contraseña nueva

#### Scenario: El profe no acierta su contraseña
- **WHEN** el profe toca «¿Olvidaste tu contraseña?» con su correo
- **THEN** le llega su enlace de acceso

#### Scenario: Correo de Juegos
- **WHEN** alguien que no es de las clases lo pide
- **THEN** no se manda correo y se le recuerda que en Juegos entra con su correo y nick

## REMOVED Requirements

### Requirement: Ayuda y reenvío cuando no llega el enlace
**Reason**: ya no se entra con enlace por correo, porque el correo de Supabase se agotaba.
**Migration**: se entra con correo y contraseña; si alguien la olvida, el profe la restablece.
