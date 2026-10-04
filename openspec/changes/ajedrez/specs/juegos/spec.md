## ADDED Requirements

### Requirement: Ajedrez contra el bot y 1 vs 1
El sistema SHALL ofrecer ajedrez con reglas completas en dos modos:
- en individual, contra un bot de 3 niveles;
- en partida 1 vs 1, con reloj por jugador.

#### Scenario: Solo jugadas legales
- **WHEN** alguien intenta mover una pieza y la jugada deja a su rey en jaque
- **THEN** la jugada no se marca como posible y no se aplica

#### Scenario: Jugadas especiales
- **WHEN** se cumplen las condiciones de enroque, captura al paso o coronación
- **THEN** la jugada está disponible
- **AND** en la coronación el jugador elige la pieza

#### Scenario: Fin de la partida
- **WHEN** hay jaque mate, ahogado, triple repetición, 50 jugadas sin captura ni movimiento de peón o material
  insuficiente
- **THEN** la partida termina con su resultado: gana quien dio mate o hay tablas

#### Scenario: Contra el bot
- **WHEN** un jugador elige el nivel 🦊 Medio y juega con blancas
- **THEN** el bot responde con jugadas legales
- **AND** si el jugador gana, suma 700 puntos

#### Scenario: Partida 1 vs 1 con reloj
- **WHEN** dos personas juegan en una sala con reloj de 10 min
- **THEN** ambas ven el mismo tablero y juegan por turnos
- **AND** si a una se le acaba el tiempo, pierde

#### Scenario: Cómo se juega
- **WHEN** alguien abre "📖 Cómo se juega"
- **THEN** ve cómo mueve cada pieza, las jugadas especiales y cómo se gana
