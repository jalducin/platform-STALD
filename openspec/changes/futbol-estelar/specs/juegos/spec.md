## ADDED Requirements

### Requirement: Fútbol Estelar 2010 en Arcade
🕹️ Arcade SHALL ofrecer «⚽ Fútbol Estelar 2010» (`juegos/futbol.html`, id `futbol`), un juego de futbol de un
universo ficticio (sin equipos, jugadores, escudos, estadios ni marcas reales) que se carga en el iframe de Arcade con
su avance en el servidor y sus puntos en el ranking. El partido SHALL verse con una cámara lateral de transmisión en
perspectiva que sigue al balón, con jugadores con los colores de su equipo, número y sombra, y un balón con altura cuya
sombra se separa al elevarse. SHALL sentirse pausado y con peso: sprint y cansancio, inercia del balón, primer toque,
orientación del cuerpo que cambia la precisión, barra de potencia para tiros y pases largos; pase raso, al hueco y
elevado o centro; tiros de lejos y de cerca; portero con reacciones; faltas con tiro libre y penal; saque inicial, de
banda, de meta y tiro de esquina; fuera de lugar que se puede apagar; medio tiempo y reloj de 0' a 90' en partidos de
2 a 6 minutos reales.

#### Scenario: La tarjeta reemplaza a Futbolito
- **WHEN** un alumno abre la categoría 🕹️ Arcade
- **THEN** ve «⚽ Fútbol Estelar 2010» y ya no ve «Futbolito»

#### Scenario: Partido rápido que termina
- **WHEN** juega un partido rápido de 2 minutos contra la IA en Fácil
- **THEN** el reloj llega a 90', ve el resultado final y suma ⭐ individuales según el resultado

#### Scenario: Gol
- **WHEN** su delantero tira y el balón cruza la línea entre los postes y bajo el travesaño
- **THEN** el marcador sube, aparece «¡GOOOL!» y el partido se reanuda con saque inicial del rival

#### Scenario: Fuera de lugar apagado
- **WHEN** apaga «Fuera de lugar» y da un pase a un compañero adelantado
- **THEN** la jugada sigue sin silbatazo

### Requirement: Controles de Fútbol Estelar como los de Karts
En un aparato táctil, el control por omisión SHALL ser un joystick flotante a la izquierda y botones grandes a la
derecha: A pase, B tiro (mantener = potencia), X pase al hueco, Y pase elevado o centro, R sprint y L cambiar de
jugador; sin el balón, A presiona (con sprint, barrida), B hace entrada y X pide doble presión, y los botones SHALL
cambiar su texto. Los toques SHALL usar *touch events* no pasivos por dedo (multitáctil: moverse, correr y patear a
la vez). SHALL ofrecer «🎮 Mando clásico» con `juegos/mando.js` y aceptar un control físico (Gamepad API) y el
teclado (flechas o WASD, J/K/U/I, Shift sprint, Q cambiar, P o Esc pausa). La elección SHALL recordarse en el
navegador. En vertical SHALL sugerir girar el celular sin impedir jugar, y los mandos SHALL caber completos desde
320 px en vertical y en horizontal sin tapar el marcador.

#### Scenario: Pasar y tirar con toques reales
- **WHEN** en el celular arrastra el joystick hacia la portería rival, toca A y luego mantiene B y suelta
- **THEN** su jugador se mueve, pasa el balón a un compañero y tira con la potencia acumulada

#### Scenario: El control se recuerda
- **WHEN** elige «🎮 Mando clásico», cierra el juego y lo vuelve a abrir
- **THEN** el selector muestra «Mando clásico» y el partido usa el mando en pantalla

#### Scenario: Celular en vertical
- **WHEN** abre el juego con el celular en vertical
- **THEN** ve el aviso de girar el celular y aun así puede jugar con los mandos debajo de la cancha

