## ADDED Requirements

### Requirement: Control de Karts en las salas
La sala de espera de una partida de Karts SHALL mostrar a quien tiene asiento una tarjeta «🎮 Tu control» junto a
«🏁 Tu piloto» con las opciones del modo individual (Botones, Joystick, Sensor y Mando clásico; Acelerar: Automático o
Con botón), preseleccionadas con lo guardado en el navegador. La elección SHALL guardarse en el navegador (la misma que
usa el modo individual) y SHALL aplicarse en la carrera de la sala, suelta o de copa, en vivo o con fantasmas. Al
elegir el sensor en un aparato que pide permiso (iPhone), el permiso SHALL pedirse dentro de ese toque.

Durante una carrera en sala SHALL haber un botón ⚙️ que abre un panel con las mismas opciones sin pausar la sala; el
cambio SHALL aplicarse al momento y recordarse. Quien especta SHALL NOT ver el botón.

#### Scenario: Elegir joystick en la sala de espera
- **WHEN** en la sala de espera de Karts toca «🕹️ Joystick» y empieza la carrera
- **THEN** maneja con el joystick y la elección queda guardada para el modo individual

#### Scenario: Cambiar de control a media carrera
- **WHEN** en una carrera de sala toca ⚙️ y elige «⬅➡ Botones»
- **THEN** la carrera sigue sin pausa y ahora maneja con los botones

#### Scenario: Sensor en iPhone
- **WHEN** elige «📱 Sensor» en la sala de espera en un iPhone
- **THEN** se le pide el permiso del giroscopio en ese toque; si al arrancar no quedó activo, el panel ⚙️ ofrece
  «📱 Activar sensor»

### Requirement: Ceremonia de premiación en Karts
Al terminar una copa individual, una copa en sala o una carrera suelta en sala, Karts SHALL mostrar una ceremonia
animada de unos 7 s con un podio de 3 escalones, foco y confeti, el nombre de la copa o pista y los puntos, donde los
personajes dibujados de 3.º, 2.º y 1.º (con su kart y su nombre) suben en ese orden con 🥉🥈🥇. SHALL usar
`window.Emocion` (redoble antes del 1.º y victoria) respetando el silencio, SHALL tener «⏭ Saltar» y, con
`prefers-reduced-motion`, SHALL verse fija sin animación. Después SHALL quedar la tabla de resultados de siempre.

Los lugares SHALL salir del podio que da el servidor (la ceremonia no los calcula ni los reordena). En una sala, la
ceremonia SHALL empezar a la misma hora en todos los aparatos con el reloj común, incluidos los de quien especta.

#### Scenario: Podio de una carrera en sala
- **WHEN** termina una carrera suelta en sala
- **THEN** todos ven la ceremonia a la misma hora: sube el 3.º, luego el 2.º y al final el 1.º, y después la tabla
  de tiempos y «Otra con los mismos»

#### Scenario: Saltar
- **WHEN** toca «⏭ Saltar»
- **THEN** la ceremonia se quita y queda la tabla de resultados

#### Scenario: Movimiento reducido
- **WHEN** el aparato pide menos movimiento
- **THEN** la ceremonia se ve fija con los 3 lugares, sin animación ni confeti

#### Scenario: Quien especta
- **WHEN** alguien ve la sala como espectador y termina la carrera
- **THEN** ve la misma ceremonia a la misma hora
