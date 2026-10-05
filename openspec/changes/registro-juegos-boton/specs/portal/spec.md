## ADDED Requirements

### Requirement: Registro desde la entrada de Juegos
La entrada de `juegos.html` SHALL mostrar el botón «🆕 Registrarme en Juegos». El registro SHALL pedir primero el
apodo y la aceptación del aviso, y después el correo con su enlace o código. Al confirmar el correo, la cuenta de
Juegos SHALL quedar creada con ese apodo, sin volver a pedirlo. `juegos.html?registro=1` SHALL abrir el registro
directo.

#### Scenario: Registro completo desde Juegos
- **WHEN** alguien sin cuenta toca «Registrarme en Juegos», pone su apodo, acepta y confirma su correo
- **THEN** entra a Juegos con su apodo

#### Scenario: Desde el portal
- **WHEN** alguien toca «Crea tu cuenta de Juegos» en el portal
- **THEN** llega directo al registro de Juegos
