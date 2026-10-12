## MODIFIED Requirements

### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Cultura y Conocimiento (desde cultura-conocimiento, que
junta las antiguas secciones Español y Maratón de cultura), Mente ágil, Clásicos (desde juegos-clasicos) y Arcade
(desde juegos-plataformas-karts), cada uno con su ícono y su descripción.
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos; los de Arcade muestran el resultado de cada nivel o carrera dentro del juego.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

#### Scenario: Categoría Arcade
- **WHEN** un alumno abre el inicio de Juegos
- **THEN** ve la categoría «🕹️ Arcade» con «Axo y los 12 mundos» y «Karts Turbo», con su ícono y su descripción

#### Scenario: Sección Cultura y Conocimiento
- **WHEN** una alumna abre el inicio de Juegos
- **THEN** ve una sola sección «🧠 Cultura y Conocimiento» con Maratón de cultura, Línea del tiempo, Ortografía y
  Ordena la oración
- **AND** ya no ve las secciones «📝 Español» ni «🧠 Maratón de cultura»

#### Scenario: Los puntos anteriores siguen contando
- **WHEN** un alumno ya tenía su mejor puntaje de la semana en Ortografía
- **THEN** lo sigue viendo en la tarjeta de Ortografía, ahora dentro de Cultura y Conocimiento

## ADDED Requirements

### Requirement: Cultura y Conocimiento con más contenido
El Maratón de cultura SHALL tener al menos 768 preguntas, en 14 categorías con al menos 50 preguntas cada una y al
menos 10 por nivel: Historia de México, Cultura general de México, Historia universal, Geografía, Capitales,
Banderas, Ciencias, Naturaleza y animales, Cuerpo humano, Arte y literatura, Matemáticas básicas, Tecnología,
Inteligencia artificial y Deportes.
- Cada pregunta SHALL tener 4 opciones distintas, una correcta y un dato breve.
- El dato SHALL mostrarse al responder, tanto al acertar como al fallar.
- El contenido SHALL ser de nivel secundaria y verificable, sin fechas dudosas ni temas polémicos.
- `server/cultura_datos_test.ts` SHALL validar la forma, las categorías, los mínimos y el dato de cada pregunta.

#### Scenario: Categorías nuevas
- **WHEN** alguien abre el Maratón de cultura
- **THEN** puede elegir, además de las de siempre, Matemáticas básicas, Deportes, Naturaleza y animales, y Cultura
  general de México

#### Scenario: Dato al acertar
- **WHEN** una alumna acierta una pregunta del Maratón
- **THEN** ve sus puntos y el dato 💡 de esa pregunta antes de pasar a la siguiente

#### Scenario: Datos inválidos
- **WHEN** una pregunta tiene opciones repetidas, `correcta` fuera de rango o el dato vacío
- **THEN** la prueba de datos falla

### Requirement: Línea del tiempo
El juego «📜 Línea del tiempo» (`cultura-linea`) SHALL pedir ordenar de 4 a 6 sucesos o inventos del más antiguo al
más reciente.
- Antes de jugar se elige el tema: todos, historia de México, historia universal, inventos o ciencia.
- Las tarjetas se colocan en la línea tocándolas o arrastrándolas. Al confirmar, cada suceso SHALL mostrar su año,
  si quedó bien o mal, y un dato curioso.
- La partida individual tiene 3 vidas y 45 s por línea, con racha y puntos según el design; termina sin vidas o tras
  10 líneas. Los puntos se guardan con el tope del catálogo (3,000).
- El contenido SHALL vivir en la clave `linea` de `juegos/datos/cultura.json`: sets de 6 a 8 sucesos de un tema, cada
  uno con año entero, texto y dato, sin años repetidos dentro de un set.
- SHALL verse bien a 390 px y respetar `prefers-reduced-motion`.

#### Scenario: Línea perfecta
- **WHEN** un alumno coloca los 4 sucesos en orden y confirma
- **THEN** ve los años, un ✔ en cada suceso, los puntos con su racha y el dato de cada suceso

#### Scenario: Línea con errores
- **WHEN** una alumna confirma una línea con dos sucesos fuera de lugar
- **THEN** pierde una vida, la racha vuelve a 0 y ve el orden correcto con los años

#### Scenario: Sin vidas
- **WHEN** alguien falla tres líneas
- **THEN** la partida termina y sus puntos se guardan en sus individuales

#### Scenario: Se acaba el tiempo
- **WHEN** pasan 45 s sin confirmar
- **THEN** se califica lo que estaba colocado y las casillas vacías cuentan como error

### Requirement: Línea del tiempo en partida
En una partida de Línea del tiempo, todos SHALL ordenar las mismas 5 líneas (4, 5, 5, 6 y 6 sucesos), generadas con
la semilla de la sala, con 40 s por línea y 8 s de revelación.
- Cada línea vale 20 por suceso en su lugar y, si es perfecta, hasta 80 más por rapidez (máximo 200).
- El podio SHALL ordenar por puntos, luego por sucesos acertados y luego por menor tiempo, y SHALL ofrecer la revancha.
- El servidor SHALL aceptar `cultura-linea` en `JUEGOS_PARTIDA` y validar la respuesta: `q` de 0 a 4, `aciertos`
  entero de 0 a 6 y `ms` hasta 60,000; recorta `puntos` a `20 × aciertos + 80` si la línea es perfecta o a
  `20 × aciertos` si no. Otro valor → 400 `respuesta_invalida`.
- `opciones.cat` es el tema; un tema que no existe → 400 `tema_invalido`.
- La mesa es `{ max: 30, min: 1 }`, con los bots aparte.

#### Scenario: Misma línea para todos
- **WHEN** dos jugadores están en la misma partida de Línea del tiempo
- **THEN** ven los mismos sucesos, en el mismo orden inicial, al mismo tiempo

#### Scenario: Respuesta con aciertos de más
- **WHEN** alguien envía 200 puntos con 2 aciertos en una línea que no es perfecta
- **THEN** el servidor guarda 40 puntos

#### Scenario: Línea fuera de rango
- **WHEN** alguien envía la respuesta de la línea 5 (la sexta) o sin `aciertos`
- **THEN** el servidor responde 400 `respuesta_invalida`

#### Scenario: Podio y revancha
- **WHEN** termina la partida con bots
- **THEN** se ve el podio con personas y bots, y el botón «🔁 Otra con los mismos»
