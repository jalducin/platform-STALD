# juegos Specification

## Purpose
Plataforma de Juegos (`juegos.html` y `/juegos/…`): catálogo, puntajes y ranking semanal por tipo, invitados, avatares, partidas multijugador (también en tiempo real) y cada juego individual o de sala. Origen: juegos-plataforma y cambios posteriores.
## Requirements
### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Español, Maratón de cultura, Mente ágil, Clásicos
(desde juegos-clasicos) y Arcade (desde juegos-plataformas-karts), cada uno con su ícono y su descripción.
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos; los de Arcade muestran el resultado de cada nivel o carrera dentro del juego.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

#### Scenario: Categoría Arcade
- **WHEN** un alumno abre el inicio de Juegos
- **THEN** ve la categoría «🕹️ Arcade» con «Axo y los 12 mundos», «Karts Turbo» y «Dragon Run», con su ícono y su
  descripción, y Dragon Run ya no aparece en «⚡ Mente ágil»

### Requirement: Guardar partidas con tope
El sistema SHALL exponer `POST /juegos/partida?email=` con `{ juego, puntos, aciertos, total, segundos }` y,
opcionalmente, `sala` (código de la partida multijugador).
- Solo acepta juegos del catálogo, y recorta los puntos al tope del juego (10,000 para las partidas de sala).
- Guarda la partida en la semana (lunes a domingo, CDMX) del jugador.
- Actualiza el mejor puntaje de ese juego (para el aviso de nuevo récord) y los totales de la semana, que suman
  **todas** las partidas, separados por tipo (ver «Puntaje semanal por tipo de juego»).

#### Scenario: Primera partida
- **WHEN** Marisol envía 850 puntos en `en-vocab`
- **THEN** responde 200 y `nuevoRecord` es verdadero

#### Scenario: Partida peor suma, pero no cambia el récord
- **WHEN** después envía 400 en `en-vocab`
- **THEN** su mejor puntaje en `en-vocab` sigue en 850 y su total individual sube 400

#### Scenario: Puntos fuera de rango
- **WHEN** envía 999999 puntos
- **THEN** se guardan como el tope del juego

#### Scenario: Juego inexistente o correo sin registro
- **WHEN** el juego no está en el catálogo
- **THEN** responde 400
- **WHEN** el correo no es alumno, alumna, admin ni invitado registrado
- **THEN** responde 403 `no_registrado`

#### Scenario: Límite diario
- **WHEN** un jugador ya envió 100 partidas hoy
- **THEN** la siguiente responde 429 `limite_diario`

### Requirement: Ranking semanal
El sistema SHALL exponer `GET /juegos/ranking?email=&tipo=individual|partidas` (por defecto `individual`), con el
top 20 de la semana `{ pos, nombre, tipo, total, juegos }` ordenado por el puntaje de ese tipo, y la posición
propia. SHALL mostrar solo nombres de pila o apodos, nunca correos.

#### Scenario: Orden
- **WHEN** Marisol tiene 1200 puntos individuales y Angel 900
- **THEN** en el ranking individual Marisol aparece en la posición 1 y Angel en la 2

#### Scenario: Semana nueva
- **WHEN** empieza otra semana
- **THEN** el ranking empieza vacío y la semana anterior se puede consultar con `?semana=`

### Requirement: Invitados
El sistema SHALL permitir que un correo que no está en las clases se registre como invitado con
`POST /juegos/invitado`, dando un apodo y aceptando el aviso de uso de su correo. Así puede jugar y
aparecer en el ranking como "invitado". Su correo SHALL guardarse solo en el repo privado. Solo el admin
SHALL poder listar a los invitados con sus correos (`GET /juegos/invitados`).

#### Scenario: Registro
- **WHEN** alguien con un correo desconocido se registra con el apodo "Leo" y acepta
- **THEN** puede enviar partidas y aparece en el ranking como "Leo (invitado)"

#### Scenario: Sin aceptar
- **WHEN** no acepta el aviso o el apodo no es válido
- **THEN** responde 400 y no se registra

#### Scenario: Alumno que intenta registrarse
- **WHEN** un correo de alumno o alumna usa el registro de invitado
- **THEN** responde `{ ya: true }` y no se crea un invitado

#### Scenario: Lista para análisis
- **WHEN** el admin consulta `/juegos/invitados`
- **THEN** ve correo, apodo, fechas, visitas y puntos de la semana
- **WHEN** lo consulta alguien más
- **THEN** responde 403

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

### Requirement: Crear y unirse a partidas
Un jugador registrado SHALL poder crear una partida de un juego permitido y obtener un código de 4
letras. Otros jugadores SHALL poder unirse con ese código antes de que empiece, hasta 30. Solo quien la
creó SHALL poder empezarla.

#### Scenario: Crear y unirse
- **WHEN** Marisol crea una partida de Maratón de cultura con bots
- **THEN** recibe un código
- **AND** Angel se une con ese código y ambos se ven en la sala de espera, junto con los 2 bots

#### Scenario: Solo el host empieza
- **WHEN** Angel intenta empezar la partida de Marisol
- **THEN** responde 403

#### Scenario: Unirse tarde o a una sala que no existe
- **WHEN** alguien intenta unirse después de empezar
- **THEN** responde 409
- **WHEN** el código no existe
- **THEN** responde 404

### Requirement: Partida de preguntas sincronizada
Todos los jugadores de una partida de preguntas SHALL ver las mismas 10 preguntas, en el mismo orden y
al mismo tiempo, según la hora de inicio del servidor.
- Cada pregunta tiene 15 s para responder y 4 s de revelación, con la respuesta correcta y el marcador de
  la sala.
- Cada respuesta vale 100 si es correcta, más hasta 100 por rapidez.
- Solo cuenta la primera respuesta de cada pregunta.

#### Scenario: Mismas preguntas
- **WHEN** dos jugadores están en la misma partida
- **THEN** ven la misma pregunta con las mismas opciones al mismo tiempo

#### Scenario: Marcador y podio
- **WHEN** termina la partida
- **THEN** se ve el podio con humanos y bots, ordenado por puntos
- **AND** los puntos de cada persona se guardan en su ranking semanal de ese juego

### Requirement: Basta en partida
En una partida de Basta, todos SHALL tener la misma letra. Quien grita "¡Basta!" con todas sus categorías
llenas SHALL cerrar la ronda para todos, con 3 s de gracia. La puntuación SHALL premiar las palabras
únicas sobre las repetidas, según el design.

#### Scenario: Palabra repetida
- **WHEN** dos jugadores escriben la misma palabra verificada en una categoría
- **THEN** cada uno recibe 50 en esa categoría, en lugar de 100

### Requirement: Bots aleatorios
Una partida con bots SHALL incluir a "BOT-VACHIRA" y "BOT-ISAGII". Contestan al azar, con 60 % y 45 % de acierto
y tiempos variables, y SHALL verse igual en todos los dispositivos, porque se calculan con la semilla de la
partida. En Basta llenan palabras del diccionario al azar. (Antes se llamaban "Bot Ajolote 🦎" y "Bot Colibrí 🐦".)

#### Scenario: Bots consistentes
- **WHEN** dos jugadores ven el marcador de la misma partida
- **THEN** los bots tienen los mismos puntos en ambos

#### Scenario: Sala con bots
- **WHEN** se crea una partida con bots
- **THEN** la sala de espera muestra a BOT-VACHIRA y BOT-ISAGII

### Requirement: Registro y resumen de partidas para el admin
El sistema SHALL registrar cada partida creada en un índice semanal y guardar el total final de cada
jugador y el podio del anfitrión al terminar. SHALL exponer `GET /juegos/admin/resumen`, solo para el
admin, con los jugadores de la semana (total, mejores, partidas, última vez) y las partidas (juego, fecha,
anfitrión, jugadores con su total y podio), sin correos.

#### Scenario: Partida registrada
- **WHEN** Marisol crea una partida, Angel se une y ambos envían su total final
- **THEN** el resumen del admin incluye la partida con los dos jugadores y sus totales

#### Scenario: Podio del anfitrión
- **WHEN** el anfitrión envía el podio con los bots
- **THEN** el resumen muestra ese podio
- **WHEN** alguien que no es el anfitrión envía un podio
- **THEN** se ignora

