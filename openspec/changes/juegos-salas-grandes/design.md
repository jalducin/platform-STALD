## Contexto

- Las salas (`server/salas.ts`) sincronizan por reloj del servidor (`inicio`); cada jugador escribe solo su archivo
  (`juegos/salas/<código>/<id>.json`) y los bots y la mesa se reproducen en el cliente con la semilla
  (`rngDe(seed, etiqueta)` = `mulberry32(fnv(seed|etiqueta))`).
- Precedentes que se reutilizan: el cantor y la tabla de la Lotería (`L_CANTO` = 4.5 s), las jugadas por pasos del
  póker (`jugadas[n]`, `turno_tomado`, `FICHA_POKER`), las carreras de Arcade (tiempo validado contra el reloj del
  servidor), el podio y la revancha de `pintarFinalSala`, y `sala.opciones` (que la revancha hereda).
- Otros dos agentes tocan en paralelo `juegos.html`, `server/salas.ts` y `server/juegos.ts`: todo lo nuevo vive en
  archivos propios y los ganchos son líneas sueltas marcadas `// juegos-salas-grandes`.

## Decisiones

### 1. Archivos
- `server/salas_grandes.ts`: reglas del servidor de los 5 juegos (opciones, empezar, jugadas, respuestas y la vista
  de Dibuja). `server/salas.ts` solo llama a sus funciones en 6 puntos (opciones al crear, cupo y bots, empezar,
  validar jugada, respuesta y GET) y quita `secreto` junto con `canal` en `sinCanal`.
- Cliente: `juegos/bingo.js`, `juegos/blackjack.js`, `juegos/dibuja.js` y `juegos/memo-sopa-sala.js`. Cada uno trae
  su lógica pura (sin DOM, usable desde Deno), sus pantallas y su CSS (se inyecta una vez). Se registran en
  `globalThis.SALAS_GRANDES[juego] = { preparar, pintar, clic, participantes?, opcionesHtml?, opciones?, nota? }`.
- `juegos.html` agrega: 4 `<script>`, 3 tarjetas, 5 ids en `JUEGOS_PARTIDA` y `TIEMPO_REAL`, y una línea en
  `entrarSala` (contenido), `participantes`, `pintarSala`, el clic de la sala, `crearPartida`, el cambio de juego del
  formulario y `ayuda`.

### 2. Bingo
- Canto: `orden(seed)` = barajar 1–75 con `rng(seed, 'bingo-orden')`. El número k (1…75) sale en
  `inicio + (k − 1)·4500 ms`; cantados a la hora t = `min(75, ⌊(t − inicio) / 4500⌋ + 1)` (0 antes de empezar). El
  ritmo **no** se acelera con `__TIEMPO_JUEGOS` en sala, porque lo valida el servidor.
- Cartón: `carton(seed, id)` con `rng(seed, 'bingo-carton|' + id)`: por columna B(1–15), I(16–30), N(31–45),
  G(46–60), O(61–75) se baraja el rango y se toman 5 (4 en la N); casilla 12 = 0 (libre).
- Figuras (`sala.opciones.figura`): `linea` (5 filas, 5 columnas o 2 diagonales), `esquinas` (0, 4, 20, 24) y
  `lleno` (las 25). La libre siempre cuenta.
- `POST respuesta { bingo: true }`: el servidor calcula los cantados a su hora y revisa la figura del cartón del
  jugador. Válido → guarda `bingo: { t, n }` (solo el primero). Falso → 409 `bingo_falso` y suma `bingoFalsos`.
  No se valida contra lo que la persona marcó: marcar es ayuda visual; lo que cuenta es lo cantado.
- Bots: gritan 1.5 s después de completar (como en la Lotería). Gana el grito válido más temprano (personas por su
  `bingo.t`, bots por su hora calculada). La paridad cliente/servidor (`orden`, `carton`, `cumple`) se prueba en
  Deno importando `juegos/bingo.js`.
- Puntos: quien gana 300 (línea), 400 (esquinas) o 600 (lleno) + 5 por cada número que faltaba cantar (tope 1000);
  los demás, 10 por cada número de su cartón que salió.

### 3. Blackjack
- Motor en `juegos/blackjack.js` (`Blackjack.nueva / mano / actuar / opciones / bot / auto / puntos`), con las cartas
  de `juegos/cartas.js` (ids 0–51; dos barajas por mano, barajadas con `rng(seed, 'bj-mano-' + m)` en sala).
- Mano: apuestas en orden de asiento (múltiplos de 5, de 5 a las fichas que tengas) → reparto (2 y 2 a la banca, una
  boca abajo) → turnos (`pedir`, `plantarse`, `doblar` con 2 cartas y fichas suficientes; 21 o pasarse cierra el
  turno) → la banca pide mientras tenga menos de 17 → pagos (gana ×2, empate devuelve, blackjack natural paga
  `apuesta + ⌊apuesta·1.5/5⌋·5`). Si la banca tiene blackjack natural se paga de inmediato. 8 manos y 500 fichas;
  termina antes si nadie tiene 5 fichas.
- Sala: igual que el póker: cada jugada lleva su paso `n` y todos reproducen la mesa; bots a 1.5 s y turno de 30 s
  (al vencer: apuesta mínima o plantarse). El servidor valida `accion ∈ {apostar, pedir, plantarse, doblar}` y que
  `apostar` traiga `monto` entero, múltiplo de 5 y ≥ 5; las demás acciones no llevan monto. Cupo 6 personas; los bots
  completan hasta 6 asientos. Sin bots y con una sola persona → 409 `faltan_jugadores` al empezar.
