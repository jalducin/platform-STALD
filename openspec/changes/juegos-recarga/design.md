## Contexto
`juegos.html` es una página de scripts clásicos. Cada juego individual es una función (`jugarX`) que guarda su
estado en variables locales de un closure y se dibuja dentro de `marco(id)`. Al terminar llama a
`terminar(id, r)`, que hace un solo `POST /juegos/partida`. Las salas (`entrarSala`) reconstruyen todo a partir del
estado del servidor (`GET /juegos/sala/<código>`), salvo detalles locales: el formulario de la ronda de Basta y las
casillas de Lotería.

## Decisiones

### 1. Salas: la URL y una clave local
- **URL.** `entrarSala` hace `history.replaceState` a la URL actual con `sala=CÓDIGO` (se arma con `URL` y
  `searchParams`, así se conservan `api` y los demás parámetros). Al recargar, el arranque que ya existe
  (`SALA_URL` → `salaPendiente` → `unirseCodigo`) vuelve a entrar: `unirse` responde `{ ok: true }` a quien ya
  está dentro y la página abre la sala.
- **Clave `juegos_sala_activa`** = `{ codigo, quien, t, marcas? }`. `quien` es `state.jugador.id`, un id opaco y
  no el correo. `t` es la hora de entrada. Sirve cuando la URL se perdió, por ejemplo al abrir Juegos desde el
  portal o desde el acceso directo. Al cargar sin `?sala=`: si `t` tiene menos de 3 h (la vigencia de las salas)
  y `quien` es el jugador actual, se pide `GET /juegos/sala/<código>`. Si responde bien, se entra; si no (403,
  404 o 410), se borra la clave sin avisar y se muestra el inicio de Juegos. No se usa `unirse` con la clave:
  así nunca se agrega a alguien que no estaba en la sala.
- **Limpieza.** `olvidarSala()` borra la clave y quita `sala` de la URL. Se llama en `pantallaHub`, que es el
  destino de ✕, de «Otros juegos», de cambiar de pestaña y de los errores al entrar; en `pantallaAvatar`; y en
  `pintarFinalSala`, cuando la partida termina.
- **Servidor.** No cambia. Volver a unirse no duplica: `if (dentro) return { ok: true }` va antes de las
  revisiones de «ya empezó» y «llena». `guardarJugador` conserva respuestas y jugadas. El registro en el ranking
  de una sala es único (`ya_guardada`). Una prueba unitaria nueva fija este comportamiento.
- **Estado local que hay que cuidar al volver:**
  - *Preguntas:* `pintarPreguntaSala` ya toma la respuesta del servidor (`respuestas[q]`). No se cambia.
  - *Basta por rondas:* `bastaEnviado` empieza vacío. Sin cuidado, al recargar se mandarían `{}` para las rondas
    ya cerradas y se borrarían en el servidor las palabras ya guardadas. Ahora no se reenvía una ronda que el
    servidor ya tiene (`rondasBasta[r]` del jugador). Lo que se estaba escribiendo en la ronda abierta se pierde:
    es el costo aceptado.
  - *Lotería:* las marcas se guardan en `juegos_sala_activa.marcas` al marcar y se restauran en `loteriaSala()`.
  - *Juegos por turnos* (¡Una!, póker, Brisca, Conquián, ajedrez): se reconstruyen con la semilla y las jugadas
    del servidor. No se cambian.

### 2. Juegos individuales: reanudar o avisar
Se registra un «juego en curso» (`enCurso = { id, foto? }`) en `marco(id)`. Las pantallas de elegir nivel o modo
llaman a `marco(id, { menu: true })` y no cuentan como partida. Un juego que sabe reanudarse define
`enCurso.foto()`: una función que devuelve su instantánea serializable.

- **Instantánea** en `localStorage.juegos_partida_individual` = `{ juego, quien, t, ...foto }`. Se guarda después
  de cada respuesta y en `pagehide` o al ocultar la pestaña (`visibilitychange`). Caduca a las **3 h** y solo vale
  para el mismo `quien`.
- **Al cargar**, después de la sesión y antes del inicio de Juegos (y después de la sala, que tiene prioridad), si
  hay una instantánea vigente se muestra «¿Continuar tu partida de X?» con los puntos y aciertos que lleva. Hay
  dos botones: «▶️ Continuar» y «No, ir a los juegos», que la descarta.
- **Una sola vez en el ranking.** `limpiar()`, que corre en `terminar`, en `pantallaHub` y al empezar otro juego,
  borra la instantánea y el juego en curso *antes* del `POST /juegos/partida`. Una recarga posterior ya no tiene
  nada que reanudar.

| Juego | Comportamiento | Por qué |
|---|---|---|
| Vocabulario contra reloj, Completa y responde, Ortografía, Cálculo y secuencias | **Reanuda** | Usan el motor `quiz`. Su avance son contadores (`puntos`, `aciertos`, `total`, `racha`) y los segundos que quedan; la siguiente pregunta se genera otra vez. Un solo cambio en `quiz` cubre a todos. |
| Maratón de cultura | **Reanuda** | Motor `quiz` en modo vidas; además guarda `vidas` y la categoría elegida. La pregunta `n` sale del mismo nivel (el orden es por nivel). |
| Sudoku | **Reanuda** | El tablero es un arreglo de 81 números: `puzzle`, `sol`, `g`, `errores`, segundos jugados y nivel. |
| Spelling bee, Memorama, Ordena la oración (dos), Simón dice, Sopa de letras, Dragon Run (iframe), Basta individual, ¡Una!, Lotería, Póker, Brisca, Conquián y Ajedrez contra bots | **Solo avisa** (`beforeunload`) | El estado vive en closures con mazos, bots, temporizadores o un iframe. Serializarlo exige reescribir cada juego, y el riesgo de errores es alto para un beneficio pequeño (partidas cortas). |

- Al reanudar un juego con reloj, el reloj sigue con los segundos que quedaban (se «pausa» durante la recarga). La
  pregunta en pantalla al recargar se cambia por una nueva, así que pausar no da ventaja.
- La instantánea es del navegador y podría editarse, pero los puntos ya los calcula el cliente y el servidor
  aplica sus topes por juego. No hay un riesgo nuevo.

### 3. «Jalar para recargar» en celular
Mientras hay una partida (individual o sala), `html` lleva la clase `jugando` con
`overscroll-behavior-y: contain` en `html` y `body`. Se pone en `marco` y `entrarSala` y se quita en `limpiar` y
`pantallaHub`.

## Alternativas descartadas
- **`sessionStorage`**: sobrevive a la recarga, pero no a cerrar la pestaña ni a abrir Juegos desde el portal.
- **Guardar el estado individual en el servidor**: más peticiones y cambios de contrato para algo que es del
  dispositivo.
- **Reanudar todos los juegos**: ver la tabla; el costo no se justifica.
- **Reconectar con `unirse` desde la clave local**: podría agregar a otra persona que use el mismo aparato. Por eso
  la clave guarda `quien` y la reconexión usa `GET`.

## Riesgos
- Si el aparato no tiene `localStorage` (navegación privada estricta), todo se envuelve en `try/catch` y el
  comportamiento es el de antes. La URL sigue sirviendo para las salas.
- `beforeunload` solo muestra el diálogo si hubo un gesto del usuario, que siempre existe al jugar.
