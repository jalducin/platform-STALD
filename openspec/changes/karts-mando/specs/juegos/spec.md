## ADDED Requirements

### Requirement: Mando clásico en Karts
«Karts Turbo» SHALL poder jugarse con el mando común de Arcade (`juegos/mando.js`), conectado a su capa de acciones
con `KartsEntrada.registrar`, sin cambiar la física ni las reglas, con este mapeo:
- cruceta ◀ ▶ (y la palanca de un control físico, de forma proporcional): girar;
- A: acelerar; con «Acelerar: Automático» A no hace falta para avanzar;
- B: frenar;
- R o L: derrape (mantener con una dirección carga el mini-turbo);
- X o Y: usar el ítem 🎁;
- START: pausa y seguir.

El selector de controles del menú SHALL ofrecer «🎮 Mando clásico» junto a «⬅➡ Botones», «🕹️ Joystick» y
«📱 Sensor», y SHALL recordar la elección en `localStorage.karts_control` como las demás; por omisión SHALL seguir
«Botones». El teclado de Karts (flechas/WASD, ESPACIO derrape, E/Shift ítem, P/Esc pausa) SHALL seguir igual con
cualquier elección, y el mando SHALL NOT interceptar teclas. Un control físico (Gamepad API) SHALL funcionar en la
carrera con cualquier control elegido. En celular vertical el mando SHALL ir debajo de la pista; en horizontal,
encimado en las esquinas sin tapar el minimapa ni el HUD y solo durante la carrera y la pausa. SHALL caber completo
desde 320 px, suelto y dentro de Juegos.

#### Scenario: Elegir el mando y recordarlo
- **WHEN** alguien elige «🎮 Mando clásico» en el celular y recarga Juegos
- **THEN** el selector muestra «🎮 Mando clásico» elegido y en la carrera ve el mando en lugar de los botones ⬅ ➡

#### Scenario: Girar con la cruceta
- **WHEN** en la carrera mantiene ◀ de la cruceta con el dedo
- **THEN** su carro gira a la izquierda y al soltar deja de girar

#### Scenario: Acelerar con A
- **WHEN** con «Acelerar: Con botón» mantiene A
- **THEN** su carro avanza, y sin A no avanza

#### Scenario: Derrape con R
- **WHEN** mantiene R y una dirección de la cruceta por más de 2 s y suelta
- **THEN** sale con el mini-turbo morado

#### Scenario: Ítem con X
- **WHEN** tiene un ítem y toca X
- **THEN** usa el ítem

#### Scenario: Pausa con START
- **WHEN** a mitad de la carrera toca START
- **THEN** la carrera se detiene con «⏸ Pausa» y, con START otra vez, sigue

#### Scenario: Control físico
- **WHEN** alguien conecta un control y en la carrera inclina la palanca a la izquierda, presiona el botón de abajo
  con «Con botón» y presiona Start
- **THEN** su carro gira a la izquierda en proporción a la palanca, acelera y la carrera se pausa

#### Scenario: Teclado sin cambios
- **WHEN** con «🎮 Mando clásico» elegido alguien juega con el teclado
- **THEN** las flechas giran, ESPACIO derrapa, E usa el ítem y P pausa una sola vez

#### Scenario: Celular en horizontal
- **WHEN** corre con el mando en un celular en horizontal (844×390)
- **THEN** la cruceta queda abajo a la izquierda y los botones abajo a la derecha, dentro de la pantalla y sin
  cruzarse con el minimapa ni con el HUD
