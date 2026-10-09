## MODIFIED Requirements

### Requirement: Entrada con correo y contraseña
Las clases (alumnos, alumnas y el profe) SHALL entrar con correo y contraseña en `pintarEntrada` de
`comun/auth.js` y en el portal, sin enlaces ni códigos por correo. La contraseña inicial SHALL ser «clase» para
alumnos y alumnas y «sensei» para el profe. Si el inicio de sesión falla, la página SHALL llamar a
`POST /auth/preparar`. El servidor SHALL preparar la cuenta (crearla con el correo confirmado, o ponerle la
contraseña inicial y confirmar su correo) solo si la contraseña es la inicial de esa persona y aún no tiene una propia. Con otra
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

#### Scenario: Cuenta con el correo sin confirmar
- **WHEN** Jesús, cuya cuenta quedó sin confirmar por un enlace que nunca abrió, entra con su correo y «clase»
- **THEN** el servidor confirma su correo al prepararla y él entra
