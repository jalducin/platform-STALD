## ADDED Requirements

### Requirement: Damas
El sistema SHALL ofrecer Damas (`damas`, categoría Mente ágil, tope 1,000) en un tablero de 8×8 con las reglas
inglesas:
- el peón avanza y captura en diagonal hacia adelante;
- la captura es obligatoria y los saltos múltiples siguen mientras se pueda;
- el peón que llega a la última fila se corona dama, y la dama mueve y captura 1 casilla en cualquier diagonal;
- pierde quien no tiene jugadas;
- hay empate tras 40 medios movimientos sin captura ni avance de peón.

SHALL jugarse en individual contra un bot de 2 niveles y en sala con una mesa de 2: 1 vs 1 entre personas o, si la
sala lleva bots y solo hay una persona, contra un bot.

#### Scenario: Captura obligatoria
- **WHEN** en su turno una alumna puede capturar una pieza
- **THEN** solo se marcan como posibles las jugadas que capturan

#### Scenario: Salto múltiple
- **WHEN** después de saltar una pieza el peón puede saltar otra
- **THEN** la jugada sigue con el segundo salto y se quitan las dos piezas

#### Scenario: Coronación
- **WHEN** un peón blanco llega a la fila de arriba
- **THEN** se convierte en dama, con corona, y termina su turno

#### Scenario: Contra el bot
- **WHEN** un alumno elige el nivel 🦊 Difícil y gana
- **THEN** suma 800 más 20 por cada pieza que le quedó (máximo 1,000) en sus puntos individuales

#### Scenario: Sala 1 vs 1
- **WHEN** dos personas juegan Damas en una sala
- **THEN** ambas ven el mismo tablero, juegan por turnos de 60 s y la tercera recibe «sala llena»
- **AND** si se vence el turno, el bot mueve por quien no jugó
- **AND** si alguien se rinde, gana su rival y las dos llegan al podio con «🔁 Otra con los mismos»

#### Scenario: Jugada con forma inválida
- **WHEN** en una sala de Damas alguien envía una ruta con casillas fuera de 0–31 o con una sola casilla
- **THEN** el servidor responde 400 `jugada_invalida` y no la guarda

### Requirement: Dominó
El sistema SHALL ofrecer Dominó doble seis (`domino`, categoría Clásicos, tope 1,000) para 2 a 4 jugadores:
- cada quien recibe 7 fichas;
- sale quien tiene la mula más alta y se juega por turnos, embonando fichas en los extremos;
- quien no tiene ficha que embone pasa;
- gana quien se queda sin fichas;
- si todos pasan seguido (juego cerrado), gana quien tiene menos puntos en la mano.

SHALL jugarse en individual contra 3 bots y en sala con personas y bots (hasta 4).

#### Scenario: Embonar en un extremo
- **WHEN** la mesa tiene 6 a la izquierda y 3 a la derecha, y Sofy tira el 3-5
- **THEN** la ficha queda a la derecha y el extremo derecho pasa a ser 5

#### Scenario: Pasar sin ficha
- **WHEN** a un jugador le toca y ninguna de sus fichas embona
- **THEN** pasa su turno y todos ven «pasó»

#### Scenario: Juego cerrado
- **WHEN** nadie puede tirar
- **THEN** la partida termina y gana quien suma menos puntos; si dos empatan, ganan los dos

#### Scenario: Sala con bots
- **WHEN** en una sala de Dominó con bots hay 3 personas
- **THEN** la mesa es de 3 personas + 1 bot
- **AND** al entrar la cuarta persona ya no hay bot, y todas ven la misma mesa

#### Scenario: Sin bots ni rival
- **WHEN** alguien crea una sala de Dominó sin bots y quiere empezar sin nadie más
- **THEN** el servidor responde 409 `faltan_jugadores`

#### Scenario: Jugada con forma inválida
- **WHEN** en una sala de Dominó alguien envía una ficha fuera de 0–27 o un lado que no es «i» ni «d»
- **THEN** el servidor responde 400 `jugada_invalida`

### Requirement: Parchís
El sistema SHALL ofrecer Parchís (`parchis`, categoría Clásicos, tope 1,000), estilo Ludo, de 2 a 4 jugadores con un
dado:
- la ficha sale de casa con 5;
- con 6, o al comer, se vuelve a tirar;
- hay 8 casillas seguras (las 4 salidas y 4 estrellas) donde no se come;
- al caer en una casilla no segura con fichas de otro color, esas fichas vuelven a casa;
- a la meta se entra por el pasillo de cada color con el tiro exacto;
- gana quien mete primero todas sus fichas.

SHALL jugarse en individual contra bots (partida rápida con 2 fichas o completa con 4) y en sala (4 fichas).

#### Scenario: Salir con 5
- **WHEN** todas las fichas de un jugador están en casa y saca 3
- **THEN** no puede mover y el turno pasa al siguiente
- **AND** si saca 5, puede sacar una ficha a su salida

#### Scenario: Comer una ficha
- **WHEN** una ficha roja cae en una casilla no segura donde hay una ficha azul
- **THEN** la ficha azul vuelve a su casa y el jugador rojo vuelve a tirar

