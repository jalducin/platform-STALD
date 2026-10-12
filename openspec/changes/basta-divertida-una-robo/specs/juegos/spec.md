## MODIFIED Requirements

### Requirement: Basta
El juego Basta SHALL dar una letra al azar y 60 segundos para escribir una palabra por categoría. Hay una
versión en español y otra en inglés. Cada respuesta SHALL calificarse con el diccionario:
- 100 si está verificada;
- 50 si empieza con la letra pero no está en el diccionario;
- 0 si está vacía, empieza con otra letra o está repetida.

"¡Basta!" termina antes y da bono de tiempo si todo está lleno.

Antes de la letra, SHALL poder elegirse hasta 2 categorías divertidas de esta lista:
- Pokémon;
- Actor o actriz;
- Flor;
- Personaje de anime;
- Película;
- Superhéroe o villano;
- Antojito mexicano;
- Cosa que hay en el refri;
- Excusa para no ir a la fiesta;
- Something in the kitchen.

Cada categoría elegida SHALL sumarse como una columna normal al final, y su banco de respuestas SHALL servir de
diccionario. Al marcar una tercera, SHALL desmarcarse con el aviso «Máximo 2 categorías divertidas».

#### Scenario: Respuestas verificadas
- **WHEN** la letra es "A" y escribe "Ana" en Nombre y "abeja" en Animal
- **THEN** cada una vale 100 y aparece como verificada

#### Scenario: Palabra desconocida o con otra letra
- **WHEN** escribe "Azulejo" en Color o "perro" en Animal
- **THEN** "Azulejo" vale 50 ("no la conozco") y "perro" vale 0

#### Scenario: Acentos y mayúsculas
- **WHEN** escribe "AGUILA" en Animal y el diccionario tiene "águila"
- **THEN** cuenta como verificada

#### Scenario: Categorías divertidas en individual
- **WHEN** elige "Something in the kitchen" y "Pokémon" en Basta en inglés, sale la "J" y escribe "Juice" y
  "Jigglypuff"
- **THEN** el formulario tiene 8 casillas y ambas valen 100 como verificadas

#### Scenario: Máximo de categorías divertidas
- **WHEN** ya eligió 2 categorías divertidas y marca una tercera
- **THEN** la tercera se desmarca y ve el aviso «Máximo 2 categorías divertidas»

### Requirement: Basta en partida
En una partida de Basta, todos SHALL tener la misma letra. Quien grita "¡Basta!" con todas sus categorías
llenas SHALL cerrar la ronda para todos, con 3 s de gracia. La puntuación SHALL premiar las palabras
únicas sobre las repetidas, según el design.

El anfitrión SHALL poder sumar al crear la partida hasta 2 categorías divertidas de la lista del requisito «Basta».
Se guardan en `opciones.extra` (ids separados por coma), la sala de espera SHALL mostrarlas y la revancha SHALL
heredarlas. Cada una SHALL ser una columna más de cada ronda, con los mismos puntos que las demás. El servidor SHALL
responder 400 `extras_invalidas` si llega un id desconocido o repetido, o más de 2. Los bots SHALL llenar esas
columnas con el banco de respuestas de la categoría; si no hay palabra para la letra, la dejan vacía.

#### Scenario: Palabra repetida
- **WHEN** dos jugadores escriben la misma palabra verificada en una categoría
- **THEN** cada uno recibe 50 en esa categoría, en lugar de 100

#### Scenario: Partida con 2 categorías divertidas
- **WHEN** la anfitriona crea una partida de Basta con Pokémon y Antojito mexicano
- **THEN** cada ronda tiene 9 casillas, con Pokémon y Antojito mexicano al final
- **AND** si dos personas escriben el mismo Pokémon del banco, cada una recibe 50
- **AND** un antojito del banco que nadie más escribió vale 100, y una casilla vacía vale 0

#### Scenario: Revancha con las mismas categorías divertidas
- **WHEN** alguien pide la revancha de una partida de Basta con categorías divertidas
- **THEN** la sala nueva tiene las mismas categorías divertidas y las mismas rondas

#### Scenario: Categoría divertida inválida
- **WHEN** se crea una partida de Basta con una categoría que no está en la lista, una repetida o tres categorías
- **THEN** el servidor responde 400 `extras_invalidas`

### Requirement: ¡Una!
El juego ¡Una! SHALL enfrentar al jugador con 1 a 3 bots según las reglas del design: color, número o
símbolo; Salta, Reversa, +2, Comodín y +4. SHALL exigir "¡Una!" al quedar con una carta, con castigo de 2
cartas si no se dice. SHALL ofrecer modo inglés.