- Puntos: tus fichas finales (tope 1000).

### 4. Dibuja y adivina
- Solo personas (sin bots), de 3 a 12: cupo 12 y `empezar` con menos de 3 → 409 `faltan_jugadores`.
- **Secreto**: al empezar, el servidor guarda `sala.secreto` (hex aleatorio). `sinCanal` lo quita de toda respuesta
  y de la publicación de Realtime. La palabra del turno i es `PALABRAS[perm(secreto)[i]]`, con `PALABRAS` = el
  vocabulario de `juegos/datos/ingles.json` (importado en el servidor como JSON) de una o dos palabras en minúsculas.
- **Turnos**: cada persona dibuja una vez, en orden de llegada. Calendario determinista (servidor y cliente):
  turno i empieza en `ini`, dibuja hasta `ini + 60 s`; termina antes si todas las demás personas ya adivinaron;
  después hay 5 s de pausa (se revela la palabra) y empieza el siguiente. Sin reloj acelerado.
- **Trazo**: `respuesta { trazo: { turno, nuevos: [{ c, g, p }], borrar? } }` solo de quien dibuja en su turno.
  `c` color 0–7, `g` grosor 1–3, `p` = [x, y, …] enteros 0–255 (2 a 64 puntos). Máximo 6 trazos por envío, 200
  trazos y 8000 números por turno (413 `dibujo_lleno`) y un envío cada 300 ms (429 `muy_rapido`). El cliente
  simplifica (descarta puntos a menos de 3 unidades y muestrea a 64) y envía en lotes cada 600 ms. Se guarda en
  `dibujo: { turno, trazos, t }` del archivo de quien dibuja; Realtime lo publica tras cada cambio.
- **Adivinar**: `respuesta { adivina: { turno, texto } }`. El servidor compara normalizado (minúsculas, sin acentos,
  solo letras y espacios; acepta con o sin «s» final). Acierto → `aciertos[turno] = { t, pts }` con
  `pts = 100 + 100·(1 − transcurrido/60 s)`; responde `{ correcta: true, pts }`. Fallo → guarda el texto en
  `intentos` (los últimos 20) y responde `{ correcta: false }`; si el texto contiene la palabra se guarda sin texto
  (`casi`) para no revelarla. Quien dibuja no puede adivinar; un acierto repetido → 409 `ya_adivinaste`; turno
  cerrado → 409 `turno_cerrado`; un intento cada 700 ms (429 `muy_rapido`).
- **GET**: agrega `dibuja: { turno, fase, letras, palabra?, reveladas }`: `palabra` (con `es` y `emoji`) solo para
  quien dibuja en ese turno; `reveladas` trae las palabras de los turnos ya terminados.
- Puntos: adivinar 100–200 por turno; quien dibuja, 50 por cada acierto.
- Práctica individual: el emoji de la palabra se aclara (pixelado de 4 a 48) en 20 s; se escribe en inglés; 5
  palabras, hasta 200 puntos cada una.

### 5. Memorama y Sopa de letras en sala
- Mismo tablero para todos: 8 pares (Memorama) o sopa de 10×10 con hasta 6 palabras (Sopa), generados con
  `rng(seed, 'memo')` / `rng(seed, 'sopa')` a partir de `juegos/datos/ingles.json`. Límite de 180 s.
- `respuesta { resultado }`, validado como las carreras (no más de 3 s adelante ni 20 s atrás del reloj del
  servidor):
  - Memorama: `{ ms, errores, pares, fin: true }` una sola vez; `ms` (8 s–180 s) solo con los 8 pares; `ms: null`
    si no terminó.
  - Sopa: `{ ms, encontradas, fin }` cada vez que encuentra una palabra (avance que ven todos) y al final; el avance
    no baja; `fin` con todas trae `ms`; tras el `fin`, se ignora lo demás.
- Opción `sala.opciones.gana` del Memorama: `tiempo` (por omisión; desempata errores) o `errores` (desempata
  tiempo). Sopa: más palabras y luego menos tiempo.
- Bots con resultados creíbles por semilla. Podio cuando todas las personas terminan o se vence el límite (+5 s).
- Puntos por lugar: 600, 480, 400, 340, 290, 250, 220, 200, 180, 160 y luego 150; sin terminar, Memorama da 30 por
  par y Sopa 60 por palabra.

### 6. Catálogo y ranking
- `CATALOGO`: `bingo` («Bingo», clásicos, 1000), `blackjack` («Blackjack (21)», clásicos, 1000) y `dibuja` («Dibuja
  y adivina», inglés, 1000). `en-memorama` y `mente-sopa` ya estaban. Menú: 27 juegos en 6 categorías.

## Riesgos y alternativas

- **Escrituras por trazo**: cada lote es una escritura del archivo de quien dibuja (como mucho ~2 por segundo). Se
  consideró que el navegador publicara el trazo directo al canal de Realtime, pero exigiría dar permiso de envío a
  la llave pública y sin respaldo; se prefirió reutilizar la publicación del servidor y el sondeo.
- **Bots y reproducción local**: como en el póker, alguien con conocimientos podría reproducir la semilla y saber la
  carta oculta de la banca. Las fichas no tienen valor y los puntos tienen tope; se acepta igual que en el póker.
- **Palabra de Dibuja**: depende solo de `sala.secreto`, que nunca sale del servidor; ni el cuerpo de la sala, ni los
  archivos de jugadores, ni Realtime la contienen.