#### Scenario: Casilla segura
- **WHEN** una ficha cae en una estrella o en una salida donde hay una ficha rival
- **THEN** no la come y las dos comparten la casilla

#### Scenario: Tiro exacto
- **WHEN** a una ficha le faltan 2 casillas para la meta y el dado da 4
- **THEN** esa ficha no puede moverse

#### Scenario: Mismo dado para todos en sala
- **WHEN** tres personas y un bot juegan Parchís en una sala
- **THEN** todos ven el mismo dado y las mismas posiciones, porque el dado sale de la semilla de la sala

### Requirement: Batalla naval
El sistema SHALL ofrecer Batalla naval (`naval`, categoría Mente ágil, tope 1,000):
- cada quien tiene un tablero oculto de 10×10 con 5 barcos de 5, 4, 3, 3 y 2 casillas, acomodados en automático o
  a mano;
- se dispara por coordenadas A1…J10 y cada disparo muestra «agua», «tocado» o «hundido»;
- quien toca vuelve a disparar;
- gana quien hunde toda la flota rival.

SHALL jugarse en individual contra un bot y en sala 1 vs 1, sin bots.

#### Scenario: Acomodo manual
- **WHEN** un alumno elige el barco de 4, toca «↻ Girar» y una casilla
- **THEN** el barco queda vertical desde esa casilla, si cabe y no se encima con otro

#### Scenario: Acomodo automático
- **WHEN** una alumna toca «🎲 Acomodo automático»
- **THEN** quedan los 5 barcos dentro del tablero, sin encimarse

#### Scenario: El bot caza después de tocar
- **WHEN** el bot toca un barco
- **THEN** sus siguientes disparos van a las casillas vecinas y siguen la línea hasta hundirlo

#### Scenario: Ganar contra el bot
- **WHEN** un alumno hunde los 5 barcos en 40 disparos
- **THEN** gana 600 + 400 × 17 ÷ 40 = 770 puntos individuales

### Requirement: Batalla naval sin revelar la flota rival
En las salas de Batalla naval, el servidor SHALL:
- guardar la flota de cada jugador;
- validar cada disparo (turno, casilla nueva, flotas listas y partida en juego);
- resolverlo con la flota del rival;
- guardar en la jugada solo el resultado (y, al hundir, las casillas de ese barco).

El servidor SHALL NOT entregar la flota de un jugador a otra persona mientras la partida siga en juego: ni en
`GET /juegos/sala/<código>`, ni en el broadcast de Realtime, ni al admin. Al terminar, SHALL revelar ambas flotas.

#### Scenario: El rival no ve mi flota
- **WHEN** Marisol y Angel ya acomodaron sus flotas y Angel consulta la sala
- **THEN** la respuesta trae la flota de Angel y no la de Marisol
- **AND** el aviso de Realtime no trae ninguna flota

#### Scenario: Disparo resuelto en el servidor
- **WHEN** Marisol dispara a B3 y ahí hay un barco de Angel
- **THEN** el servidor guarda `r: "tocado"` y Marisol vuelve a disparar
- **AND** si con ese disparo se hunde el barco, guarda `r: "hundido"` y las casillas del barco

#### Scenario: Disparo inválido
- **WHEN** alguien dispara fuera de su turno, a una casilla repetida, antes de que las dos flotas estén listas o
  después de terminar
- **THEN** el servidor responde 409 `no_es_tu_turno`, 400 `ya_disparaste`, 409 `falta_flota` o 409
  `partida_terminada`, y no guarda nada

#### Scenario: Flota inválida
- **WHEN** alguien envía una flota con barcos encimados, en diagonal, fuera del tablero o con otros tamaños
- **THEN** el servidor responde 400 `flota_invalida`; si ya había enviado su flota, responde 409 `flota_lista`

#### Scenario: Rival que se fue
- **WHEN** a Angel le toca disparar y lleva 90 s sin hacerlo
- **THEN** Marisol puede tocar «⏰ Reclamar victoria» y gana la partida
- **AND** antes de los 90 s el servidor responde 409 `aun_no`

#### Scenario: Fin de la partida
- **WHEN** se hunde el último barco
- **THEN** las dos personas ven el podio y ambas flotas quedan reveladas
- **AND** si se ganó porque el rival se rindió o dejó de jugar, el ganador suma 500 + 20 por casilla tocada

### Requirement: Juegos de tablero en celular
Damas, Dominó, Parchís y Batalla naval SHALL verse completos a 390 px de ancho, sin desplazamiento horizontal: el
tablero cabe en la pantalla. Las acciones principales SHALL tener botones de 44 px o más. Cada juego SHALL tener
«📖 Cómo se juega» en español de México, con lenguaje inclusivo. Su arte SHALL ser propio (CSS o SVG), con
animaciones suaves que se apagan con `prefers-reduced-motion`.

#### Scenario: Tablero a 390 px
- **WHEN** una alumna abre Parchís en un celular de 390 px
- **THEN** ve el tablero completo y los botones para mover cada ficha, sin desplazamiento horizontal

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** las fichas, el dado y los disparos cambian sin animación