#### Scenario: Enlace directo para un invitado
- **WHEN** alguien sin sesión abre `juegos.html?sala=KXQP`, escribe su correo nuevo y se registra como invitado
- **THEN** entra directo a la sala de espera de la partida KXQP

#### Scenario: Compartir desde la sala de espera
- **WHEN** el anfitrión está en la sala de espera
- **THEN** ve el enlace, el botón "📤 Compartir" y un código QR con ese enlace

#### Scenario: Solo admin
- **WHEN** una alumna consulta `/juegos/admin/resumen`
- **THEN** responde 403

### Requirement: Responde en inglés
Las preguntas de "Responde en inglés" SHALL mostrar una pregunta en inglés, con su traducción como apoyo, y 4
respuestas en inglés, de las que una sola es la respuesta natural. Desde la fusión SHALL jugarse dentro de
🧩 Completa y responde (`en-frases`), en solitario y en partida; el juego suelto `en-preguntas` SHALL NOT aparecer
en el menú ni crearse en partidas nuevas.

#### Scenario: Pregunta de edad
- **WHEN** en Completa y responde sale "How old are you?"
- **THEN** la respuesta correcta es "I am twelve." y los distractores son respuestas en inglés a otras
  preguntas

### Requirement: Lotería en partida
En una partida de Lotería, todos los jugadores SHALL ver y oír las mismas cartas al mismo tiempo, cada uno
con su propia tabla. El primer "¡Lotería!" válido SHALL ganar y terminar la partida para todos. Los bots
SHALL competir con su propia tabla.

#### Scenario: Mismas cartas
- **WHEN** dos jugadores están en la misma partida de Lotería
- **THEN** ven la misma carta cantada al mismo tiempo, con tablas distintas

#### Scenario: Gana el primero
- **WHEN** un jugador completa una línea y grita "¡Lotería!" antes que los demás
- **THEN** todos ven que ganó y el podio

#### Scenario: Grito una sola vez
- **WHEN** un jugador envía "¡Lotería!" dos veces
- **THEN** el servidor conserva la hora del primero

### Requirement: Avatar del jugador
Cada jugador SHALL tener un avatar: un personaje de una lista cerrada con un color de fondo. Mientras no
elija, SHALL tener uno por defecto. SHALL poder cambiarlo desde Juegos, y el avatar SHALL verse en el
ranking, en las partidas y en el resumen de juegos del admin. El servidor SHALL rechazar valores fuera de
la lista.

#### Scenario: Cambiar avatar
- **WHEN** Sofy elige 🦊 con color morado y guarda
- **THEN** su chip, el ranking y las partidas muestran 🦊 en morado

#### Scenario: Valor no permitido
- **WHEN** se envía un emoji o color que no está en la lista
- **THEN** responde 400 y no cambia

#### Scenario: Avatar por defecto
- **WHEN** un jugador nuevo entra sin haber elegido
- **THEN** tiene un avatar válido que no cambia entre visitas

### Requirement: Música de fondo
`juegos.html` SHALL ofrecer música de fondo generada en el navegador, con los estilos Alegre, Relajante y
Fiesta, dos volúmenes y la opción Apagada. SHALL empezar solo tras un gesto del usuario, bajar mientras
suena una voz y recordar la preferencia en el dispositivo.

#### Scenario: Elegir estilo
- **WHEN** el jugador elige "😌 Relajante"
- **THEN** suena la música relajante y la preferencia se recuerda al volver

#### Scenario: Apagar
- **WHEN** elige "Apagada"
- **THEN** la música se detiene

### Requirement: ¡Una! en partida
¡Una! SHALL poder jugarse en partida entre varias personas y los bots opcionales, por turnos y con las
reglas del modo solitario. Todos los dispositivos SHALL ver el mismo estado: carta de arriba, color,
turno y número de cartas de cada quien. SHALL aplicar 30 s por turno, con jugada automática al vencer, y
el castigo de "¡Una!".

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
- **THEN** roba una carta y pasa el turno automáticamente

#### Scenario: Avatar desde el portal
- **WHEN** una alumna entra al portal
- **THEN** ve su avatar en el saludo
- **AND** al tocar "🎨 Cambiar avatar" se abre directo el selector de Juegos

#### Scenario: Fin
- **WHEN** alguien se queda sin cartas
- **THEN** todos ven al mismo ganador y el mismo podio, y los puntos se guardan en el ranking

### Requirement: Foto como avatar
Cada jugador SHALL poder subir una imagen de su galería como avatar, solo si marca la casilla de permiso
de su mamá, papá o tutor. El navegador SHALL reducirla a 128×128 JPEG y el servidor SHALL rechazar
imágenes que no sean JPEG o pesen más de 40 KB. La foto SHALL verse donde se ve el avatar, servida por
un enlace no adivinable, y elegir un personaje SHALL quitarla.

#### Scenario: Subir foto
- **WHEN** Sofy elige una foto de su galería, marca el permiso y guarda
- **THEN** su chip, el ranking y las partidas muestran su foto

#### Scenario: Sin permiso
- **WHEN** se envía una foto sin `acepto: true`
- **THEN** responde 400 `debe_aceptar` y no cambia el avatar

#### Scenario: Imagen inválida o grande
- **WHEN** se envía algo que no es JPEG o pesa más de 40 KB
- **THEN** responde 400 y no se guarda nada

#### Scenario: Volver a un personaje
- **WHEN** quien tiene foto elige un personaje
- **THEN** su avatar es el personaje y la foto anterior deja de existir (404)

#### Scenario: Foto borrada
- **WHEN** una página muestra un avatar cuya foto ya no existe
- **THEN** se ve el personaje en su lugar

### Requirement: Moderación de fotos
El admin SHALL ver la lista de fotos activas y SHALL poder quitar la de cualquier jugador; el jugador
vuelve a su personaje. Nadie más SHALL poder listar o quitar fotos ajenas.

#### Scenario: Quitar foto
- **WHEN** el admin quita la foto de un jugador
- **THEN** la foto deja de existir y el jugador aparece con su personaje

#### Scenario: Sin permiso de admin
- **WHEN** un alumno o alumna pide la lista o quitar una foto
- **THEN** responde 403

### Requirement: Basta en partida por rondas
Una partida de Basta SHALL jugarse en varias rondas (5, 10 o 12; 10 por defecto), cada una con una letra
distinta e igual para todos. Cada ronda SHALL cerrar a los 60 s o 3 s después del primer "¡Basta!",
mostrar sus resultados con el marcador acumulado y pasar sola a la siguiente letra. Al terminar la última
ronda SHALL mostrarse el podio con la suma de todas las rondas.

#### Scenario: Partida de 10 rondas
- **WHEN** la profe crea una partida de Basta sin cambiar las rondas y la empieza
- **THEN** se juegan 10 rondas con 10 letras distintas y al final el podio suma los puntos de las 10

#### Scenario: Elegir rondas
- **WHEN** se crea una partida de Basta con 5 o 12 rondas
- **THEN** se juegan exactamente esas rondas; otro valor responde 400 `rondas_invalidas`

#### Scenario: ¡Basta! adelanta la ronda
- **WHEN** alguien presiona "¡Basta!" en la ronda 3
- **THEN** la ronda 3 cierra 3 s después para todos, se ven sus resultados y sigue la ronda 4

#### Scenario: Mismo marcador en todos
- **WHEN** dos navegadores juegan la misma partida
- **THEN** ven las mismas letras, los mismos puntos por ronda y el mismo podio final

### Requirement: Sudoku por niveles
Juegos SHALL ofrecer un Sudoku individual con niveles Fácil, Medio, Difícil y Experto. Cada tablero SHALL
tener una sola solución. Un número equivocado SHALL marcarse y restar una vida (3 vidas). Al resolverlo,
los puntos SHALL depender del nivel, la rapidez y los errores, y SHALL sumarse al ranking semanal.

#### Scenario: Resolver un Sudoku fácil
- **WHEN** Sofy elige Fácil y completa el tablero sin errores
- **THEN** ve "¡Sudoku resuelto!" con sus puntos y se guardan en el ranking

#### Scenario: Número equivocado
- **WHEN** escribe un número que no va en esa celda
- **THEN** se marca en rojo, no se queda y pierde una vida

