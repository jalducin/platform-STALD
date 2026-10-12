## Contexto

Los juegos por turnos en sala (`una`, `poker`, `brisca`, `conquian` y `ajedrez`) funcionan así:
- el servidor guarda cada jugada `{ n, accion, … }` del jugador que la hizo y valida solo su forma (`validarJugada`);
- cada navegador reconstruye la partida en orden de `n` con la semilla de la sala;
- los bots se calculan en el cliente;
- los turnos tienen un tiempo límite y, si se vence, juega el bot por la persona.

Ese modelo sirve para Damas, Dominó y Parchís, que no tienen información oculta que importe: en Dominó las manos
salen de la semilla, igual que en Brisca o en póker.

Batalla naval es distinta: si la flota saliera de la semilla o viajara en el estado de la sala, cualquiera podría
verla. Por eso en Batalla naval el servidor es la fuente de verdad: guarda la flota de cada quien y valida y
resuelve cada disparo.

## Decisiones

### Archivos

- `juegos/tablero.js` es el motor sin DOM. Expone `globalThis.Tablero = { Damas, Domino, Parchis, Naval, rng }`.
  Lo cargan `juegos.html` y las pruebas de Deno (`server/tablero_test.ts`), como `ajedrez.js` y `cartas.js`.
  Cada estado es JSON puro (clonable) y el azar entra por parámetro o por la semilla.
- `juegos/tablero-ui.js` es un script clásico que se carga **antes** del script principal.
  - Define `TableroUI` con las pantallas individuales, la sala y la ayuda.
  - Usa en tiempo de llamada las funciones globales de `juegos.html` (`marco`, `terminar`, `sala`, `post`,
    `pintarFinalSala`, `rngDe`, `dur`…), que comparten el entorno léxico global de los scripts clásicos.
- `juegos/tablero.css` tiene los estilos propios, con prefijo `tb-`.
- Ganchos en `juegos.html`, todos con el comentario `// juegos-tablero`:
  - 4 tarjetas en `JUEGOS` y 4 ids en `JUEGOS_PARTIDA` y `TIEMPO_REAL`;
  - una línea en `participantes()`, `pintarSala()`, el clic de la sala, `ayuda()`, la nota del selector de juego y
    el aviso de `faltan_jugadores`.
- En el servidor:
  - `server/tablero.ts`: `validarJugadaTablero`, cupos y bots, `faltanJugadores` y `vistaJugadores`;
  - `server/naval.ts`: flota, disparos y turno;
  - `server/salas.ts`: ganchos de una línea, marcados con `// juegos-tablero`.

### Reglas elegidas

- **Damas (estilo inglés/americano, el más común en México en 8×8):**
  - Las piezas usan las 32 casillas oscuras (índices 0–31, fila por fila desde arriba). Las blancas empiezan abajo
    y mueven primero.
  - El peón avanza y captura solo en diagonal hacia adelante. La dama mueve y captura 1 casilla en cualquier
    diagonal.
  - Si hay captura, es obligatoria (cualquier secuencia que la incluya), y la secuencia de saltos sigue mientras se
    pueda. Al coronar termina el turno.
  - Pierde quien no tiene jugadas.
  - Hay empate tras 40 medios movimientos seguidos sin captura ni avance de peón.
  - El bot 🐣 Fácil juega al azar, pero prefiere capturar y no regalar piezas. El 🦊 Difícil usa minimax de 4
    medios movimientos.
- **Dominó (sin robar):**
  - Hay 28 fichas (id 0–27) y 7 para cada jugador. Con menos de 4 jugadores, las demás quedan dormidas.
  - Sale quien tiene la mula más alta (o, si nadie tiene mulas, la ficha más alta), y esa ficha es la primera.
  - Si no tienes ficha que embone, el motor pasa por ti y lo anota.
  - Gana quien se queda sin fichas. Si todos pasan seguido, el juego se cierra y gana quien suma menos puntos en
    la mano; si hay empate, ganan los empatados.
  - El bot tira la ficha más pesada que embona y prefiere las mulas.
- **Parchís (Ludo de 15×15, variante «sale con 5»):**
  - El anillo tiene 52 casillas. La salida de cada color está en 0, 13, 26 y 39, y las casillas seguras son las
    salidas más 8, 21, 34 y 47.
  - Cada ficha avanza `p` de -1 (casa) a 0–50 (anillo), 51–55 (pasillo) y 56 (meta). A la meta se entra con el
    tiro exacto.
  - Con 5 sale una ficha. Con 6, o al comer, se vuelve a tirar. Al caer en una casilla no segura con fichas de
    otro color, esas fichas vuelven a casa. No hay barreras.
  - El dado del tiro `k` sale de la semilla: `fnv(seed|k)` → 1–6. Así todos ven el mismo dado y el estado sigue
    siendo JSON.
  - Si no hay jugada posible, el turno pasa solo.
  - El bot elige con prioridades: comer, llegar a la meta, salir, quedar en casilla segura y avanzar.
  - Con 2 jugadores se usan colores opuestos (rojo y amarillo).
