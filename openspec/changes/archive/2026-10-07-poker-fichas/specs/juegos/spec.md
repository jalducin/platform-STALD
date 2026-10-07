## MODIFIED Requirements

### Requirement: Póker Texas Hold'em con fichas sin valor
El sistema SHALL ofrecer Póker Texas Hold'em sin límite, con fichas que no tienen valor real:
- en individual, contra bots, solo o en pareja;
- en partida con otras personas, solo o por equipos.

Cada jugador SHALL empezar con 500 fichas. Las ciegas SHALL ser 5/10 y subir cada 4 manos a 10/20, 20/40 y 40/80.
Todas las cantidades (pilas, apuestas y premios) SHALL ser múltiplos de 5. Para subir, la página SHALL ofrecer fichas
de 5, 10, 20, 50 y 100 que se suman al aumento.

#### Scenario: Partida individual
- **WHEN** un jugador elige 3 rivales y juega 10 manos
- **THEN** empieza con 500 fichas y ciegas de 5/10
- **AND** al final ve sus fichas y sus puntos (fichas × 2 ÷ jugadores, máximo 1000), que se suman a sus puntos
  individuales

#### Scenario: Ciegas que suben
- **WHEN** empieza la quinta mano
- **THEN** las ciegas son 10/20, y desde la novena, 20/40

#### Scenario: Bote lateral
- **WHEN** un jugador va con todo con menos fichas que los demás y ellos siguen apostando
- **THEN** solo puede ganar el bote principal, y el bote lateral se lo disputan los demás

#### Scenario: Pozo empatado en múltiplos de 5
- **WHEN** dos jugadores empatan un pozo de 25
- **THEN** uno recibe 15 y el otro 10 (lo que sobra va de 5 en 5 a partir del primero después del botón)

#### Scenario: Jugada inválida
- **WHEN** alguien intenta pasar habiendo una apuesta que igualar, subir menos del mínimo o subir un monto que no es
  múltiplo de 5 sin ir con todo
- **THEN** la jugada no se aplica

#### Scenario: Subir con fichas
- **WHEN** en su turno alguien toca «⬆️ Subir»
- **THEN** ve fichas de colores de 5, 10, 20, 50 y 100 (botones «Ficha de N»), el aumento acumulado y cómo queda su
  apuesta, «↺ Limpiar» y «✅ Apostar»
- **AND** cada ficha que toca se suma al aumento con una pequeña animación
- **AND** las fichas que pasarían del máximo que puede subir quedan deshabilitadas
- **AND** «✅ Apostar» queda deshabilitado hasta llegar a la subida mínima, y al apostar la apuesta queda en la más
  alta de la mesa más el aumento

#### Scenario: Pozo con fichas
- **WHEN** hay fichas en el pozo o en la apuesta de un asiento
- **THEN** se ven como pilas de fichas de esos colores, junto al número

#### Scenario: Subida en sala
- **WHEN** en una partida alguien envía `subir` con un monto que no es entero múltiplo de 5, o sin monto
- **THEN** el servidor responde `jugada_invalida` y la jugada no se guarda

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
- **AND** lee que empieza con 500 fichas, que las ciegas empiezan en 5/10 y cómo se sube con las fichas
- **AND** cierra la ventana con Esc o con el botón
