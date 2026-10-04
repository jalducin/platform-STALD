## ADDED Requirements

### Requirement: Inicio de sesión con enlace mágico
La plataforma SHALL identificar a cada persona con una sesión verificada por Supabase Auth, mediante un enlace o
un código enviado a su correo. El servidor SHALL tomar el correo de la sesión verificada y no de la URL.

#### Scenario: Entrar con el enlace
- **WHEN** Luz escribe su correo y toca el enlace que le llega
- **THEN** entra a su Inglés sin contraseña y su sesión se mantiene en ese celular

#### Scenario: Suplantación bloqueada
- **WHEN** alguien llama a la API con `?email=` de otra persona y sin sesión, fuera de la transición
- **THEN** el servidor responde 401 y no muestra datos

#### Scenario: Admin protegido
- **WHEN** alguien usa el correo del admin sin sesión, incluso durante la transición
- **THEN** el servidor responde 401

#### Scenario: Cerrar sesión
- **WHEN** Luz toca 🚪 Cerrar sesión
- **THEN** vuelve a la pantalla de entrada y la sesión ya no sirve en ese dispositivo

#### Scenario: Transición para alumnos y alumnas
- **WHEN** un alumno o alumna con el correo guardado de antes entra sin sesión, antes de que termine
  `LOGIN_TRANSICION_HASTA`
- **THEN** sigue viendo sus clases y la página le invita a activar su acceso seguro

#### Scenario: Sesión vencida o inválida
- **WHEN** el servidor responde 401 (`sesion_invalida` o `inicia_sesion`)
- **THEN** la página muestra la pantalla de entrada en lugar de un error

### Requirement: Enlace de acceso generado por el profe
El admin con sesión SHALL poder generar un enlace de acceso para una persona ya dada de alta en Supabase Auth, sin
enviar correo, para compartirlo por WhatsApp. Nadie más SHALL poder generarlo.

#### Scenario: El profe genera un enlace
- **WHEN** el profe, con sesión, pide el enlace de `luz@…`
- **THEN** recibe un enlace de un solo uso (y su código) para mandárselo

#### Scenario: Un alumno intenta generar un enlace
- **WHEN** alguien que no es el admin, o el admin sin sesión, llama a `POST /auth/enlace`
- **THEN** el servidor responde 403 `solo_admin` o 401 y no genera nada