- **Batalla naval (si tocas, vuelves a disparar):**
  - La casilla `c` va de 0 a 99, con `fila*10 + columna`. El nombre es la letra de la columna (A–J) más el
    número de la fila (1–10).
  - La flota tiene 5 barcos de 5, 4, 3, 3 y 2 casillas, en línea recta, dentro del tablero y sin encimarse. Pueden
    tocarse; el acomodo automático procura separarlos.
  - Gana quien hunde los 17 cuadros del rival.
  - El bot caza en patrón de tablero de ajedrez. Al tocar, prueba las 4 vecinas y luego sigue la línea hasta
    hundir.

### Puntos (tope 1,000 en el catálogo; en sala, los mismos valores)

| Juego | Ganar | Otros resultados |
|---|---|---|
| Damas | 600 (Fácil) u 800 (Difícil y sala) + 20 por pieza propia en pie | Empate: 300; perder: 25 por captura (máx. 300) |
| Dominó | 500 + 10 por punto que quedó en las manos rivales | Empate al cerrarse: 400; perder: 200 − 5 por punto en tu mano (mín. 0) |
| Parchís | 800 × fichas en meta ÷ fichas + 200 | 800 × fichas en meta ÷ fichas |
| Batalla naval | 600 + 400 × 17 ÷ disparos | Perder: 20 por cuadro tocado |

Todos los resultados se recortan a 1,000.

### Sala: jugadas, cupos y turnos

- Formas de jugada en `validarJugadaTablero`; cualquier otra recibe 400 `jugada_invalida`:
  - `damas`: `{ n, accion: "mover", ruta: [2..13 casillas 0–31] }` o `{ n, accion: "rendirse" }`;
  - `domino`: `{ n, accion: "jugar", ficha: 0–27, lado: "i" | "d" }`;
  - `parchis`: `{ n, accion: "mover", ficha: 0–3 }`.
- Cupos y bots:
  - `damas` y `naval`: 2 personas y sin bots (`BOTS_FIJOS`); no empiezan con menos de 2 (409 `faltan_jugadores`);
  - `domino` y `parchis`: hasta 4 personas y bots opcionales que completan hasta 4; sin bots, necesitan 2 personas.
- Reproducción en el cliente (`TableroUI`), igual que `estadoCartasSala`:
  - el paso `n` cuenta las jugadas de las personas y de los bots;
  - los bots juegan a los 1.5 s;
  - el turno de una persona dura 30 s (60 s en Damas) y, al vencer, el bot juega por ella;
  - una jugada ilegal se ignora y el turno sigue.

### Batalla naval en el servidor

- **Flota:** `POST /juegos/sala/<código>/respuesta` con `{ flota: [[c, …], …] }`.
  - El servidor la valida con `validarFlota`; si no es válida, responde 400 `flota_invalida`.
  - La guarda una sola vez como `flota` y `flotaT` en el archivo del jugador. Si ya existía, responde 409
    `flota_lista`.
- **Jugadas:** `{ jugada: { n, accion: "disparar", c } | { n, accion: "rendirse" } | { n, accion: "reclamar" } }`.
  - El servidor reúne los disparos de los 2 jugadores (los primeros 2 por orden de entrada) y calcula el turno: el
    jugador 0 dispara primero y, tras «agua», cambia el turno.
  - Valida que la partida siga en juego (si no, 409 `partida_terminada`), que `n` sea el número de jugadas
    hechas (si no, 409 `turno_tomado`), que sea su turno (409 `no_es_tu_turno`), que ambas flotas estén listas
    (409 `falta_flota`) y que la casilla sea nueva (400 `ya_disparaste`).
  - Resuelve el disparo y guarda `{ n, accion, c, r: "agua" | "tocado" | "hundido", barco?, t }`. `barco` lleva
    las casillas del barco hundido.
  - `reclamar` solo vale si le toca al rival (o le falta acomodar su flota) y lleva 90 s o más sin jugar; gana
    quien reclama. Si no se cumple, responde 409 `aun_no`.
  - `rendirse` da la victoria al rival.
- **Ocultamiento** (`vistaJugadores`):
  - en `GET /juegos/sala/<código>`, cada jugador recibe solo su propia `flota`;
  - el broadcast de Realtime y las vistas del admin no llevan ninguna flota;
  - cuando la partida termina, se revelan las dos flotas para el repaso.

## Alternativas descartadas

- **Flota cifrada o con hash en el cliente:** el rival podría descifrarla por fuerza bruta, porque solo hay unas
  decenas de miles de acomodos probables. Además, el resultado de cada disparo depende de la honestidad del
  cliente. El servidor como árbitro es más simple y seguro.
- **Validar en el servidor las reglas de Damas, Dominó y Parchís:** duplicaría los motores en TS. Las demás salas
  por turnos ya confían en la reproducción determinista, y una jugada ilegal se ignora en todos los clientes por
  igual.
- **Barreras y conteo de 20 del parchís clásico:** alargan mucho las partidas en celular. Se documenta la variante
  elegida en «📖 Cómo se juega».

## Riesgos

- **Partidas largas de Parchís en sala:** la salida con 5 y los turnos de 30 s pueden alargarlas. Se mitiga porque
  los bots juegan a 1.5 s y los turnos vencidos los juega el bot.
- **Un rival que se va en Batalla naval:** no hay jugada automática, porque requiere la flota oculta. Se resuelve
  con «⏰ Reclamar victoria» tras 90 s.
