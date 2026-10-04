## Decisiones

### 1. Motor (`juegos/ajedrez.js`, define `globalThis.Ajedrez`)
- El tablero es un arreglo 0x88 (128 casillas). Las piezas son letras: mayúsculas para blancas y minúsculas para
  negras.
- El estado es inmutable: `{ t, turno, enroques, ep, medio, num, claves }`. `aplicar(st, m)` regresa un estado nuevo,
  así que sirve igual para repetir la partida y para la búsqueda del bot.
- Funciones del motor:
  - `desdeFEN` y `aFEN`;
  - `legales(st)`: genera las jugadas posibles y descarta las que dejan al rey propio atacado;
  - `atacada(st, sq, color)`;
  - `enJaque`.
- `resultado(st)` regresa uno de estos valores:
  - `null` mientras la partida sigue;
  - `{ fin: 'mate', gana }`;
  - `{ fin: 'ahogado' | '50' | 'repeticion' | 'material' }`.
- `san(st, m)`: notación en español con desambiguación por columna y luego por fila. La coronación se escribe
  `e8=D`.
- `buscarJugada(st, de, a, promo)`: encuentra la jugada legal; si no existe, regresa `null`.
- `bot(st, nivel, rng)`:
  - nivel 1: con 35 % de azar hace una jugada al azar; si no, la mejor a 1 jugada;
  - nivel 2: negamax con poda alfa-beta a 2 jugadas;
  - nivel 3: igual, a 3 jugadas, más búsqueda de capturas en quietud (hasta 4 capturas);
  - ordena las jugadas así: coronaciones y capturas primero (víctima valiosa con atacante barato);
  - evalúa con material (P 100, C 320, A 330, T 500, D 900) y tablas de posición sencillas;
  - los empates se rompen con `rng`.

### 2. Página
- El tablero es un CSS grid de 8×8 en `aspect-ratio: 1`, de hasta 480 px:
  - todas las piezas son glifos sólidos ♚♛♜♝♞♟ con `U+FE0E`, para que no se vean como emoji;
  - las blancas van con relleno claro y contorno; las negras, con relleno oscuro.
- Al tocar una pieza propia se marcan sus destinos y al tocar el destino se mueve. Si la jugada es coronación, se
  elige la pieza (D, T, A o C).
- `ajTableroHtml(st, o)` se comparte entre el modo individual y la sala.
- Individual:
  - `elegirAjedrez` → `jugarAjedrez(nivel, color)`;
  - el bot piensa en `setTimeout` para no congelar la animación.
- Sala (`estadoAjedrez`):
  - colores: el participante 0 juega con blancas y el 1 con negras;
  - cada jugada humana se aplica solo si es legal y llega antes de que se acabe el reloj de quien juega;
  - el tiempo usado es `mv.t - T0`;
  - si se acaba el reloj, pierde por tiempo;
  - el bot de la sala juega a los 1.5 s, nivel 2, y su jugada se guarda en caché por `paso` y `FEN`.

### 3. Servidor
- `validarJugada("ajedrez")` acepta:
  - `accion: 'mover'` con `de` y `a` de `/^[a-h][1-8]$/` y `promo` opcional en `q`, `r`, `b` o `n`;
  - `accion: 'rendirse'`.
- `opciones.reloj` puede ser `5`, `10` o `15`; por omisión es `10`.
- Catálogo: `ajedrez` en la categoría `mente`, máx. 1000.

## Pruebas
- Perft (cuenta de jugadas legales a cierta profundidad), con los valores conocidos de estas posiciones:
  - posición inicial: 20, 400 y 8902;
  - Kiwipete: 48 y 2039;
  - posición 3: 14, 191 y 2812;
  - posición 4: 6, 264 y 9467;
  - posición 5: 44 y 1486.
- Reglas:
  - mate del pastor y mate del tonto;
  - ahogado;
  - captura al paso;
  - no se enroca a través de casillas en jaque;
  - coronación;
  - triple repetición;
  - material insuficiente;
  - SAN (`Cf3`, `O-O`, `exd5`, `e8=D+`, `Dh4#`).
- Bot:
  - siempre hace jugadas legales;
  - encuentra el mate en 1 (niveles 2 y 3);
  - captura la dama colgada;
  - 20 partidas bot contra bot que terminan.
- Servidor: la sala de ajedrez con su reloj, y jugadas válidas e inválidas.
- E2E:
  - individual: ayuda, mover pieza, respuesta del bot, rendirse y guardar;
  - partida 1 vs 1 con dos navegadores: mismo tablero, turnos, mate del tonto y el mismo final en los dos.