### Requirement: Cartas de habilidad y pizarra táctica de Fútbol Estelar
Cada jugador SHALL poder tener una carta de habilidad pasiva con ícono visible («🎯 Pase al hueco», «🚀 Tirador
lejano», «🧱 Muro», «🌀 Regateador», «🐱 Portero felino», «🎩 Cabeceador», «⚡ Velocista», «🔋 Incansable») que cambia
sutilmente sus atributos o su comportamiento automático. Antes de cada partido SHALL mostrarse una pizarra corta con
valores por omisión (formación 4-4-2, 4-3-3, 3-5-2 o 5-3-2; deslizadores de línea defensiva, amplitud, mentalidad y
presión) que se puede saltar con un toque, y la táctica elegida SHALL guardarse en el avance.

#### Scenario: Sin tiempos muertos
- **WHEN** elige un partido rápido
- **THEN** ve la pizarra con la táctica guardada y «▶ ¡A jugar!» empieza el partido con un toque

#### Scenario: La carta cambia al jugador
- **WHEN** un jugador tiene «⚡ Velocista»
- **THEN** su velocidad tope es mayor que la de un jugador igual sin la carta

### Requirement: IA de Fútbol Estelar por niveles
La IA SHALL colocarse por formación y táctica, apoyar al que lleva el balón, marcar, interceptar pases y decidir
entre pasar, regatear o tirar, con los niveles Fácil, Medio, Difícil y Leyenda. Fácil SHALL poder ganarlo un niño o
una niña (más lento, reacciona tarde, falla más y presiona poco). Con la misma semilla y las mismas entradas el
partido SHALL ser idéntico (motor determinista sin DOM, `juegos/futbol-motor.js`).

#### Scenario: Partido determinista
- **WHEN** se simulan dos veces 90 minutos IA contra IA con la misma semilla
- **THEN** el marcador y las posiciones finales son iguales

#### Scenario: Niveles
- **WHEN** la IA en Difícil enfrenta a la IA en Fácil en varias semillas
- **THEN** Difícil anota más goles en total

### Requirement: Modos de Fútbol Estelar
El menú del juego SHALL ofrecer: ⚡ Partido rápido, 🏆 Copa (Copa Continental de Clubes, 8 clubes por eliminación con
penales si hay empate), 📈 Carrera, 🛋️ Torneo local y 📅 Clasificatoria semanal (rival de la semana, igual para todos,
en Difícil). Los partidos contra la IA de una persona SHALL sumar ⭐ individuales (victoria, empate o derrota, goles y
nivel; tope 1000 por partido); los del modo local no suman. La clasificatoria SHALL guardar el mejor puntaje de la
semana en el avance.

#### Scenario: Clasificatoria semanal
- **WHEN** juega la clasificatoria de la semana y gana
- **THEN** suma ⭐ individuales al ranking de la semana y su mejor puntaje de esa semana queda guardado

#### Scenario: Copa con penales
- **WHEN** una eliminatoria de la Copa termina empatada
- **THEN** se define en una tanda de penales donde apunta con el joystick y tira con B

### Requirement: Multijugador local de Fútbol Estelar
En PC, el «🛋️ Torneo local» y el partido local SHALL aceptar de 2 a 4 personas, cada una con un control físico
(Gamepad API, leídos por separado) o uno de dos juegos de teclas (WASD + F/G/R/T + Shift izquierdo + Q; flechas +
J/K/U/I + Shift derecho + L), y elegir lado: cooperativo contra la IA o 1 vs 1 (o 2 vs 2). El torneo SHALL armar una
llave de 4 u 8 equipos con personas y la IA, simular los partidos de la IA contra la IA y llegar a un campeón. En el
celular SHALL jugar 1 persona.

#### Scenario: Dos controles en la misma PC
- **WHEN** dos personas conectan dos controles y eligen 1 vs 1
- **THEN** cada control mueve solo al jugador de su equipo

#### Scenario: Torneo de 4
- **WHEN** arma un torneo de 4 equipos con una persona y 3 de la IA
- **THEN** juega sus partidos, los de la IA se resuelven solos y al final ve al campeón

