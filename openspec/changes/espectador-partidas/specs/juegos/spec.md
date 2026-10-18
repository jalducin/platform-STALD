## ADDED Requirements

### Requirement: Espectar una partida
Una persona registrada en Juegos SHALL poder ver una partida sin jugarla: al intentar unirse a una sala llena o que ya
empezó, la página SHALL mostrar «La partida está llena» o «La partida ya empezó» con el botón «👀 Ver como
espectador»; también SHALL poder espectar desde el principio con «👀 Solo ver» o con el enlace `?sala=<código>&ver=1`.
`POST /juegos/sala/<código>/espectar` SHALL registrar a quien especta (sin correos) y `{ salir: true }` SHALL quitarlo.
Quien especta no SHALL ocupar asiento ni contar para el cupo, las mesas, el mínimo para empezar, el podio, la revancha
ni el ranking, y sus jugadas SHALL rechazarse con 403. Cada sala SHALL admitir hasta 30 espectadores (409
`espectadores_llenos`) y todas las personas de la sala SHALL ver «👀 N viendo». Quien ya juega en la sala SHALL
recibir 409 `ya_en_sala` y seguir con su vista de jugador.

#### Scenario: Sala llena
- **WHEN** Angel intenta unirse a una partida de ajedrez que ya tiene 2 personas
- **THEN** ve «La partida está llena» y «👀 Ver como espectador»; al tocarlo ve el tablero sin poder mover

#### Scenario: Sala empezada
- **WHEN** alguien especta una sala de preguntas que ya empezó
- **THEN** ve la pregunta y el marcador, su respuesta se rechaza con 403 y no aparece en el podio ni suma puntos

#### Scenario: No cuenta como jugador
- **WHEN** 3 personas espectan una sala de Brisca de 2 personas y 2 bots
- **THEN** la mesa sigue con 2 bots, el anfitrión puede empezar igual y el podio no incluye a quienes espectan

#### Scenario: Cupo de espectadores
- **WHEN** ya hay 30 espectadores y llega otra persona
- **THEN** recibe 409 `espectadores_llenos`

#### Scenario: Sin registro o sin sesión
- **WHEN** una persona registrada que no juega ni especta pide la sala, o alguien sin cuenta de Juegos pide espectar
- **THEN** recibe 403 (`no_en_sala` o el rechazo de acceso de siempre)

### Requirement: Vista de espectador sin secretos
La vista de espectador (y la del admin) SHALL ser la vista pública de la mesa, la misma que publica el canal de la
sala: nunca SHALL incluir el canal secreto (salvo el topic en juegos en vivo), la palabra de Dibuja del turno, las
flotas de Batalla naval antes del final ni las elecciones de Piedra-papel-tijera antes de que la ronda esté completa.
En los juegos de cartas la página del espectador SHALL mostrar solo cartas públicas (mesa, bajadas, descartes) y dorsos
de las manos.

#### Scenario: Batalla naval
- **WHEN** alguien especta una Batalla naval en curso
- **THEN** la respuesta no trae la flota de ninguna persona

#### Scenario: Piedra-papel-tijera
- **WHEN** una persona ya eligió y la otra no
- **THEN** el espectador ve «?» en lugar de la elección

#### Scenario: Dibuja y adivina
- **WHEN** alguien especta el turno de dibujo
- **THEN** ve cuántas letras tiene la palabra pero no la palabra

#### Scenario: Póker
- **WHEN** alguien especta una mano de póker
- **THEN** ve las cartas comunes, las fichas y los dorsos, y las manos solo en la muestra final

### Requirement: Juegos en vivo en solo escucha
En Karts, Fútbol en línea, Futbolito Arena y Brigada Xalli el espectador SHALL recibir el topic de la sala y conectarse en solo
escucha: no SHALL enviar ningún evento `vivo` (ni latidos) y cada aparato de juego SHALL ignorar los mensajes de quien
no está en `participantes`. En los demás juegos el espectador no SHALL recibir el topic y SHALL usar sondeo. En Karts
SHALL ver la carrera con la cámara en el líder o en quien elija (◀ ▶), el minimapa y la clasificación en vivo; en
Fútbol y Arena SHALL ver la cancha completa con el marcador, y en Brigada Xalli la misión con la cámara compartida del anfitrión.

#### Scenario: Karts en vivo
- **WHEN** alguien especta una carrera de Karts en vivo de 2 personas
- **THEN** ve moverse los 2 karts, cambia de cámara con ▶ y ningún evento que intente mandar llega a quienes corren

#### Scenario: Inyección
- **WHEN** un aparato que no está en `participantes` manda un evento por el canal
- **THEN** quienes juegan lo descartan

### Requirement: Interfaz del espectador
La página SHALL mostrar el distintivo «👀 Espectador», ocultar los controles del juego, conservar el sonido con un botón
para silenciarlo y mostrar el podio al final. Si alguien abre la revancha y hay lugar, SHALL ofrecer «🔁 Unirme a la
revancha»; si no, «👀 Ver la revancha». Sin Realtime, la vista de espectador SHALL actualizarse por sondeo.

#### Scenario: Revancha
- **WHEN** termina la partida que alguien especta y una jugadora abre la revancha
- **THEN** el espectador ve «🔁 Unirme a la revancha» y al tocarlo entra a la sala de espera nueva como jugador