Al robar, la persona o el bot SHALL sacar cartas del mazo hasta encontrar una que sí se pueda tirar, o hasta que el
mazo se acabe. Ese robo no rebaraja el descarte. Si encuentra una jugable, la persona SHALL poder tirarla o pasar, y el
bot la tira. Si el mazo se acaba sin una jugable, el turno SHALL pasar. Las cartas robadas SHALL entrar con una
animación, una tras otra, y el aviso SHALL decir cuántas fueron.

#### Scenario: Jugada inválida
- **WHEN** intenta jugar una carta que no coincide en color ni en número o símbolo
- **THEN** la jugada se rechaza con un aviso

#### Scenario: Olvida decir ¡Una!
- **WHEN** juega su penúltima carta y no presiona "¡Una!" a tiempo
- **THEN** roba 2 cartas

#### Scenario: Gana la partida
- **WHEN** se queda sin cartas
- **THEN** gana, y su puntaje suma las cartas que les quedaron a los bots

#### Scenario: Robar hasta poder tirar
- **WHEN** presiona Robar y las dos primeras cartas del mazo no sirven, pero la tercera sí
- **THEN** recibe las 3 cartas con animación, solo la tercera queda marcada para tirar y ve «Robaste 3 cartas hasta
  encontrar una que sí puedes tirar»

#### Scenario: Se acaba el mazo al robar
- **WHEN** roba y el mazo se acaba sin una carta que sirva
- **THEN** se queda con las cartas robadas, ve «…y se acabó el mazo sin una que sirva» y el turno pasa al siguiente,
  sin rebarajar el descarte

#### Scenario: Bot sin carta jugable
- **WHEN** a un bot no le sirve ninguna carta
- **THEN** roba hasta encontrar una que sirva y la tira, o pasa si se acabó el mazo

### Requirement: ¡Una! en partida
¡Una! SHALL poder jugarse en partida entre varias personas y los bots opcionales, por turnos y con las
reglas del modo solitario. Todos los dispositivos SHALL ver el mismo estado: carta de arriba, color,
turno y número de cartas de cada quien. SHALL aplicar 30 s por turno, con jugada automática al vencer, y
el castigo de "¡Una!".

El robo SHALL ser «robar hasta poder tirar», igual que en solitario. La jugada `robar` no lleva carta. Las cartas
robadas SHALL salir del mazo de la semilla al reproducir las jugadas, así que todos los dispositivos ven las mismas.
El servidor SHALL responder 400 `jugada_invalida` si `robar` o `pasar` traen carta o color.

#### Scenario: Mismo estado en todos
- **WHEN** dos personas y dos bots juegan una partida
- **THEN** en ambos dispositivos se ven la misma carta de arriba, el mismo turno y los mismos números de
  cartas

#### Scenario: Turno ocupado
- **WHEN** alguien envía una jugada para un paso que ya jugó otro jugador
- **THEN** el servidor responde 409 `turno_tomado`

#### Scenario: Tarda en presionar UNA
- **WHEN** alguien tira su penúltima carta y presiona UNA a los 3.5 s
- **THEN** roba 2 cartas, igual en todos los dispositivos
- **WHEN** la presiona antes de 2 s
- **THEN** no roba
- **WHEN** no la presiona en 5 s
- **THEN** roba 4

#### Scenario: Nadie juega
- **WHEN** a una persona se le acaban los 30 s de su turno
- **THEN** roba hasta sacar una carta que sirva (o hasta que se acabe el mazo) y pasa el turno automáticamente

#### Scenario: Robo determinista
- **WHEN** una persona presiona Robar en una partida con dos dispositivos
- **THEN** ambos dispositivos ven las mismas cartas robadas en ese paso, y la persona ve «Robaste N cartas hasta
  encontrar una que sí puedes tirar»

#### Scenario: Mazo vacío en partida
- **WHEN** el mazo llega a 0
- **THEN** el botón Robar queda deshabilitado, quien no tiene carta jugable puede pasar y la partida sigue

#### Scenario: Robar con carta
- **WHEN** llega la jugada `{ accion: "robar", carta: 3 }` o `{ accion: "pasar", color: "r" }`
- **THEN** el servidor responde 400 `jugada_invalida`

#### Scenario: Avatar desde el portal
- **WHEN** una alumna entra al portal
- **THEN** ve su avatar en el saludo
- **AND** al tocar "🎨 Cambiar avatar" se abre directo el selector de Juegos

#### Scenario: Fin
- **WHEN** alguien se queda sin cartas
- **THEN** todos ven al mismo ganador y el mismo podio, y los puntos se guardan en el ranking
