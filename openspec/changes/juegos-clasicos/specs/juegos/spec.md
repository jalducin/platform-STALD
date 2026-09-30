## ADDED Requirements

### Requirement: Basta
El juego Basta SHALL dar una letra al azar y 60 segundos para escribir una palabra por categoría. Hay una
versión en español y otra en inglés. Cada respuesta SHALL calificarse con el diccionario:
- 100 si está verificada;
- 50 si empieza con la letra pero no está en el diccionario;
- 0 si está vacía, empieza con otra letra o está repetida.

"¡Basta!" termina antes y da bono de tiempo si todo está lleno.

#### Scenario: Respuestas verificadas
- **WHEN** la letra es "A" y escribe "Ana" en Nombre y "abeja" en Animal
- **THEN** cada una vale 100 y aparece como verificada

#### Scenario: Palabra desconocida o con otra letra
- **WHEN** escribe "Azulejo" en Color o "perro" en Animal
- **THEN** "Azulejo" vale 50 ("no la conozco") y "perro" vale 0

#### Scenario: Acentos y mayúsculas
- **WHEN** escribe "AGUILA" en Animal y el diccionario tiene "águila"
- **THEN** cuenta como verificada

### Requirement: ¡Una!
El juego ¡Una! SHALL enfrentar al jugador con 1 a 3 bots según las reglas del design: color, número o
símbolo; Salta, Reversa, +2, Comodín y +4. SHALL exigir "¡Una!" al quedar con una carta, con castigo de 2
cartas si no se dice. SHALL ofrecer modo inglés.

#### Scenario: Jugada inválida
- **WHEN** intenta jugar una carta que no coincide en color ni en número o símbolo
- **THEN** la jugada se rechaza con un aviso

#### Scenario: Olvida decir ¡Una!
- **WHEN** juega su penúltima carta y no presiona "¡Una!" a tiempo
- **THEN** roba 2 cartas

#### Scenario: Gana la partida
- **WHEN** se queda sin cartas
- **THEN** gana, y su puntaje suma las cartas que les quedaron a los bots

### Requirement: Lotería
La Lotería SHALL cantar las 54 cartas en orden aleatorio, con nombre, verso y voz en español, inglés o
ambos. El jugador SHALL marcar solo las cartas que ya salieron y ganar al gritar "¡Lotería!" con su tabla
completa según el modo (Línea o Tabla llena), antes que los bots.

#### Scenario: Marcar carta que no ha salido
- **WHEN** toca una casilla cuya carta no ha salido
- **THEN** no se marca

#### Scenario: Lotería válida
- **WHEN** completa una línea en modo Línea y grita "¡Lotería!"
- **THEN** gana y se guardan sus puntos

#### Scenario: Grito falso
- **WHEN** grita "¡Lotería!" sin cumplir el modo
- **THEN** ve el aviso "Aún no tienes lotería" y el juego sigue

#### Scenario: Un bot gana
- **WHEN** un bot completa antes que el jugador
- **THEN** el juego termina con el aviso de quién ganó, y el jugador recibe puntos por sus marcas

### Requirement: Topes de los clásicos
El servidor SHALL aceptar `basta-es`, `basta-en`, `una` y `loteria` en `/juegos/partida`, con sus topes:
1500, 1500, 1000 y 1000.

#### Scenario: Partida de Lotería
- **WHEN** se envía una partida de `loteria` con 5000 puntos
- **THEN** se guardan 1000
