## ADDED Requirements

### Requirement: Póker Texas Hold'em con fichas sin valor
El sistema SHALL ofrecer Póker Texas Hold'em sin límite, con fichas que no tienen valor real:
- en individual, contra bots, solo o en pareja;
- en partida con otras personas, solo o por equipos.

#### Scenario: Partida individual
- **WHEN** un jugador elige 3 rivales y juega 10 manos
- **THEN** ve sus fichas y sus puntos (fichas ÷ 4, máximo 1000), que se suman a sus puntos individuales

#### Scenario: Bote lateral
- **WHEN** un jugador va con todo con menos fichas que los demás y ellos siguen apostando
- **THEN** solo puede ganar el bote principal, y el bote lateral se lo disputan los demás

#### Scenario: Jugada inválida
- **WHEN** alguien intenta pasar habiendo una apuesta que igualar, o subir menos del mínimo
- **THEN** la jugada no se aplica

#### Scenario: Partida con amigos
- **WHEN** dos personas juegan en la misma sala
- **THEN** ambas ven la misma mesa y juegan por turnos de 30 s
- **AND** si alguien no juega en su turno, pasa o se retira solo

#### Scenario: Por equipos
- **WHEN** la sala se crea por equipos
- **THEN** los jugadores se reparten en A y B
- **AND** el podio muestra el total de fichas de cada equipo, y el equipo ganador suma 150 puntos

#### Scenario: Cómo se juega
- **WHEN** alguien que no conoce el juego abre "📖 Cómo se juega"
- **THEN** ve las reglas, la tabla de manos de mayor a menor y un glosario
- **AND** cierra la ventana con Esc o con el botón
