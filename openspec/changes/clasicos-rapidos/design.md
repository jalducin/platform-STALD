## Contexto

- Las salas (`server/salas.ts`) sincronizan por el reloj del servidor (`inicio`). Cada jugador escribe solo su archivo
  y los juegos por turnos guardan `jugadas[]` con un paso `n` único en la sala (`turno_tomado`) y la hora `t` del
  servidor. Cada cliente **reproduce** la partida desde la semilla y las jugadas: los bots y las jugadas automáticas
  por tiempo salen de la semilla, así todos ven lo mismo (`¡Una!`, póker, ajedrez).
- El cierre usa `pintarFinalSala` (envía `final`, el `podio` del anfitrión y `POST /juegos/partida` con `sala`), que
  además ofrece la revancha («🔁 Otra con los mismos»).
- Otros agentes trabajan en paralelo en `juegos.html`, `server/salas.ts` y `server/juegos.ts`: los cambios ahí deben
  ser pequeños, localizados y marcados con `// clasicos-rapidos`.

## Decisiones

### 1. Tres archivos propios y ganchos mínimos
- `juegos/clasicos-rapidos.js` (global `ClasicosRapidos`, sin DOM): reglas, bots y la **reproducción de cada sala**
  (`salaGato`, `salaConecta4`, `salaPpt`, `salaAhorcado`, `salaSerpientes`). Recibe `{ orden, jugadas, inicio, ahora,
  dur, rng }` y devuelve el estado. Lo prueban `server/clasicos_rapidos_motor_test.ts` (Deno) y la E2E.
- `juegos/clasicos-rapidos-ui.js` (global `ClasicosRapidosUI`): pantallas individuales, dibujo de cada sala, clics y
  ayudas. Se carga **antes** del script principal (como `ajedrez.js`) y usa sus funciones (`marco`, `terminar`,
  `sala`, `pintarFinalSala`, `post`, `rngDe`…) solo dentro de funciones, al jugar.
- `juegos/clasicos-rapidos.css`: estilos de los 5 juegos, con `prefers-reduced-motion`.
- Ganchos en `juegos.html`: 3 etiquetas (`<link>` y 2 `<script>`), las 5 tarjetas del menú, los ids de partida y de
  tiempo real, una línea en `pintarSala`, las opciones al crear, el texto de «faltan jugadores» y las ayudas.
  Los clics de los juegos nuevos usan atributos propios (`data-cr-*`) con un oyente propio en `document`.

### 2. Servidor: `server/clasicos_rapidos.ts`
- `CLASICOS_RAPIDOS`, `CATALOGO_CLASICOS_RAPIDOS` (títulos para el ranking 🔥 Juegos; categoría `clasicos`,
  tope 1000), cupos, bots fijos y mínimo de personas, validación de jugadas, opciones y ocultamiento.
- Jugadas válidas (además de `n` entero 0–2000; cualquier otro campo se descarta):

  | Juego | Jugada |
  |---|---|
  | `gato` | `{ n, accion: "marcar", casilla: 0–8 }` |
  | `conecta4` | `{ n, accion: "soltar", col: 0–6 }` |
  | `ppt` | `{ n: ronda 0–4, accion: "elegir", eleccion: "piedra" \| "papel" \| "tijera" }` o `{ n, accion: "pasar" }` |
  | `ahorcado` | `{ n, accion: "letra", letra: a–z }` o `{ n, accion: "pasar" }` |
  | `serpientes` | `{ n, accion: "tirar" }` (el dado sale de la semilla y del paso: nadie lo elige) |

- En `ppt` el paso `n` es la **ronda** y todos juegan la misma ronda: no aplica `turno_tomado`, y solo cuenta la
  primera elección de cada quien por ronda.
- Cupos y bots: `gato` y `conecta4` = 2 personas, sin bots, no empiezan con menos de 2 (409 `faltan_jugadores`);
  `ppt` y `ahorcado` = 8; `serpientes` = 4.
- `ahorcado` acepta `opciones.modo` = `coop` | `compite` (por omisión `compite`); otro valor → 400 `modo_invalido`.
  La revancha copia las opciones.
- **Elección simultánea sin espiar** (`ppt`): al responder `GET /juegos/sala/<código>`, la `eleccion` de otra persona
  en la ronda `r` se cambia por `"?"` si quien pregunta no tiene jugada en `r` y la ronda no está completa (todas las
  personas tienen jugada en `r`). Lo publicado en Realtime oculta toda ronda incompleta. Como cada elección es
  inmutable (primera por ronda), el cliente recuerda las que ya vio y nunca las vuelve a ocultar.

### 3. Reproducción de cada sala (cliente, determinista)
- Turnos (`gato`, `conecta4`, `ahorcado`, `serpientes`): igual que ajedrez y ¡Una!. Se espera la jugada del paso
  actual de quien tiene el turno con `t ≤ T0 + turno`; una jugada inválida se ignora (avanza el paso); si vence el
  tiempo, hay jugada automática a la hora límite: casilla o columna al azar con la semilla, «pasar» en Ahorcado y
  tirar el dado en Serpientes. Los bots juegan a `T0 + ritmo del bot`.
