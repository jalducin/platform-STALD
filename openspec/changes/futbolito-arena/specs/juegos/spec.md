## ADDED Requirements

### Requirement: Futbolito Arena en Arcade
El catálogo SHALL tener «⚽ Futbolito Arena» (id `futbolito-arena`, distinto de `futbolito`) en 🕹️ Arcade, con tope de
1000 puntos por partida en el servidor. El juego SHALL mostrar una arena octagonal vista desde arriba con una ligera
inclinación: pasto con líneas, paredes que rebotan y 2 porterías; robots redondos del color de su equipo con número,
apodo corto e indicador de dirección, y un balón con inercia que rebota en paredes y robots. No SHALL usar nombres ni
marcas de terceros.

#### Scenario: Tarjeta en Arcade
- **WHEN** alguien abre la categoría 🕹️ Arcade
- **THEN** ve «⚽ Futbolito Arena» y al tocarla se abre el juego en el marco de Arcade

#### Scenario: Celular en vertical
- **WHEN** el juego se abre a 390×844
- **THEN** la arena se gira 90° (porterías arriba y abajo), cabe completa y los controles quedan debajo sin taparla

### Requirement: Controles de joystick y botón
El robot propio SHALL moverse con un joystick (dirección y velocidad). El botón A SHALL hacer una embestida que patea
el balón, con recarga; el botón B SHALL girar y frenar, con recarga. SHALL funcionar con toques (joystick a la
izquierda, botón grande a la derecha), con el mando común de Arcade, con controles físicos (Gamepad) y con teclado.

#### Scenario: Toques reales
- **WHEN** una alumna arrastra el joystick hacia la derecha y toca el botón ⚡
- **THEN** su robot avanza hacia la derecha, embiste y el botón muestra la recarga antes de poder usarse otra vez

#### Scenario: Teclado y control físico
- **WHEN** alguien usa flechas y Espacio, o la palanca y el botón A de un control
- **THEN** el robot se mueve y embiste igual que con los toques

### Requirement: Partido contra la IA
El juego SHALL ofrecer 1 vs 1, 2 vs 2 con compañero IA y 3 vs 3 (arena grande), con dificultad Fácil, Medio o Difícil,
a 3, 5 o 7 goles o 3 minutos (empate al final → gol de oro hasta 60 s). Tras cada gol SHALL haber saque al centro.
SHALL sonar gol, silbato, victoria o derrota y tensión al final con `window.Emocion`. En Fácil la IA SHALL ser lenta y
casi no embestir, para que una niña o un niño pueda ganar. Los puntos SHALL registrarse con tope de 1000.

#### Scenario: Gol y saque
- **WHEN** el balón cruza la línea de una portería
- **THEN** sube el marcador del otro equipo, suena el gol y los robots vuelven a su lugar para el saque

#### Scenario: Fin del partido
- **WHEN** un equipo llega a los goles del partido o se acaba el tiempo
- **THEN** suena el silbato, se muestra victoria, empate o derrota con los puntos y el botón de revancha

### Requirement: Sala de Futbolito Arena por equipos
«Crear partida» SHALL ofrecer «⚽ Futbolito Arena» con formato 2 vs 2 (por omisión), 1 vs 1, 1 vs 2 o 3 vs 3, arena
normal o grande (3 vs 3 siempre grande) y goles 3, 5 o 7. La mesa SHALL ser la misma en el servidor y en la página;
con bots, los asientos libres los ocupan bots y cada persona que entra quita uno. En la sala de espera cada persona
SHALL ver los dos equipos parejos, poder pedir el otro equipo («🔁 Cambiar de equipo») y elegir el color de su robot;
el servidor SHALL rechazar un equipo lleno con 409 `equipo_lleno` y valores inválidos con 400.

#### Scenario: Sala 2 vs 2 con bots
- **WHEN** el anfitrión crea la sala 2 vs 2 con bots y entra una persona más
- **THEN** la sala muestra «Mesa de 4 · 2 personas + 2 bots» y cada persona queda en un equipo distinto

#### Scenario: Cambiar de equipo
- **WHEN** una persona toca «🔁 Cambiar de equipo» y hay lugar
- **THEN** su asiento guarda el equipo y todos ven el reparto nuevo

### Requirement: Partido en vivo con anfitrión autoritativo
Con más de una persona y canal en vivo, el anfitrión SHALL simular a 60 Hz y mandar una foto cuantizada a 15 Hz; cada
invitado SHALL mandar su entrada (joystick, botones con contador de presiones y `seq`), interpolar a los demás con
100 ms de retraso y predecir solo su robot con reconciliación. Todos SHALL ver el mismo marcador y escuchar los goles.
Si una persona se desconecta, la IA SHALL tomar su robot hasta que regrese; si se cae el anfitrión, los invitados SHALL
cerrar a los 15 s con el último marcador. Sin canal en vivo SHALL mostrarse un mensaje claro con la opción de jugar
contra la IA.

#### Scenario: Gol visto por todos
- **WHEN** un invitado anota en una sala de 4
- **THEN** los 4 aparatos muestran el mismo marcador y el grito de gol

#### Scenario: Desconexión
- **WHEN** un invitado deja de mandar mensajes 3 s
- **THEN** su robot lo maneja la IA, todos ven el aviso y al volver recupera su robot

#### Scenario: Sin canal en vivo
- **WHEN** el canal no conecta
- **THEN** se muestra «El partido en vivo no está disponible en esta sala» y el botón «🤖 Jugar contra la IA»

### Requirement: Resultado validado por el servidor
Cada persona SHALL reportar `{ arena: { goles, ms, corte? } }` una sola vez; el servidor SHALL rechazar con 400
`resultado_invalido` un marcador mayor a los goles de la sala, más goles que `1 + ms/2500` o una duración imposible, y
SHALL decidir el resultado (confirmado, en disputa, del invitado o pendiente) y los puntos de cada persona según su
equipo. El ranking de la sala SHALL usar los puntos del servidor.

#### Scenario: Resultado confirmado
- **WHEN** el anfitrión y los invitados reportan 3–2
- **THEN** la sala queda «confirmado» y cada persona recibe los puntos de su equipo

#### Scenario: Marcador imposible
- **WHEN** alguien reporta 9–0 en una sala a 5 goles
- **THEN** el servidor responde 400 `resultado_invalido`
