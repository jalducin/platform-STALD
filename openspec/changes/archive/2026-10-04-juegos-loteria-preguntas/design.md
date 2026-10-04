## Decisiones

### 1. "Responde en inglés"
- **Solitario:** usa el motor `quiz` en modo reloj de 90 s.
  - Grande: la pregunta en inglés. Abajo: "💬" y la traducción.
  - Opciones mezcladas.
  - Al fallar se muestra la respuesta correcta.
- **Partida:** `preguntasPartida` toma 10 preguntas con la semilla, como los demás juegos de preguntas.

### 2. Lotería en partida (cliente, determinista)
- **Orden de las cartas:** `barajar(0..53, rngDe(seed, 'orden'))`. La carta `k` sale en
  `inicio + k·4.5 s`.
- **Tablas:** la de cada jugador sale de `tomar(0..53, 16, rngDe(seed, 'tabla|' + id))`. Los bots usan su
  propio id.
- **Grito humano:**
  - solo se habilita si las marcas locales cumplen el modo, y las marcas solo pueden estar en cartas que
    ya salieron;
  - se envía `{ loteria: true }` y el servidor guarda la hora (`loteria`) una sola vez;
  - un grito es válido si la tabla de ese jugador cumple el modo con las cartas cantadas hasta esa hora.
    Todos los clientes lo calculan igual.
- **Grito de bot:** se calcula el primer `k` en que su tabla cumple el modo; grita en
  `inicio + k·4.5 s + 1.5 s`.
- **Ganador:** el grito válido más temprano, humano o bot. Cuando llega esa hora, todos ven el final.
  Si salen las 54 cartas sin ganador, termina 3 s después.
- **Puntos:**
  - quien gana: Línea 300, Tabla llena 500, más 10 × las cartas que faltaban por salir; tope 1000;
  - los demás: 10 × sus casillas ya cantadas.

  Se calculan igual en todos los clientes; cada quien envía su total a `/juegos/partida` y su `final` a
  la sala.
- **Voz:** cada dispositivo elige Español, Inglés o Bilingüe en la pantalla de juego, bilingüe por
  defecto. Es una preferencia local y no se guarda.

### 3. Servidor
- `JUEGOS_PARTIDA` agrega `en-preguntas` y `loteria`.
- `opciones.modo` acepta solo `linea` o `llena`; el valor por defecto es `linea`.
- `respuesta` con `loteria: true` guarda `loteria = ahora` si no existía; no requiere `q` ni `palabras`.

### 4. Bots
- `BOTS = [{ id: 'bot-vachira', nombre: 'BOT-VACHIRA', acierto: 0.6 }, { id: 'bot-isagii', nombre: 'BOT-ISAGII', acierto: 0.45 }]`.
- El prefijo `bot-` se conserva para distinguirlos.