### Requirement: Universo ficticio de Fútbol Estelar
El universo SHALL generarse con un script determinista (`herramientas/generar-futbol.ts`) en
`juegos/datos/futbol.json`: Liga Volcán (Primera), Liga del Pacífico (Segunda) y Liga Norte (Tercera) con 8 clubes
cada una y la Copa Continental de Clubes, clubes con nombre, siglas, colores, uniforme, escudo dibujado en canvas y
estadio inventados, y 16 jugadores y jugadoras por club con nombres inventados, número, posición, atributos y algunas
cartas. Ningún nombre SHALL ser de un club, jugador o marca real. La persona SHALL poder personalizar su club
(escudo: forma, colores y símbolo; uniforme: colores y patrón; nombre del estadio).

#### Scenario: Universo reproducible
- **WHEN** se vuelve a correr el script
- **THEN** el JSON resultante es idéntico al versionado

### Requirement: Carrera (Liga Master) de Fútbol Estelar
La Carrera SHALL empezar con un club propio en la Liga Norte, con una temporada de 14 jornadas contra la IA (jugar
o simular cada partido), tabla con PJ, G, E, P, GF, GC, DG y Pts, ascenso de los 2 primeros y descenso de los 2
últimos, dinero por resultados para fichar en el mercado, contratar al ojeador (descubre jugadores) y desbloquear
cartas, progresión de los jugadores al final de cada temporada y la Copa Continental para los 4 primeros de Primera.
El avance SHALL guardarse en el servidor y recuperarse al volver.

#### Scenario: Carrera guardada y recuperada
- **WHEN** juega la jornada 1 de su carrera, cierra el juego y lo vuelve a abrir
- **THEN** ve su club, la jornada 2 por jugar y la tabla con su resultado

#### Scenario: Ascenso
- **WHEN** termina la temporada entre los 2 primeros de la Liga Norte
- **THEN** la siguiente temporada su club juega en la Liga del Pacífico y recibe el premio de ascenso

### Requirement: Avance de Fútbol Estelar en el servidor
`/juegos/progreso/futbol` SHALL aceptar el avance con la forma exacta `{ stats, clasif, tactica, carrera }` (ver
docs/data-model.md), con enteros en rango, formación conocida, semana `AAAA-Www`, divisiones de 8 clubes sin repetir
que incluyen al club propio, tantos resultados como jornadas jugadas, plantilla de 14 a 20 ids sin repetir, cartas
conocidas y textos del club de 2 a 24 caracteres (letras, números, espacio y `.'-`) y colores `#rrggbb`, dentro de
los 4096 bytes. Cada jugador SHALL leer y escribir solo su propio avance. `CATALOGO.futbol` SHALL ser
`{ categoria: "arcade", titulo: "Fútbol Estelar 2010", max: 1000 }`.

#### Scenario: Carrera válida
- **WHEN** un alumno guarda una carrera recién creada
- **THEN** el servidor responde `{ ok: true, v: 1 }` y al pedirla recibe los mismos datos

#### Scenario: Avance inválido
- **WHEN** alguien manda una formación desconocida, una llave extra o un club con `<script>` en el nombre
- **THEN** responde 400 `progreso_invalido` y no cambia nada

### Requirement: Futbolito retirado del menú
«Futbolito» SHALL dejar de mostrarse en 🕹️ Arcade y en el menú para crear salas de 👥 Partidas. Sus archivos, su
motor, su título en el catálogo y el soporte de salas en el servidor SHALL conservarse, de modo que una sala de
Futbolito que ya existía se pueda abrir, jugar y terminar, y el historial y el ranking sigan mostrando su título.

#### Scenario: Sala de Futbolito en curso
- **WHEN** una alumna vuelve por enlace a una sala de Futbolito creada antes del cambio
- **THEN** la sala se abre en el iframe de Futbolito y la partida se termina con su podio

#### Scenario: No se ofrece al crear sala
- **WHEN** un alumno abre «Crear partida»
- **THEN** la lista de juegos no incluye Futbolito