#### Scenario: Sin vidas
- **WHEN** se equivoca 3 veces
- **THEN** termina con 0 puntos

#### Scenario: Niveles distintos
- **WHEN** elige Experto
- **THEN** el tablero trae menos pistas que en Difícil, Medio y Fácil, y sigue teniendo solución única

### Requirement: Puntaje semanal por tipo de juego
Cada partida SHALL sumar a un puntaje semanal según su tipo: los juegos individuales a **⭐ Individuales** y
las partidas multijugador a **👥 Partidas**. Volver a jugar SHALL sumar siempre, dentro del límite diario y
del tope por partida. El ranking SHALL poder verse por cada tipo.

#### Scenario: Jugar de nuevo suma
- **WHEN** Sofy juega Simón dice dos veces (600 y 400)
- **THEN** su puntaje individual sube 1,000 en total, aunque 400 no sea récord

#### Scenario: Partida multijugador
- **WHEN** termina una partida de Basta en sala con 2,350 puntos
- **THEN** suma 2,350 a sus puntos de partidas y no a los individuales

#### Scenario: Partida de sala duplicada o ajena
- **WHEN** se intenta guardar dos veces la misma sala, o una sala donde el jugador no está
- **THEN** responde 409 `ya_guardada` o 403 `no_en_sala`, y no suma

#### Scenario: Dos rankings
- **WHEN** se abre el ranking
- **THEN** hay pestañas ⭐ Individuales y 👥 Partidas, cada una ordenada por su puntaje

### Requirement: Dragon Run
Juegos SHALL ofrecer el juego individual **Dragon Run** en Arcade (categoría `arcade` en el catálogo de la página y
del servidor):
- un dragón corre y salta (con doble salto) para esquivar obstáculos y juntar monedas, con 3 vidas, hasta un
  castillo a 600 m;
- al terminar, los puntos (metros + monedas × 10, más 200 si llega al castillo) SHALL sumarse a los ⭐ individuales
  de la semana, con el mismo tope de 2000.

#### Scenario: Jugar y sumar
- **WHEN** Sofy juega Dragon Run y pierde sus 3 vidas a los 250 m con 12 monedas
- **THEN** ve su resultado con 370 puntos, que se suman a sus ⭐ individuales

#### Scenario: Llegar al castillo
- **WHEN** llega a los 600 m
- **THEN** gana el bono de 200 y el resultado dice "¡Llegaste al castillo!"

#### Scenario: Doble salto
- **WHEN** salta y vuelve a presionar en el aire
- **THEN** el dragón da un segundo salto, pero no un tercero

#### Scenario: Está en Arcade
- **WHEN** alguien abre el inicio de Juegos
- **THEN** encuentra Dragon Run en «🕹️ Arcade» y el servidor lo reporta con categoría `arcade`

### Requirement: Partidas en tiempo real con Supabase Realtime
Cuando hay configuración de Supabase, cada sala SHALL tener un canal secreto. El servidor SHALL publicar el estado de la
sala en ese canal tras cada cambio, y las páginas de los jugadores SHALL recibirlo sin consultar periódicamente; solo
harán una consulta de respaldo cada 30 s. Si el canal falla, la página SHALL volver al sondeo normal. Sin configuración,
todo SHALL funcionar como antes.

#### Scenario: Ver un cambio al instante sin sondear
- **WHEN** Angel responde una pregunta en la sala de Sofy
- **THEN** la página de Sofy recibe el nuevo estado por Realtime, sin haber consultado al servidor

#### Scenario: Canal privado de la sala
- **WHEN** alguien que no está en la sala intenta obtener su canal
- **THEN** el servidor no se lo da (403), y el canal no se puede adivinar

#### Scenario: Avisos fuera de orden
- **WHEN** dos jugadores escriben casi al mismo tiempo y el aviso más viejo llega después del nuevo
- **THEN** la página conserva la versión más nueva de cada jugador (contador `v`) y no regresa una sala ya empezada

#### Scenario: Realtime caído
- **WHEN** la conexión con Realtime falla
- **THEN** la página vuelve a consultar cada 2.5–5 s y la partida sigue

#### Scenario: Sin configuración
- **WHEN** el servidor no tiene las variables de Supabase
- **THEN** no se entrega `rt` y las salas funcionan con sondeo, como hoy

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

### Requirement: Brisca con baraja española
El sistema SHALL ofrecer Brisca:
- en individual contra bots: 1 o 2 rivales, o en pareja;
- en partida, con hasta 4 jugadores. Con 4 jugadores se juega en parejas.

#### Scenario: Ganar una baza con triunfo
- **WHEN** el triunfo es copas y en la baza salen el as de oros y el 2 de copas
- **THEN** gana el 2 de copas, porque es triunfo, y se lleva 11 puntos

#### Scenario: Sin triunfo gana el palo que salió
- **WHEN** salen el 5 de espadas, el rey de bastos y el 7 de espadas, sin triunfos
- **THEN** gana el 7 de espadas: es la carta más alta del palo que salió. El rey de bastos no sigue el palo, así que
  no gana

#### Scenario: Brisca en partida siempre con 4
- **WHEN** en la sala de Brisca hay 2 personas
- **THEN** se completa con 2 bots y se juega en parejas
- **AND** si hay 4 personas, no entran bots y una quinta recibe "sala llena"

#### Scenario: Fin de la partida
- **WHEN** ya se jugaron todas las cartas
- **THEN** se suman los puntos de cada quien o de cada pareja (120 en total) y gana quien junta más de 60

### Requirement: Conquián con baraja española
El sistema SHALL ofrecer Conquián para 2 jugadores, en individual contra un bot y en partida.

#### Scenario: Tomar una carta para bajar un juego
- **WHEN** a Sofy le ofrecen el 5 de oros y tiene en la mano el 3 y el 4 de oros
- **THEN** puede tomarla, bajar la escalera 3-4-5 de oros y después descartar una carta

#### Scenario: Juego inválido
- **WHEN** alguien intenta bajar 2 cartas, o una escalera de palos distintos
- **THEN** la jugada no se aplica y la página explica por qué

#### Scenario: Ganar
- **WHEN** un jugador junta 9 cartas bajadas
- **THEN** gana la partida

#### Scenario: Se acaba el mazo
- **WHEN** hay que voltear una carta y el mazo ya no tiene cartas
- **THEN** la partida termina en empate

### Requirement: Instrucciones de Brisca y Conquián
Cada juego SHALL tener "📖 Cómo se juega" con sus reglas, el valor de las cartas o los juegos válidos, y ejemplos.

#### Scenario: Consultar las reglas
- **WHEN** alguien abre la ayuda de Conquián
- **THEN** ve qué es un juego válido, cómo tomar o pasar una carta y cómo se gana

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
- **WHEN** un jugador elige el nivel 🦊 Intermedio y juega con blancas
- **THEN** el bot responde con jugadas legales
- **AND** si el jugador gana, suma 700 puntos

#### Scenario: Partida solo entre dos personas
- **WHEN** alguien crea una sala de ajedrez
- **THEN** no entran bots
- **AND** la sala admite 2 personas: el tercero recibe "sala llena"
- **AND** el anfitrión no puede empezar hasta que se une su rival

#### Scenario: Partida 1 vs 1 con reloj
- **WHEN** dos personas juegan en una sala con reloj de 10 min
- **THEN** ambas ven el mismo tablero y juegan por turnos
- **AND** si a una se le acaba el tiempo, pierde

#### Scenario: Cómo se juega
- **WHEN** alguien abre "📖 Cómo se juega"
- **THEN** ve cómo mueve cada pieza, las jugadas especiales y cómo se gana

### Requirement: Juegos de preguntas fusionados
El menú SHALL mostrar un solo juego por tema:
- 🧩 Completa y responde: frases para completar y preguntas en inglés;
- ✍️ Ortografía: letras, acentos, sinónimos y antónimos;
- 🧮 Cálculo y secuencias.

Los juegos absorbidos SHALL NOT poder crearse en partidas nuevas, y sus puntos anteriores SHALL conservarse.

#### Scenario: Completa y responde
- **WHEN** alguien juega Completa y responde
- **THEN** le salen tanto frases para completar como preguntas para responder en inglés

