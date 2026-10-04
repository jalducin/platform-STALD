## ADDED Requirements

### Requirement: Brisca con baraja española
El sistema SHALL ofrecer Brisca:
- en individual contra bots: 1 o 2 rivales, o en pareja;
- en partida, con hasta 4 jugadores. Con 4 jugadores se juega en parejas.

#### Scenario: Ganar una baza con triunfo
- **WHEN** el triunfo es copas y en la baza salen el as de oros y el 2 de copas
- **THEN** gana el 2 de copas, porque es triunfo, y se lleva 11 puntos

#### Scenario: Sin triunfo gana el palo que salió
- **WHEN** salen el 5 de espadas, el rey de bastos y el 7 de espadas, sin triunfos
- **THEN** gana el 7 de espadas: es la carta más alta del palo que salió. El rey de bastos no sigue el palo, así que
  no gana

#### Scenario: Brisca en partida siempre con 4
- **WHEN** en la sala de Brisca hay 2 personas
- **THEN** se completa con 2 bots y se juega en parejas
- **AND** si hay 4 personas, no entran bots y una quinta recibe "sala llena"

#### Scenario: Fin de la partida
- **WHEN** ya se jugaron todas las cartas
- **THEN** se suman los puntos de cada quien o de cada pareja (120 en total) y gana quien junta más de 60

### Requirement: Conquián con baraja española
El sistema SHALL ofrecer Conquián para 2 jugadores, en individual contra un bot y en partida.

#### Scenario: Tomar una carta para bajar un juego
- **WHEN** a Sofy le ofrecen el 5 de oros y tiene en la mano el 3 y el 4 de oros
- **THEN** puede tomarla, bajar la escalera 3-4-5 de oros y después descartar una carta

#### Scenario: Juego inválido
- **WHEN** alguien intenta bajar 2 cartas, o una escalera de palos distintos
- **THEN** la jugada no se aplica y la página explica por qué

#### Scenario: Ganar
- **WHEN** un jugador junta 9 cartas bajadas
- **THEN** gana la partida

#### Scenario: Se acaba el mazo
- **WHEN** hay que voltear una carta y el mazo ya no tiene cartas
- **THEN** la partida termina en empate

### Requirement: Instrucciones de Brisca y Conquián
Cada juego SHALL tener "📖 Cómo se juega" con sus reglas, el valor de las cartas o los juegos válidos, y ejemplos.

#### Scenario: Consultar las reglas
- **WHEN** alguien abre la ayuda de Conquián
- **THEN** ve qué es un juego válido, cómo tomar o pasar una carta y cómo se gana
