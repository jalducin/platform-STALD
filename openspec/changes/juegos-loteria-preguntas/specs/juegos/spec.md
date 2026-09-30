## ADDED Requirements

### Requirement: Responde en inglés
El juego "Responde en inglés" SHALL mostrar una pregunta en inglés, con su traducción como apoyo, y 4
respuestas en inglés, de las que una sola es la respuesta natural. SHALL poder jugarse en solitario (90 s)
y en partida (10 preguntas).

#### Scenario: Pregunta de edad
- **WHEN** sale "How old are you?"
- **THEN** la respuesta correcta es "I am twelve." y los distractores son respuestas en inglés a otras
  preguntas

### Requirement: Lotería en partida
En una partida de Lotería, todos los jugadores SHALL ver y oír las mismas cartas al mismo tiempo, cada uno
con su propia tabla. El primer "¡Lotería!" válido SHALL ganar y terminar la partida para todos. Los bots
SHALL competir con su propia tabla.

#### Scenario: Mismas cartas
- **WHEN** dos jugadores están en la misma partida de Lotería
- **THEN** ven la misma carta cantada al mismo tiempo, con tablas distintas

#### Scenario: Gana el primero
- **WHEN** un jugador completa una línea y grita "¡Lotería!" antes que los demás
- **THEN** todos ven que ganó y el podio

#### Scenario: Grito una sola vez
- **WHEN** un jugador envía "¡Lotería!" dos veces
- **THEN** el servidor conserva la hora del primero

### Requirement: Nombres de los bots
Los bots de las partidas SHALL llamarse "BOT-VACHIRA" (60 % de acierto) y "BOT-ISAGII" (45 %).

#### Scenario: Sala con bots
- **WHEN** se crea una partida con bots
- **THEN** la sala de espera muestra a BOT-VACHIRA y BOT-ISAGII