#### Scenario: Partida con un juego absorbido
- **WHEN** alguien intenta crear una partida de `es-acentos`
- **THEN** el servidor responde 400 `juego_no_permitido`

#### Scenario: Puntos anteriores
- **WHEN** alguien ya tenía puntos en Secuencias
- **THEN** esos puntos siguen contando en el ranking

### Requirement: Maratón con IA y tecnología
El Maratón de cultura SHALL incluir las categorías Inteligencia artificial y Tecnología, con preguntas en los tres
niveles.

#### Scenario: Elegir la categoría de IA
- **WHEN** alguien elige 🤖 Inteligencia artificial
- **THEN** recibe preguntas de IA que van de nivel fácil a difícil, cada una con su dato

### Requirement: Español de México en los juegos
Las instrucciones y los textos de los juegos SHALL usar español de México. Las palabras de España SHALL seguir
aceptándose como respuesta donde ya valían.

#### Scenario: Ayuda del póker
- **WHEN** alguien abre «📖 Cómo se juega» del póker
- **THEN** lee «se muestran las cartas» y «pozo», no «se enseñan» ni «bote»

### Requirement: Brisca explicada en español de México
La Brisca SHALL nombrar «ronda» a cada vuelta de cartas en todo lo que ve quien juega, y SHALL explicar la regla
del ganador sin la expresión «el palo que salió primero».

#### Scenario: Ayuda de la Brisca
- **WHEN** alguien abre «📖 Cómo se juega» de la Brisca
- **THEN** lee que gana la ronda el triunfo más alto o, sin triunfos, la carta más alta del mismo palo que la
  primera carta de la ronda

### Requirement: Basta con palabras de México a la vista
Los ejemplos y las respuestas de los bots de Basta SHALL salir solo de las palabras de México. Las palabras de
España de `soloAceptar` SHALL seguir valiendo como respuesta, pero SHALL NOT mostrarse.

#### Scenario: Escribir una palabra de España
- **WHEN** alguien escribe «gafas» en Cosa con la letra G
- **THEN** cuenta como válida, pero el juego nunca muestra «gafas» como ejemplo ni como respuesta de un bot

### Requirement: Volver a la partida al recargar
Al entrar a una partida multijugador, la página SHALL dejar el código en la URL (`?sala=CÓDIGO`, conservando los
demás parámetros) y SHALL guardar en el navegador la sala activa con su hora y el id del jugador, nunca el correo.
Al recargar o volver a abrir Juegos en menos de 3 h, la página SHALL regresar sola a esa sala, con su estado, sin
duplicar al jugador. Al salir de la sala o al terminar la partida, SHALL limpiar la URL y la sala guardada. Al
terminar, SHALL guardar solo una marca de revancha (código, hora e id del jugador) que vale 15 min, para ofrecer la
revancha si se recarga en el podio.

#### Scenario: Recargar a mitad de la partida
- **WHEN** una jugadora recarga la página mientras juega una partida de preguntas
- **THEN** vuelve a la misma sala, ve la pregunta en curso y sus respuestas anteriores, y la sala sigue con 2
  personas, no con 3

#### Scenario: Abrir Juegos sin el código en la URL
- **WHEN** alguien que estaba en una sala vigente abre `juegos.html` sin `?sala=`
- **THEN** la página reconecta a esa sala si el servidor confirma que sigue dentro; si no (403, 404 o 410), borra
  la sala guardada y muestra el inicio de Juegos sin error

#### Scenario: Otra persona en el mismo aparato
- **WHEN** quien abre Juegos no es el jugador que guardó la sala
- **THEN** la página no intenta entrar a esa sala

#### Scenario: Cerrar sesión
- **WHEN** alguien cierra sesión en cualquier página (portal, Inglés, Secundaria o Juegos)
- **THEN** se borran la sala guardada, la marca de revancha y la partida individual guardada, y al volver a entrar
  ve el inicio de Juegos

#### Scenario: Salir de la sala
- **WHEN** la jugadora sale con ✕ y recarga
- **THEN** ve el inicio de Juegos, la URL ya no trae `sala` y no vuelve a la sala

#### Scenario: Terminar la partida y recargar
- **WHEN** la jugadora llega al podio y recarga
- **THEN** la URL ya no trae `sala`, no vuelve a la sala y ve el inicio de Juegos con la oferta de revancha

#### Scenario: Volver a unirse en el servidor
- **WHEN** alguien que ya está en la sala vuelve a pedir unirse, aunque la partida ya empezó o la sala está llena
- **THEN** el servidor responde que sí, sin duplicarlo y sin borrar sus respuestas

#### Scenario: Basta por rondas tras recargar
- **WHEN** una jugadora recarga después de que cerraron rondas de Basta en las que ya envió palabras
- **THEN** esas palabras siguen en el servidor y la página no las reemplaza con un envío vacío

#### Scenario: Lotería tras recargar
- **WHEN** una jugadora recarga durante la Lotería en partida
- **THEN** ve marcadas las casillas que ya había marcado

### Requirement: Reanudar juegos individuales
Los juegos individuales que se reanudan SHALL guardar en el navegador su avance: los de preguntas (Vocabulario
contra reloj, Completa y responde, Ortografía, Maratón de cultura, Cálculo y secuencias) y el Sudoku guardan en el navegador una instantánea de la partida en curso
(puntos, aciertos, preguntas contestadas, vidas, tiempo que queda o tablero). Al volver a abrir Juegos en menos de
3 h, la página SHALL preguntar «¿Continuar tu partida de X?» y, si la persona acepta, SHALL seguir con el mismo
avance. La partida SHALL contar una sola vez en el ranking.

#### Scenario: Recargar un Sudoku a medias
- **WHEN** una jugadora llena casillas de un Sudoku, recarga y elige «Continuar»
- **THEN** ve el mismo tablero con sus casillas llenas, las mismas vidas, y puede terminarlo

#### Scenario: Recargar un juego de preguntas
- **WHEN** un jugador contesta preguntas de Cálculo y secuencias, recarga y elige «Continuar»
- **THEN** sigue con los mismos puntos y aciertos y con el tiempo que le quedaba

#### Scenario: Descartar la partida guardada
- **WHEN** la persona elige «No, ir a los juegos»
- **THEN** ve el inicio de Juegos y la partida guardada se borra

#### Scenario: Una sola vez en el ranking
- **WHEN** una partida reanudada termina
- **THEN** se registra un solo `POST /juegos/partida` y recargar después ya no ofrece continuarla

#### Scenario: Salir del juego
- **WHEN** la persona sale con ✕
- **THEN** la partida guardada se borra y recargar ya no ofrece continuarla

### Requirement: Aviso al recargar juegos que no se reanudan
Los demás juegos individuales SHALL pedir confirmación del navegador (`beforeunload`) si la persona intenta
recargar o salir con una partida en curso. Las pantallas de elegir nivel o modo, los juegos que se reanudan y los
juegos de Arcade (que guardan su avance en el servidor) SHALL NOT pedirla.

#### Scenario: Recargar un Memorama en curso
- **WHEN** alguien recarga a mitad de un Memorama
- **THEN** el navegador pide confirmar antes de salir

#### Scenario: Recargar un juego de Arcade
- **WHEN** alguien recarga mientras juega «Karts Turbo» en modo individual
- **THEN** el navegador no pide confirmar y, al volver a abrir el juego, continúa con su avance guardado

### Requirement: Sin «jalar para recargar» durante una partida
Mientras hay una partida en curso (individual o en sala), la página SHALL evitar el «jalar para recargar» del
celular con `overscroll-behavior-y: contain`.

#### Scenario: Partida en celular
- **WHEN** hay una partida en pantalla
- **THEN** `html` lleva `overscroll-behavior-y: contain`, y al volver al inicio de Juegos se quita

### Requirement: Jugadores registrados para el admin
Juegos SHALL mostrar al admin, dentro de «🛡️ Admin», la sub-sección «Jugadores» con todos los jugadores registrados
(alumnos, alumnas e invitados) y la sub-sección «Pendientes» con los registros pendientes de cuentas de acceso. Cada
pendiente SHALL tener un botón para generar su enlace de acceso a Juegos, que se puede copiar o mandar por WhatsApp.
Las dos sub-secciones SHALL poder descargarse en CSV. Nadie más SHALL ver estas sub-secciones ni los correos.

