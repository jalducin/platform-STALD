## ADDED Requirements

### Requirement: La copa de Karts en sala siempre corre todas sus carreras para todas las personas
Una copa de Karts en sala SHALL correr todas las carreras de su copa (4 hoy) y en cada carrera SHALL contar a todas
las personas de la sala, aunque hayan perdido, abandonado o no terminado una carrera anterior. El podio final SHALL
mostrarse una sola vez, al cerrar la última carrera, igual para todas las personas. Un reporte repetido de la misma
carrera (otro aparato o reintento) SHALL contar una sola vez y nunca SHALL adelantar el calendario.

#### Scenario: Alguien se pierde una carrera
- **WHEN** Angel abandona la carrera 1 y en las carreras 2, 3 y 4 llega 5 s después de Marisol
- **THEN** cada una de esas carreras sigue abierta al llegar Marisol, el tiempo de Angel se acepta y suma puntos, y el
  podio final aparece hasta cerrar la carrera 4

#### Scenario: Reportes duplicados
- **WHEN** una persona manda dos veces el tiempo de la misma carrera o intenta reportar la siguiente antes de tiempo
- **THEN** cuenta solo el primero, la siguiente se rechaza (`carrera_fuera_de_turno`) y la copa sigue en esa carrera

### Requirement: 30 segundos para terminar tras la primera llegada en las salas de Karts
En una carrera de Karts en sala (de copa o suelta), cuando la primera persona cruza la meta las demás SHALL tener
30 s para terminar, con una cuenta visible «⏱️ N s para terminar». La carrera SHALL cerrar cuando todas reportan, al
vencer esos 30 s o, si nadie llega, al límite de la pista; lo decide el reloj del servidor y un tiempo posterior al
cierre SHALL rechazarse (`carrera_cerrada`). Quien no termina SHALL quedar «NT» con 0 puntos, ordenado por su avance.
En la copa, la tabla entre carreras SHALL durar como máximo 10 s y la siguiente carrera SHALL arrancar sola. La
página SHALL dejar que una persona entre tarde a una carrera abierta en lugar de abandonarla sola.

#### Scenario: Cierra por el plazo
- **WHEN** Marisol llega a la meta y Laura no llega en los 30 s siguientes
- **THEN** la carrera cierra a los 30 s exactos, Laura queda NT con 0 puntos, su tiempo tardío se rechaza y la
  siguiente empieza 10 s después

#### Scenario: Todas llegan antes
- **WHEN** las 3 personas llegan dentro del plazo
- **THEN** la carrera cierra al llegar la última, sin esperar los 30 s

#### Scenario: Carrera suelta
- **WHEN** en una sala de una sola carrera llega la primera persona y pasan 30 s
- **THEN** el servidor da el podio (ya no responde «en curso») y rechaza tiempos posteriores
