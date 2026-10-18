## RENAMED Requirements

- FROM: `### Requirement: 30 segundos para terminar tras la primera llegada en las salas de Karts`
- TO: `### Requirement: 45 segundos para terminar tras la primera llegada en las salas de Karts`

## MODIFIED Requirements

### Requirement: 45 segundos para terminar tras la primera llegada en las salas de Karts
En una carrera de Karts en sala (de copa o suelta), cuando la primera persona cruza la meta las demás SHALL tener
45 s para terminar, con una cuenta visible «⏱️ N s para terminar». La carrera SHALL cerrar cuando todas reportan, al
vencer esos 45 s o, si nadie llega, al límite de la pista; lo decide el reloj del servidor y un tiempo posterior al
cierre SHALL rechazarse (`carrera_cerrada`). Quien no termina SHALL quedar «NT» con 0 puntos, ordenado por su avance.
En la copa, la tabla entre carreras SHALL durar como máximo 10 s y la siguiente carrera SHALL arrancar sola. La
página SHALL dejar que una persona entre tarde a una carrera abierta en lugar de abandonarla sola. El plazo SHALL
vencer siempre antes que el límite de la pista con 3 vueltas, y el servidor SHALL aceptar el tiempo de quien llega
dentro de los 45 s.

#### Scenario: Cierra por el plazo
- **WHEN** Marisol llega a la meta y Laura no llega en los 45 s siguientes
- **THEN** la carrera cierra a los 45 s exactos, Laura queda NT con 0 puntos, su tiempo tardío se rechaza y la
  siguiente empieza 10 s después

#### Scenario: Segundo lugar 44 s después
- **WHEN** Marisol gana una carrera de 3 vueltas y Angel cruza la meta 44 s después
- **THEN** el servidor acepta el tiempo de Angel y le da los puntos de su lugar

#### Scenario: Todas llegan antes
- **WHEN** las 3 personas llegan dentro del plazo
- **THEN** la carrera cierra al llegar la última, sin esperar los 45 s

#### Scenario: Carrera suelta
- **WHEN** en una sala de una sola carrera llega la primera persona y pasan 45 s
- **THEN** el servidor da el podio (ya no responde «en curso») y rechaza tiempos posteriores