- **Gato:** 3 rondas; quien crea juega con ❌ y quien se une con ⭕; empieza ❌ y luego alterna; turno 20 s; 3 s entre
  rondas. Puntos: 300 por ronda ganada y 120 por empate.
- **Conecta 4:** 1 partida; 🔴 (quien crea) empieza; turno 25 s. Puntos: gana 800, empate 400, pierde 100.
- **Piedra, papel o tijera:** 5 rondas de 12 s para elegir y 4 s de revelación. Una ronda cierra cuando todas las
  personas eligieron o al vencer el tiempo; la siguiente empieza al terminar la revelación. Cada quien se compara con
  todas las demás elecciones: +1 victoria por cada rival vencido; no elegir pierde contra cualquier elección. Los bots
  eligen con la semilla. Puntos: `round(800 × victorias / (5 × rivales))` más 200 para quien (o quienes) tenga más
  victorias. Mínimo 2 participantes: si una persona juega sola, entran los 2 bots.
- **Ahorcado:** 3 palabras iguales para todos (semilla) del vocabulario de `ingles.json` (solo letras, 3–10), con
  pista en español y emoji; 6 errores por palabra (el globo se desinfla). Turnos de 20 s; +10 por cada aparición de
  la letra acertada para quien la eligió. `compite`: quien acierta sigue; quien completa la palabra gana +50.
  `coop`: el turno siempre rota y, si adivinan la palabra, +50 para todas y todos. Bots: letras por frecuencia en
  inglés con algo de azar.
- **Serpientes y escaleras:** tablero clásico de 100 casillas (9 escaleras y 10 serpientes); el dado de cada paso sale
  de la semilla; con 6 se vuelve a tirar; se llega a la meta aunque sobren puntos. De 2 a 4: las personas (hasta 4)
  más bots hasta 4 si se piden; si queda una sola persona, entra un bot. Turno 15 s, bots 1.4 s, máximo 240 tiros
  (gana quien vaya más adelante). Puntos: gana 700; los demás, casilla × 4.

### 4. Individual
- Gato: serie de 3 contra «Michi 🐱» (❌ tú, alternando quién empieza). Puntos por ronda ganada 100/200/300 y por
  empate 30/80/150 según el nivel (fácil/medio/difícil).
- Conecta 4: 1 partida contra «Cuatrito 🤖» (tú 🔴 empiezas). Gana 300/600/1000, empate 150/250/400, pierde 50.
  Bot: fácil = gana o bloquea si puede, si no al azar con preferencia al centro; medio = minimax a 4; difícil = 6.
- Piedra, papel o tijera: al mejor de 5 (gana quien llega a 3; los empates no cuentan, máximo 15 tiros) contra
  «Tito 🤖», que elige antes de ver tu jugada (patrón simple con azar). Puntos: 100 por tiro ganado y 300 si ganas.
- Ahorcado: 5 palabras; +10 por letra acertada, +50 por palabra y +10 por cada error que sobró.
- Serpientes: contra 1, 2 o 3 bots. Mismos puntos que en partida.
- Todos terminan con `terminar(id, …)` (pantalla de resultado y `POST /juegos/partida` individual con tope 1000).

### 5. Diseño visual
- Arte en CSS y SVG propio (fichas, globo, tablero, escaleras, serpientes y dado). Animaciones suaves: trazo de ❌⭕,
  caída de la ficha de Conecta 4, «¡Piedra, papel o tijera… ya!», globo que se desinfla, dado que rueda y ficha que
  avanza. Con `prefers-reduced-motion` no hay animaciones.
- Todo cabe a 390 px: tableros con `min(…, 100%)` y botones grandes (≥ 44 px).
- Textos en español de México y con lenguaje inclusivo.

## Alternativas consideradas
- **Validar la legalidad en el servidor** (reproducir cada partida en Deno): más seguro, pero duplica las reglas en
  TypeScript o acopla el servidor a `juegos/`. Se mantiene el patrón vigente (el servidor valida forma y turno; el
  cliente ignora jugadas ilegales), y las reglas se prueban en Deno sobre el mismo archivo que usa la página.
- **Torneo por eliminación en Piedra, papel o tijera:** con 2–8 jugadores deja a la mitad mirando; todos contra todos
  mantiene a todo el grupo jugando las 5 rondas.
- **Compromiso criptográfico para la elección simultánea:** innecesario para el contexto escolar; ocultar en el
  servidor hasta que cada quien elige basta.

## Riesgos
- Conflictos de merge con los otros agentes: ganchos de una línea y bloques propios.
- Una ronda de Piedra, papel o tijera puede cerrar antes en un cliente cuando llega una elección tardía (el calendario
  se recalcula, como en Basta): solo adelanta la revelación.
