# juegos Specification

## Purpose
Plataforma de Juegos (`juegos.html` y `/juegos/…`): catálogo, puntajes y ranking semanal por tipo, invitados, avatares, partidas multijugador (también en tiempo real) y cada juego individual o de sala. Origen: juegos-plataforma y cambios posteriores.
## Requirements
### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Español, Maratón de cultura, Mente ágil y Clásicos
(desde juegos-clasicos).
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

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
Juegos SHALL ofrecer el juego individual **Dragon Run** en Mente ágil:
- un dragón corre y salta (con doble salto) para esquivar obstáculos y juntar monedas, con 3 vidas, hasta un
  castillo a 600 m;
- al terminar, los puntos (metros + monedas × 10, más 200 si llega al castillo) SHALL sumarse a los ⭐ individuales
  de la semana.

#### Scenario: Jugar y sumar
- **WHEN** Sofy juega Dragon Run y pierde sus 3 vidas a los 250 m con 12 monedas
- **THEN** ve su resultado con 370 puntos, que se suman a sus ⭐ individuales

#### Scenario: Llegar al castillo
- **WHEN** llega a los 600 m
- **THEN** gana el bono de 200 y el resultado dice "¡Llegaste al castillo!"

#### Scenario: Doble salto
- **WHEN** salta y vuelve a presionar en el aire
- **THEN** el dragón da un segundo salto, pero no un tercero

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
duplicar al jugador. Al salir de la sala o al terminar la partida, SHALL limpiar la URL y la sala guardada.

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
- **THEN** se borran la sala guardada y la partida individual guardada, y al volver a entrar ve el inicio de Juegos

#### Scenario: Salir de la sala
- **WHEN** la jugadora sale con ✕ y recarga
- **THEN** ve el inicio de Juegos, la URL ya no trae `sala` y no vuelve a la sala

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
recargar o salir con una partida en curso. Las pantallas de elegir nivel o modo y los juegos que se reanudan SHALL
NOT pedirla.

#### Scenario: Recargar un Memorama en curso
- **WHEN** alguien recarga a mitad de un Memorama
- **THEN** el navegador pide confirmar antes de salir

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
Quien no es alumno, alumna ni el profe SHALL poder crear su cuenta de Juegos con correo y apodo y entrar a jugar al
instante, sin abrir ningún enlace ni escribir un código. Los correos de las clases SHALL seguir entrando con su
enlace.

#### Scenario: Invitado nuevo
- **WHEN** alguien elige su apodo, acepta el aviso y escribe un correo que no es de las clases
- **THEN** entra a Juegos con su apodo sin revisar su correo

#### Scenario: Correo de una alumna
- **WHEN** alguien escribe en el registro el correo de una alumna
- **THEN** no se crea sesión y se le pide entrar con el enlace que llega a ese correo

### Requirement: Código de acceso de 8 dígitos
La pantalla del código SHALL aceptar códigos de 6 a 8 dígitos, porque Supabase manda códigos de 8.

#### Scenario: Código de 8 dígitos
- **WHEN** alguien escribe el código de 8 dígitos de su correo
- **THEN** puede enviarlo y entra

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

