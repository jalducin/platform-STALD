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

## MODIFIED Requirements

### Requirement: Bots aleatorios
Una partida con bots SHALL incluir a "BOT-VACHIRA" y "BOT-ISAGII". Contestan al azar, con 60 % y 45 % de acierto
y tiempos variables, y SHALL verse igual en todos los dispositivos, porque se calculan con la semilla de la
partida. En Basta llenan palabras del diccionario al azar. (Antes se llamaban "Bot Ajolote 🦎" y "Bot Colibrí 🐦".)

#### Scenario: Bots consistentes
- **WHEN** dos jugadores ven el marcador de la misma partida
- **THEN** los bots tienen los mismos puntos en ambos

#### Scenario: Sala con bots
- **WHEN** se crea una partida con bots
- **THEN** la sala de espera muestra a BOT-VACHIRA y BOT-ISAGII