#### Scenario: Registro que no terminó
- **WHEN** alguien creó su cuenta pero no confirmó el correo
- **THEN** aparece en «Pendientes» como «sin confirmar» y el profe puede generar su enlace de acceso a Juegos

#### Scenario: Alumna sin permiso
- **WHEN** una alumna pide `/juegos/jugadores`
- **THEN** recibe 403 y no ve la pestaña

### Requirement: Registro en Juegos sin validar el correo
Quien no es alumno, alumna ni el profe SHALL poder registrarse o volver a entrar a Juegos con correo y nick, al
instante, sin contraseña, enlace ni código. Los correos de las clases SHALL entrar con su contraseña: si el
registro responde `correo_de_clase`, la misma pantalla SHALL pedir la contraseña.

#### Scenario: Invitado nuevo
- **WHEN** alguien escribe su nick, acepta el aviso y escribe un correo que no es de las clases
- **THEN** entra a Juegos con su nick sin revisar su correo

#### Scenario: Invitado que regresa
- **WHEN** un invitado ya registrado escribe su correo y su nick
- **THEN** entra a Juegos

#### Scenario: Correo de una alumna
- **WHEN** alguien escribe en Juegos el correo de una alumna
- **THEN** no se crea sesión y se le pide la contraseña de ese correo

### Requirement: Nick de jugador
Todo jugador de Juegos SHALL poder ponerse un nick de 2 a 20 letras o números desde «🎨 Tu avatar». El nick SHALL
mostrarse en lugar de su nombre en el chip, el ranking y las partidas. Si lo quita, SHALL volver a su nombre. El
admin SHALL ver el nombre real y el nick en la sub-sección «Jugadores» de «🛡️ Admin».

#### Scenario: Alumna con nick
- **WHEN** Marisol se pone el nick «Mari Star»
- **THEN** el ranking y su chip muestran «Mari Star», y el profe ve «Marisol» con el nick «Mari Star»

#### Scenario: Quitar el nick
- **WHEN** deja el nick vacío y guarda
- **THEN** vuelve a aparecer con su nombre

### Requirement: Menú de administración unificado en Juegos
Juegos SHALL mostrar al admin una sola pestaña «🛡️ Admin», además de 🎮 Juegos, 👥 Partidas y 🏆 Ranking, que junte
las sub-secciones Jugadores, Pendientes, Invitados y Fotos, cada una con su contador. Un buscador único SHALL filtrar
la sub-sección activa por nombre, nick o correo, sin importar mayúsculas ni acentos. Cada lista SHALL desplazarse
dentro de su propio marco y, en el celular, mostrarse como tarjetas sin desplazamiento horizontal. La sub-sección
elegida SHALL guardarse en el navegador como preferencia de interfaz, sin datos personales. Nadie más que el admin
SHALL ver la pestaña.

#### Scenario: Barra de 4 pestañas
- **WHEN** el admin abre Juegos
- **THEN** la barra muestra 🎮 Juegos, 👥 Partidas, 🏆 Ranking y 🛡️ Admin, y ya no hay pestañas sueltas de
  Jugadores, Invitados ni Fotos

#### Scenario: Contadores
- **WHEN** el admin abre «🛡️ Admin»
- **THEN** cada sub-sección muestra cuántos elementos tiene (jugadores registrados, registros pendientes, invitados y
  fotos)

#### Scenario: Buscar en la sub-sección activa
- **WHEN** el admin escribe «valeria» en el buscador con la sub-sección Jugadores abierta
- **THEN** solo queda visible Valeria y se indica cuántas coincidencias hay
- **WHEN** nada coincide
- **THEN** se muestra «Nada coincide» con un botón para limpiar la búsqueda

#### Scenario: Sub-sección recordada
- **WHEN** el admin elige «Invitados» y vuelve a abrir Juegos
- **THEN** «🛡️ Admin» abre en «Invitados» y en el navegador solo se guarda el nombre de la sub-sección

#### Scenario: Celular
- **WHEN** el admin abre cualquier sub-sección en una pantalla de 390 px de ancho
- **THEN** las filas se ven como tarjetas, la lista se desplaza dentro de su marco y la página no se desplaza de lado

#### Scenario: Una fuente falla
- **WHEN** `/juegos/invitados` responde con error y las otras rutas responden bien
- **THEN** «Invitados» muestra el error con «Reintentar» y las demás sub-secciones funcionan

#### Scenario: Alumna sin pestaña
- **WHEN** una alumna abre Juegos
- **THEN** no ve «🛡️ Admin» y el servidor le responde 403 en `/juegos/jugadores`, `/juegos/invitados` y
  `/juegos/fotos`

### Requirement: Diseño de la carta española
En Brisca y Conquián, cada carta española visible SHALL dibujarse como una carta real: marco con esquinas
redondeadas sobre fondo crema, color propio por palo (oros dorado, copas rojo, espadas azul y bastos verde), el número
en las dos esquinas y el palo dibujado (moneda, copa, espada o basto). La sota, el caballo y el rey SHALL mostrar una
figura estilizada con su nombre. Cada carta SHALL tener un nombre accesible con su nombre completo. El dibujo SHALL
hacerse con CSS y SVG en línea, sin imágenes externas.

#### Scenario: Carta con número y palo
- **WHEN** una alumna ve su mano en Brisca
- **THEN** cada carta muestra su número en la esquina superior y en la inferior, y el palo dibujado

#### Scenario: Figuras
- **WHEN** en la mano hay una sota, un caballo o un rey
- **THEN** la carta muestra la figura estilizada y su nombre (SOTA, CABALLO o REY)

#### Scenario: Nombre accesible
- **WHEN** un lector de pantalla llega al caballo de copas
- **THEN** la carta se anuncia como «Caballo de copas»

### Requirement: Dorso y mazo
Las cartas ocultas (mazo y cartas de los rivales) SHALL mostrarse con un dorso con patrón. El mazo SHALL verse como
una pila con el número de cartas que quedan.

#### Scenario: Dorso en el mazo y en los rivales
- **WHEN** empieza una Brisca o un Conquián
- **THEN** el mazo y las cartas de los rivales se ven por el dorso

### Requirement: Estados y tamaños de la carta
La carta SHALL tener tres tamaños (mano, mesa y miniatura) y los estados jugable (resalta al pasar o tocar),
seleccionada (sube), triunfo (marca discreta en Brisca) y deshabilitada.

#### Scenario: Selección en Conquián
- **WHEN** un alumno toca una carta de su mano en Conquián
- **THEN** la carta sube y queda marcada como seleccionada

#### Scenario: Cartas del triunfo
- **WHEN** en la mano de Brisca hay cartas del palo de triunfo
- **THEN** llevan una marca discreta de triunfo, sin cambiar las reglas

### Requirement: Mano sin desbordar
La mano SHALL caber en una sola fila sin desbordar el ancho de la pantalla, encimando las cartas en abanico cuando no
quepan, en celular (390 px) y en escritorio.

#### Scenario: Conquián en celular
- **WHEN** un alumno juega Conquián con 8 o 9 cartas en un celular de 390 px
- **THEN** todas las cartas de la mano quedan dentro de la pantalla, en una sola fila, y se ve el número de cada una

### Requirement: Animación al jugar una carta
Cuando una carta llega a la mesa, SHALL aparecer con una animación sutil, una sola vez (no al volver a pintar la
sala). Con `prefers-reduced-motion: reduce` SHALL aparecer sin animación.

#### Scenario: Movimiento reducido
- **WHEN** el aparato pide movimiento reducido
- **THEN** las cartas aparecen en la mesa sin animación

### Requirement: Revancha con los mismos jugadores
Al terminar una partida multijugador, el podio SHALL ofrecer «🔁 Otra con los mismos» a cada jugador o jugadora de
la sala. El primero que lo toque SHALL abrir una sala nueva del mismo juego, con las mismas opciones, los mismos
bots y esa persona como anfitriona; la sala vieja SHALL guardar el código nuevo (`siguiente`) con escritura
condicional para que solo exista una sala nueva. Si varias personas lo tocan a la vez, SHALL caer todas en la misma
sala nueva. Los demás SHALL ver en su podio «🔁 {Nombre} abrió la revancha» y SHALL poder unirse con un toque. Solo
los jugadores de la sala SHALL poder pedirla y solo cuando la partida haya terminado. Aplica a todos los juegos de
sala.

