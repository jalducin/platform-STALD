## MODIFIED Requirements

### Requirement: Registro desde la entrada de Juegos
La entrada de `juegos.html` SHALL mostrar el botón «🆕 Registrarme en Juegos». El registro SHALL pedir el nick, la
aceptación del aviso y el correo. La cuenta de Juegos SHALL quedar creada con ese nick al instante, sin enlace ni
código. `juegos.html?registro=1` SHALL abrir el registro directo.

#### Scenario: Registro completo desde Juegos
- **WHEN** alguien sin cuenta toca «Registrarme en Juegos», pone su nick, acepta el aviso y escribe su correo
- **THEN** entra a Juegos con su nick

#### Scenario: Invitar desde el hub
- **WHEN** alguien con sesión toca «🆕 Invitar a alguien a registrarse» en Juegos
- **THEN** comparte o copia el enlace `juegos.html?registro=1`

#### Scenario: Desde el portal
- **WHEN** alguien toca «Crea tu cuenta de Juegos» en el portal
- **THEN** llega directo al registro de Juegos
