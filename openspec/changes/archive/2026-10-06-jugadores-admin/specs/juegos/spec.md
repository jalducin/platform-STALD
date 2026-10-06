## ADDED Requirements

### Requirement: Jugadores registrados para el admin
Juegos SHALL mostrar al admin una pestaña «👥 Jugadores» con todos los jugadores registrados (alumnos, alumnas e
invitados) y los registros pendientes de cuentas de acceso. Cada pendiente SHALL tener un botón para generar su
enlace de acceso a Juegos. Nadie más SHALL ver esta pestaña ni los correos.

#### Scenario: Registro que no terminó
- **WHEN** alguien creó su cuenta pero no confirmó el correo
- **THEN** aparece en «Registros pendientes» como «sin confirmar» y el profe puede generar su enlace de acceso a Juegos

#### Scenario: Alumna sin permiso
- **WHEN** una alumna pide `/juegos/jugadores`
- **THEN** recibe 403 y no ve la pestaña
