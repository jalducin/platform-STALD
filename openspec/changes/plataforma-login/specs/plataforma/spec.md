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
