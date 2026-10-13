## ADDED Requirements

### Requirement: Sala de Fútbol Estelar 1 vs 1 en línea
«Crear partida» SHALL ofrecer «⚽ Fútbol Estelar 2010» como sala 1 vs 1 solo entre personas (mesa `futbol`: máximo 2,
mínimo 2, sin bots), con la misma tabla de mesas en el servidor y en la página. En la sala de espera cada persona SHALL
poder elegir su formación (4-4-2, 4-3-3, 3-5-2, 5-3-2) y sus deslizadores (línea, amplitud, mentalidad y presión de
0 a 100); el servidor SHALL guardarlos en su asiento y rechazar valores fuera de rango con 400. Quien creó la sala
SHALL ser el anfitrión del partido.

#### Scenario: Crear la sala
- **WHEN** un alumno elige «⚽ Fútbol Estelar 2010» en «Crear partida»
- **THEN** no ve la casilla de bots, ve la nota «1 vs 1 en vivo, solo entre dos personas» y la sala muestra «Hasta 2 personas»

#### Scenario: Táctica en la sala de espera
- **WHEN** la invitada elige 4-3-3 y sube la presión a 80 en la sala de espera
- **THEN** su asiento guarda `{ formacion: "4-3-3", presion: 80, … }` y el partido arranca con esa táctica para su equipo

#### Scenario: Táctica inválida
- **WHEN** alguien manda `{ tactica: { formacion: "9-0-1" } }` o un deslizador de 140
- **THEN** el servidor responde 400 `tactica_invalida` y no cambia el asiento

#### Scenario: Sin rival
- **WHEN** el anfitrión intenta empezar solo
- **THEN** el servidor responde 409 `faltan_jugadores`

### Requirement: Partido en vivo con anfitrión autoritativo
El anfitrión SHALL simular el partido a 60 Hz y mandar a 15 Hz una foto cuantizada (posiciones a 0.05 m, balón con
altura, marcador, reloj, estado, posesión, jugadores controlados y el último `seq` de entrada aplicado) de alrededor
de 500 B. El invitado SHALL mandar su entrada (joystick, botones y `seq`) a 30 Hz, dibujar a los demás interpolando
con 100 ms de retraso y predecir solo a su jugador controlado, corrigiéndolo con la foto (reconciliación). Ambos
aparatos SHALL mostrar el mismo marcador, sonar gol, silbatos, victoria o derrota con `window.Emocion` y mostrar un
indicador de latencia.

#### Scenario: Gol de la invitada visto por el anfitrión
- **WHEN** la invitada anota
- **THEN** los dos aparatos muestran el mismo marcador y suena el gol en ambos

#### Scenario: Red con latencia, pérdida y desorden
- **WHEN** el canal tiene 150 ms de latencia, 10 % de pérdida y mensajes fuera de orden
- **THEN** el invitado ignora fotos viejas, su dibujo se mantiene cerca del del anfitrión y al final ambos coinciden en el marcador

### Requirement: Desconexión en el partido en vivo
Si alguien deja de mandar durante 3 s, el otro aparato SHALL avisar «Se perdió la conexión»; la IA SHALL tomar al
equipo de quien se cayó para que el partido no se congele, y si no vuelve en 15 s el partido SHALL cerrarse con el
marcador de ese momento. Si vuelve antes, SHALL recuperar el control de su equipo.

#### Scenario: Se cae la invitada
- **WHEN** la invitada cierra su pestaña a mitad del partido
- **THEN** el anfitrión ve el aviso con la cuenta de 15 s, la IA juega por el otro equipo y al terminar la cuenta el partido se cierra y se registra el resultado

#### Scenario: Se cae el anfitrión
- **WHEN** el anfitrión deja de mandar fotos por más de 15 s
- **THEN** la invitada ve «Conexión perdida», el partido se cierra con el marcador de la última foto y ella lo reporta

### Requirement: Resultado del partido en vivo validado por el servidor
Al terminar, el anfitrión SHALL mandar `{ futbol: { goles: [local, visitante], ms } }` a
`POST /juegos/sala/<código>/respuesta` y el invitado SHALL mandar lo que vio. El servidor SHALL guardar solo el primer
reporte de cada quien y rechazar con 400 `resultado_invalido` marcadores fuera de 0–30, más goles de los plausibles
para la duración (uno cada 10 s más uno) y duraciones menores a 10 s, mayores a 20 min o mayores al tiempo transcurrido
desde el inicio de la sala más 5 s. El resultado SHALL quedar «confirmado» si coinciden; si difieren, SHALL contar el
del anfitrión marcado «en disputa»; si solo reportó una persona, SHALL contar ese reporte. Los puntos de cada persona
SHALL calcularse con el marcador aceptado (como el partido rápido) y toparse en 1000.

#### Scenario: Coinciden
- **WHEN** anfitrión e invitada reportan 2–1 con duraciones coherentes
- **THEN** el resultado queda «confirmado» 2–1 y cada quien recibe sus puntos según su lado

#### Scenario: Marcador imposible
- **WHEN** alguien reporta 25–0 en un partido de 40 s
- **THEN** el servidor responde 400 `resultado_invalido`

#### Scenario: No coinciden
- **WHEN** el anfitrión reporta 2–1 y la invitada 1–1
- **THEN** cuenta 2–1 y el resultado queda marcado «en disputa»

### Requirement: Respaldo sin canal en vivo
Si la sala no trae canal en vivo o `EnVivo.conectar` no conecta en 5 s, el partido en línea NO SHALL ofrecerse en
esa sala: el juego SHALL mostrar un mensaje claro y sugerir la 📅 Clasificatoria semanal con un botón para jugarla;
nunca SHALL caer a jugar por sondeo.

#### Scenario: El canal no conecta
- **WHEN** empieza la sala y el canal en vivo no conecta
- **THEN** ambos ven «El partido en vivo no está disponible en esta sala» con el botón «📅 Jugar la Clasificatoria semanal»