#### Scenario: Abrir la revancha
- **WHEN** Marisol toca «Otra con los mismos» en el podio de una partida de Maratón de cultura con bots y categoría
  «todas»
- **THEN** entra a la sala de espera de una sala nueva de Maratón de cultura, con categoría «todas», con bots y con
  ella como anfitriona
- **AND** la sala vieja guarda el código nuevo

#### Scenario: Dos personas a la vez
- **WHEN** Marisol y Angel tocan «Otra con los mismos» casi al mismo tiempo
- **THEN** los dos quedan en la misma sala nueva y solo se crea una

#### Scenario: Unirse desde el aviso
- **WHEN** Marisol ya abrió la revancha y Jesús sigue viendo el podio
- **THEN** Jesús ve «🔁 Marisol abrió la revancha» con «Unirme» y, al tocarlo, entra a la misma sala nueva

#### Scenario: Recargar en el podio
- **WHEN** Laura recarga la página en el podio
- **THEN** el inicio de Juegos le ofrece la revancha de esa partida y puede unirse a la misma sala nueva

#### Scenario: Alguien que no jugó
- **WHEN** una persona que no está en la sala pide la revancha
- **THEN** el servidor responde 403 y no crea nada

#### Scenario: Partida sin terminar
- **WHEN** un jugador pide la revancha antes de que nadie haya llegado al podio
- **THEN** el servidor responde 409 `no_termino`

#### Scenario: La revancha ya empezó
- **WHEN** alguien pide unirse a la revancha después de que la anfitriona la empezó
- **THEN** el servidor responde 409 `ya_empezo` y la página muestra «La revancha ya empezó»

#### Scenario: Sala vencida o inexistente
- **WHEN** se pide la revancha de una sala que venció (3 h) o que no existe
- **THEN** el servidor responde 410 o 404

### Requirement: Contenido de inglés por tema
`juegos/datos/ingles.json` SHALL traer contenido de lo visto en clase, nivel A1 y en español de México, sin
nombres de alumnos ni alumnas reales:
- `verbos` con al menos 40 frases por cada tema de tiempo: `to be`, `to be pasado`, `presente simple`,
  `pasado simple` y `futuro will`;
- `oraciones` y `preguntas` con ejemplos de esos tiempos;
- `tiempos` con al menos 40 oraciones que se pueden poner en presente, pasado y futuro.

Cada elemento SHALL llevar `tema` y su traducción `es`. Cada frase de `verbos` SHALL llevar su `regla` corta.

#### Scenario: Forma válida
- **WHEN** corre la prueba de datos de `ingles.json`
- **THEN** cada elemento tiene un tema válido para su clave y su traducción
- **AND** `correcta` está dentro del rango de opciones y las opciones no se repiten
- **AND** cada tema de tiempo tiene al menos 40 frases en `verbos`

### Requirement: Selector de tema en los juegos de gramática
🧩 Completa y responde (`en-frases`) y 🔀 Ordena la oración (`en-ordena`) SHALL dejar elegir el tema antes de
jugar: Todo · To be · Presente · Pasado · Futuro (will). Con un tema elegido, SHALL salir solo contenido de ese
tema. Al crear una partida de `en-frases`, el tema SHALL ir en las opciones de la sala (`opciones.tema`); el
servidor SHALL aceptar `todo`, `tobe`, `presente`, `pasado` y `futuro` (por omisión `todo`) y responder 400
`tema_invalido` con otro valor.

#### Scenario: Elegir Pasado en solitario
- **WHEN** una alumna abre Completa y responde y elige «Pasado»
- **THEN** solo le salen frases y preguntas en pasado (was / were o pasado simple)

#### Scenario: Partida con tema
- **WHEN** alguien crea una partida de Completa y responde con el tema «Futuro (will)»
- **THEN** la sala guarda `opciones.tema = futuro`
- **AND** las 10 preguntas de la partida son de futuro con will

#### Scenario: Revancha con el mismo tema
- **WHEN** termina una partida de Completa y responde con tema «Pasado» y alguien pide «🔁 Otra con los mismos»
- **THEN** la sala nueva conserva `opciones.tema = pasado`

#### Scenario: Tema inválido
- **WHEN** alguien crea una partida de `en-frases` con `opciones.tema = "marciano"`
- **THEN** el servidor responde 400 `tema_invalido`

### Requirement: Máquina del tiempo
El catálogo SHALL incluir ⏳ Máquina del tiempo (`en-tiempos`) en Inglés, en solitario y en partida (con bots y
amigos), con tope de 2,000 puntos por partida individual.
- Cada oración se juega en dos pasos: elegir si está en pasado, presente o futuro, y luego elegir cómo queda en el
  tiempo que se pide (por ejemplo «She plays soccer.» → pasado → «She played soccer.»).
- En solitario dura 90 s contra reloj con racha, como Completa y responde.
- Cada error SHALL mostrar una explicación breve, y al final SHALL mostrarse lo que más falló.
- En partida SHALL usar las mismas 10 preguntas sincronizadas, puntos, podio y guardado que Completa y responde.

#### Scenario: Jugar en solitario
- **WHEN** un alumno juega la Máquina del tiempo y se equivoca al pasar «He goes to the park.» a pasado
- **THEN** ve la regla («Pasado irregular: go → went») sin que el juego se detenga
- **AND** al terminar ve sus puntos y «Lo que más se te complicó»

#### Scenario: Partida con bots
- **WHEN** alguien crea una partida de Máquina del tiempo con bots y la empieza
- **THEN** todos ven las mismas 10 preguntas y al final el podio con humanos y bots
- **AND** sus puntos se guardan en sus puntos de partidas

### Requirement: Regla corta al fallar en gramática
Cada error en los juegos de gramática de inglés (Completa y responde, Ordena la oración y Máquina del tiempo) SHALL
mostrar la regla corta que aplica (por ejemplo «Con he / she / it el verbo lleva -s»), en solitario y en la
revelación de la partida, sin alargar las pausas del juego.

#### Scenario: Error de tercera persona
- **WHEN** en «She ___ milk every day.» alguien elige «drink»
- **THEN** ve la frase correcta y la regla «Con he / she / it el verbo lleva -s»

### Requirement: Ranking de los juegos más jugados
El sistema SHALL exponer `GET /juegos/ranking/juegos?semana=<lunes>` (por omisión, la semana actual) con los juegos
del catálogo que tuvieron al menos 1 jugador en la semana: `{ pos, id, titulo, jugadores, partidas, mejor }`.
`jugadores` SHALL ser el número de personas distintas que jugaron ese juego (individual o en sala) y `partidas` el
número de partidas. Los bots SHALL NOT contar como jugadores. El orden SHALL ser por jugadores, de mayor a menor, con
desempate por partidas y luego por título. `mejor` SHALL traer el nombre visible (nick o nombre de pila) y los puntos
de la mejor partida, nunca correos. El agregado SHALL calcularse una vez por carga de la semana en caché y no leer los
archivos de la semana en cada petición. En 🏆 Ranking, la página SHALL mostrarlo en la sub-pestaña «🔥 Juegos», con el
encabezado «Semana del … al …», 🥇🥈🥉 para el top 3, emoji y nombre del juego, «N jugadores · M partidas», una barra
proporcional al líder y «👑 Mejor puntaje: {nick} · N puntos» (separador de miles; «1 punto» en singular). SHALL mostrar solo el top 10 y, si hay más juegos, el botón
«Ver los N juegos» para desplegar el resto (y «Ver solo el top 10» para plegarlo). SHALL verse bien en un celular de
390 px.

#### Scenario: Orden por jugadores distintos
- **WHEN** en la semana Angel, Jesus y Laura juegan Sopa de letras, y Angel juega Ordena la oración 3 veces y Jesus 1
- **THEN** Sopa de letras aparece primero con «3 jugadores · 3 partidas» y Ordena la oración después con
  «2 jugadores · 4 partidas»

#### Scenario: Desempate por partidas
- **WHEN** dos juegos tienen 2 jugadores cada uno, uno con 4 partidas y otro con 2
- **THEN** el de 4 partidas va antes

