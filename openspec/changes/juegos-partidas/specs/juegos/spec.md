## ADDED Requirements

### Requirement: Crear y unirse a partidas
Un jugador registrado SHALL poder crear una partida de un juego permitido y obtener un código de 4
letras. Otros jugadores SHALL poder unirse con ese código antes de que empiece, hasta 30. Solo quien la
creó SHALL poder empezarla.

#### Scenario: Crear y unirse
- **WHEN** Marisol crea una partida de Maratón de cultura con bots
- **THEN** recibe un código
- **AND** Angel se une con ese código y ambos se ven en la sala de espera, junto con los 2 bots

#### Scenario: Solo el host empieza
- **WHEN** Angel intenta empezar la partida de Marisol
- **THEN** responde 403

#### Scenario: Unirse tarde o a una sala que no existe
- **WHEN** alguien intenta unirse después de empezar
- **THEN** responde 409
- **WHEN** el código no existe
- **THEN** responde 404

### Requirement: Partida de preguntas sincronizada
Todos los jugadores de una partida de preguntas SHALL ver las mismas 10 preguntas, en el mismo orden y
al mismo tiempo, según la hora de inicio del servidor.
- Cada pregunta tiene 15 s para responder y 4 s de revelación, con la respuesta correcta y el marcador de
  la sala.
- Cada respuesta vale 100 si es correcta, más hasta 100 por rapidez.
- Solo cuenta la primera respuesta de cada pregunta.

#### Scenario: Mismas preguntas
- **WHEN** dos jugadores están en la misma partida
- **THEN** ven la misma pregunta con las mismas opciones al mismo tiempo

#### Scenario: Marcador y podio
- **WHEN** termina la partida
- **THEN** se ve el podio con humanos y bots, ordenado por puntos
- **AND** los puntos de cada persona se guardan en su ranking semanal de ese juego

### Requirement: Basta en partida
En una partida de Basta, todos SHALL tener la misma letra. Quien grita "¡Basta!" con todas sus categorías
llenas SHALL cerrar la ronda para todos, con 3 s de gracia. La puntuación SHALL premiar las palabras
únicas sobre las repetidas, según el design.

#### Scenario: Palabra repetida
- **WHEN** dos jugadores escriben la misma palabra verificada en una categoría
- **THEN** cada uno recibe 50 en esa categoría, en lugar de 100

### Requirement: Bots aleatorios
Una partida con bots SHALL incluir a "Bot Ajolote 🦎" y "Bot Colibrí 🐦". Contestan al azar, con 60 % y
45 % de acierto y tiempos variables, y SHALL verse igual en todos los dispositivos, porque se calculan con
la semilla de la partida. En Basta llenan palabras del diccionario al azar.

#### Scenario: Bots consistentes
- **WHEN** dos jugadores ven el marcador de la misma partida
- **THEN** los bots tienen los mismos puntos en ambos
