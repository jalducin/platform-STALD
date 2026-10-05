## ADDED Requirements

### Requirement: Registrar desde el hub de Juegos
El hub de Juegos SHALL mostrar el botón «🆕 Registrar». Tras confirmar, SHALL cerrar la sesión en ese aparato y
abrir el registro de Juegos, para que otra persona cree su cuenta ahí mismo.

#### Scenario: Otra persona se registra en el mismo aparato
- **WHEN** alguien con sesión toca «🆕 Registrar» y confirma
- **THEN** su sesión se cierra, aparece el registro de Juegos y la persona nueva entra con su apodo al terminar