#### Scenario: Sala con bots
- **WHEN** Jesus y Laura juegan Conquián en una sala completada con bots
- **THEN** Conquián cuenta 2 jugadores y 2 partidas; los bots no cuentan

#### Scenario: Semana sin juegos
- **WHEN** nadie ha jugado en la semana
- **THEN** la ruta responde `juegos: []` y la página dice «Todavía nadie juega esta semana. ¡Estrena un juego!»

#### Scenario: Sin registro o semana inválida
- **WHEN** pide el top un correo que no está registrado, o `?semana=` no es una fecha
- **THEN** responde 403 `no_registrado` o 400 `semana_invalida`

#### Scenario: Una sola lectura por carga
- **WHEN** se pide el top dos veces dentro de la vigencia de la caché de la semana
- **THEN** la segunda petición no vuelve a leer los archivos de la semana, y una partida nueva sí la refresca

#### Scenario: Top 10
- **WHEN** en la semana se jugaron 22 juegos
- **THEN** la pestaña muestra los primeros 10 y el botón «Ver los 22 juegos»; al tocarlo aparecen los 22

#### Scenario: Puntos del mejor puntaje
- **WHEN** la mejor partida de Sopa de letras en la semana es de Gabo con 1250 puntos
- **THEN** la fila dice «👑 Mejor puntaje: Gabo · 1,250 puntos»

### Requirement: Progreso individual de juegos en el servidor
El sistema SHALL exponer `GET /juegos/progreso/<juego>` y `PUT /juegos/progreso/<juego>` para los juegos con
avance (`plataformas`, `karts` y `dragon-run`), guardados en `juegos/progreso/<juego>/<id-jugador>.json` como
`{ v, datos, actualizado }`, sin correos.
- Cada jugador SHALL leer y escribir solo su propio progreso (el id sale de la sesión); no hay forma de leer el de
  otra persona, tampoco para el admin.
- `GET` responde `{ juego, v, datos, actualizado }`, con `v = 0` y `datos = null` si aún no hay avance.
- `PUT { v, datos }` SHALL escribir solo si `v` es la versión guardada (escritura condicional) y responde
  `{ ok: true, v: v + 1 }`. Si no coincide, SHALL responder 409 `version_vieja` con la versión y los datos actuales.
- SHALL validar el tamaño (≤ 4096 bytes, si no 413 `progreso_grande`) y la forma exacta de `datos` según el juego
  (400 `progreso_invalido`). Un juego sin avance responde 400 `juego_sin_progreso`; otro método, 405.
- Para `dragon-run`, la forma exacta es `{ totales, mejorRacha, dias, diaria, cumplidas, premios, equipo }`, con
  enteros en rango, fechas reales `AAAA-MM-DD`, premios conocidos sin repetir y un equipo (color y estela)
  desbloqueado.

#### Scenario: Primer guardado y lectura
- **WHEN** Marisol guarda `{ v: 0, datos }` de plataformas y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos

#### Scenario: Pestaña vieja
- **WHEN** una pestaña con `v: 1` intenta guardar después de que otra ya guardó la versión 2
- **THEN** responde 409 `version_vieja` con `v: 2` y el avance guardado, sin pisarlo

#### Scenario: Forma inválida o demasiado grande
- **WHEN** alguien manda `vidas: 500`, una llave desconocida o una pieza que no desbloqueó
- **THEN** responde 400 `progreso_invalido` y no cambia nada
- **WHEN** manda un avance de más de 4096 bytes
- **THEN** responde 413 `progreso_grande`

#### Scenario: Cada quien su progreso
- **WHEN** Angel pide el progreso de plataformas después de que Marisol guardó el suyo
- **THEN** recibe `v: 0` y `datos: null`

#### Scenario: Sin registro
- **WHEN** un correo que no es alumno, alumna, admin ni invitado pide su progreso
- **THEN** responde 403 `no_registrado`

#### Scenario: Avance de Dragon Run
- **WHEN** Marisol guarda un avance de `dragon-run` con forma válida y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos
- **WHEN** manda una fecha inexistente, `mejorRacha: 5000`, un premio desconocido o el color `dorado` sin haberlo
  desbloqueado
- **THEN** responde 400 `progreso_invalido` y no cambia nada

### Requirement: Plataformas 2D
Juegos SHALL ofrecer en Arcade el juego **«Axo y los 12 mundos»** (`plataformas`), con un personaje original y arte
propio:
- un mapa de mundos con estructura para 12, de los cuales al menos 4 SHALL ser jugables con físicas distintas:
  Pradera Verde (base), Desierto Árido (viento cruzado), Tundra de Hielo (poca fricción) y Volcán Activo (plataformas
  que caen y lava); los demás se ven como «Próximamente»;
- 3 niveles por mundo; el tercero termina con un jefe sencillo; superar un nivel desbloquea el siguiente;
- monedas (100 dan una vida extra), champiñón (aguanta un golpe), chile de fuego (lanza bolas de fuego), enemigos
  que patrullan, checkpoint a media pantalla e invulnerabilidad de 1.5 s tras recibir daño;
- en modo individual, el avance (mundo y nivel desbloqueados, niveles completados, monedas, vidas, power-up y
  checkpoint del nivel en curso) SHALL guardarse en el servidor y, al volver, el jugador SHALL continuar donde iba;
- cada nivel superado SHALL sumar sus puntos a los ⭐ individuales (tope 2000 por partida).

#### Scenario: Superar un nivel
- **WHEN** Sofy termina el nivel 1-1 con 12 monedas en 40 s
- **THEN** ve «¡Nivel superado!», sus puntos se suman a sus ⭐ individuales y el 1-2 queda desbloqueado

#### Scenario: Continuar después de recargar
- **WHEN** Sofy recarga Juegos y vuelve a abrir el juego
- **THEN** el mapa muestra el 1-1 completado, el 1-2 desbloqueado y sus mismas monedas, vidas y power-up

#### Scenario: Daño con champiñón
- **WHEN** Axo, grande por el champiñón, toca a un enemigo
- **THEN** vuelve a su tamaño base, no pierde vida y durante 1.5 s no recibe más daño

#### Scenario: Cien monedas
- **WHEN** junta la moneda número 100
- **THEN** gana una vida y su contador de monedas vuelve a empezar

### Requirement: Karts
Juegos SHALL ofrecer en Arcade el juego **«Karts Turbo»** (`karts`), de carreras con vista cenital:
- al menos 4 pistas y 8 corredores (la persona y 7 bots);
- derrape con mini-turbo de 3 niveles (azul, naranja, morado), turbo de salida si se acelera con buen tiempo,
  monedas (hasta 10, suben la velocidad punta) e ítems que dependen de la posición (quien va más atrás recibe
  mejores);
- una copa de 4 carreras con puntos por lugar (15, 12, 10, 8, 6, 4, 2, 1), además de carrera rápida y un taller
  con piezas que se desbloquean;
- bots cuya dificultad se ajusta de forma acotada a cómo le va a la persona, sin trampas exageradas;
- en modo individual SHALL guardarse en el servidor la copa en curso, las copas ganadas, los mejores tiempos por
  pista y las piezas; cada carrera terminada SHALL sumar sus puntos a los ⭐ individuales (tope 2000).

#### Scenario: Carrera de copa
- **WHEN** Angel termina la primera carrera de la Copa Fiesta en 3.er lugar
- **THEN** ve la tabla de la copa con sus 10 puntos y sus ⭐ individuales suben

#### Scenario: Continuar la copa
- **WHEN** recarga después de la primera carrera y vuelve a abrir Karts Turbo
- **THEN** puede continuar la copa en la carrera 2 de 4 con los mismos puntos

#### Scenario: Mini-turbo morado
- **WHEN** mantiene un derrape girando más de 2.1 s y lo suelta
- **THEN** recibe el turbo morado, el más largo

### Requirement: Carreras de Arcade en partida
Las partidas (salas) SHALL permitir `plataformas` y `karts` como reto sin guardar avance:
- todos SHALL jugar el mismo nivel o pista, guardado en `sala.opciones.mapa` (lo elige quien crea la sala o el
  servidor al azar; 400 `mapa_invalido` si no existe), y la carrera empieza a la hora de inicio del servidor;
- cada persona SHALL enviar su tiempo con `POST /juegos/sala/<código>/respuesta { carrera: { ms, monedas } }`
  (`ms: null` si no terminó); solo cuenta el primero; el servidor SHALL rechazar con 400 `carrera_invalida` un
  tiempo fuera del mínimo y el límite del juego o que no cuadre con su reloj;
- BOT-VACHIRA y BOT-ISAGII, si la sala tiene bots, SHALL tener tiempos simulados creíbles, iguales en todos los
  dispositivos (semilla);
- el podio SHALL ordenarse por tiempo cuando todas las personas terminaron o al vencer el límite, y los puntos por
  lugar se guardan como partida de sala; el progreso individual SHALL NOT cambiar.

#### Scenario: Podio con bots
- **WHEN** Marisol termina la carrera de su sala con bots en 20 s
- **THEN** ve el podio con su tiempo y los de BOT-VACHIRA y BOT-ISAGII, y sus puntos se suman a 👥 partidas

#### Scenario: Tiempo imposible
- **WHEN** alguien envía `ms: 5000` cuando la carrera empezó hace 60 s
- **THEN** responde 400 `carrera_invalida`

#### Scenario: Revancha con el mismo mapa
- **WHEN** termina una carrera de karts en «Lago Helado» y alguien toca «Otra con los mismos»
- **THEN** la sala nueva usa la misma pista

#### Scenario: La partida no guarda progreso
- **WHEN** alguien juega Karts Turbo en una sala
- **THEN** su progreso individual de karts no cambia

### Requirement: Calidad de los juegos de Arcade
Los juegos de Arcade SHALL correr con paso fijo a 60 cuadros por segundo, SHALL pausarse solos al ocultar la
pestaña, SHALL tener sonido opcional (🔊/🔇, recordado) y controles táctiles grandes además del teclado, SHALL
evitar destellos fuertes y SHALL respetar `prefers-reduced-motion` (sin sacudidas de cámara y con menos partículas).

#### Scenario: Pestaña oculta
- **WHEN** la persona cambia de pestaña a mitad de un nivel individual
- **THEN** el juego queda en pausa y el tiempo del nivel no corre (en una sala el reloj del servidor sigue)

#### Scenario: Celular
- **WHEN** alguien juega en un celular de 390 px de ancho
- **THEN** ve el juego completo y botones grandes para moverse, saltar o derrapar

### Requirement: Diseño visual de Axo y los 12 mundos
«Axo y los 12 mundos» SHALL verse pulido sin cambiar sus reglas, su física, sus puntos ni el formato del progreso
guardado, con arte propio dibujado en canvas o SVG (sin imágenes externas ni personajes o marcas registradas):
- Axo SHALL ser un ajolote con branquias, ojos, sonrisa y cola, con animaciones de caminar, saltar, caer, daño y
  victoria; con champiñón SHALL verse más grande y con chile de fuego SHALL cambiar de tono; durante la
  invulnerabilidad SHALL verse translúcido sin parpadeo fuerte;
- cada mundo jugable SHALL tener un fondo con paralaje de 2 a 3 capas (pradera: colinas y nubes; desierto: dunas y
  sol; hielo: montañas nevadas y auroras; volcán: humo y brillo de lava) y los castillos su propio escenario;
- los tiles SHALL tener borde, sombra y textura; las monedas SHALL girar; los enemigos y el jefe SHALL tener cara y
  detalles propios de cada mundo;
- SHALL haber partículas ligeras: polvo al aterrizar, chispas al tomar monedas y nieve o ceniza según el mundo;
- el mapa de mundos SHALL mostrar un camino ilustrado con un nodo por nivel y el castillo del jefe, candados en los
  mundos «Próximamente» y el progreso guardado (niveles superados, nivel que sigue y avance de los 12 mundos);
- el HUD y los botones táctiles SHALL ser legibles y no SHALL tapar el nivel en un celular vertical de 390×844;
- las capas estáticas SHALL pre-dibujarse fuera de pantalla para sostener 60 cuadros por segundo, y con
  `prefers-reduced-motion` el juego SHALL quitar el paralaje y las partículas.

#### Scenario: Axo con poderes
- **WHEN** Sofy toma un champiñón y después un chile de fuego
- **THEN** Axo se ve más grande y luego cambia de tono, y al recibir un golpe queda translúcido 1.5 s sin parpadear

#### Scenario: Fondo de cada mundo
- **WHEN** Angel juega el nivel 3-1
- **THEN** ve montañas nevadas y auroras que se mueven a distinta velocidad que el piso, y cae nieve

#### Scenario: Mapa con avance
- **WHEN** Marisol, con el 1-1 y el 1-2 superados, abre el mapa
- **THEN** ve el camino de la Pradera con el 1-1 y el 1-2 marcados como superados, a Axo junto al castillo 1-3 y
  candados en los mundos 5 a 12

#### Scenario: Celular vertical
- **WHEN** alguien juega en un celular de 390×844
- **THEN** el HUD queda sobre el cielo, fuera del área del nivel, y los botones táctiles quedan debajo del juego

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** el fondo no hace paralaje y no hay partículas de ambiente, polvo ni chispas

### Requirement: Misiones de Dragon Run
Dragon Run SHALL tener misiones y premios cosméticos sin valor real, guardados con el progreso individual
(`/juegos/progreso/dragon-run`):
- **Misiones diarias:** 3 al día, elegidas de una bolsa fija (recorrer metros, juntar monedas, esquivar obstáculos
  seguidos, llegar al castillo, dobles saltos, número de carreras y monedas en una sola carrera). SHALL ser las mismas
  para la misma fecha (día en la Ciudad de México) y el mismo jugador, en cualquier dispositivo, y cambiar al día
  siguiente.
- **Logros permanentes** con niveles 🥉 bronce, 🥈 plata y 🥇 oro: Explorador (metros totales), Coleccionista
  (monedas totales), Esquivador (obstáculos esquivados seguidos en una carrera), Conquistador (castillos) y
  Constante (días seguidos jugando).
- **Premios cosméticos:** colores del dragón y estelas que se desbloquean con logros y misiones. SHALL cambiar solo
  la apariencia: no dan puntos, vidas ni ventajas, y no se canjean.
- Antes de correr SHALL mostrarse la pantalla de misiones (misiones del día con su avance, logros con su medalla y
  premios para elegir; los bloqueados dicen cómo conseguirlos). Al cumplir una misión SHALL aparecer el aviso
  «¡Misión cumplida!», y el resultado final SHALL repetir las misiones y logros cumplidos en esa carrera.
- Los puntos del ranking SHALL seguir las reglas de siempre (metros + monedas × 10 + bono, tope 2000).
- La pantalla SHALL leerse completa en un celular de 390 px y respetar `prefers-reduced-motion` (sin sacudidas,
  menos partículas, aviso sin animación).

#### Scenario: Mismas misiones en otro celular
- **WHEN** Sofy abre Dragon Run en su celular y luego en la computadora el mismo día
- **THEN** ve las mismas 3 misiones con el mismo avance

#### Scenario: Cumplir una misión diaria
- **WHEN** la misión del día es «Junta 50 monedas» y Sofy junta la moneda 50 durante una carrera
- **THEN** aparece «¡Misión cumplida!», el resultado lo repite y, al volver a la pantalla de misiones, la misión
  sale como cumplida ✅

#### Scenario: Subir de nivel un logro y estrenar un color
- **WHEN** Angel suma 1,000 m en total
- **THEN** obtiene Explorador 🥉, se desbloquea el color azul y puede elegirlo antes de correr

#### Scenario: Racha de días
- **WHEN** Marisol juega el lunes, el martes y el miércoles
- **THEN** su racha de días es 3 y obtiene Constante 🥉; si no juega el jueves, el viernes la racha vuelve a 1

#### Scenario: El avance se recupera
- **WHEN** Sofy cumple una misión, elige el dragón azul y recarga la página
- **THEN** la misión sigue cumplida y su dragón sigue azul

#### Scenario: Sin conexión al cargar
- **WHEN** no se pudo leer el avance
- **THEN** puede jugar igual, ve un aviso y el avance se guarda cuando vuelve la conexión

