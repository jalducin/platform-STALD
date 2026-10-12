## Why

El profe quiere más variedad en Juegos «para marcar la diferencia», sobre todo para las clases en el Meet con
muchos alumnos y alumnas a la vez. Hoy la única partida pensada para salas grandes es la Lotería; los demás juegos de
sala son de pocos jugadores o de preguntas. Además, dos favoritos individuales (🃏 Memorama y 🔎 Sopa de letras) no
se pueden jugar contra los amigos.

## What Changes

- **🎱 Bingo (`bingo`, Clásicos)**: 75 números y cartón de 5×5 con casilla libre, para salas de hasta 30 personas.
  - El servidor «canta» con una semilla determinista al ritmo de la Lotería (un número cada 4.5 s).
  - Al crear la sala se elige la figura: **línea**, **cuatro esquinas** o **cartón lleno**.
  - Quien completa la figura toca «¡Bingo!» y **el servidor lo valida** contra los números ya cantados: un bingo
    falso responde 409 `bingo_falso` y no cuenta.
  - Individual: contra 2 bots.
- **🂡 Blackjack (`blackjack`, Clásicos)** con fichas sin valor real, como el póker:
  - pedir, plantarse y doblar; la banca pide hasta tener 17 o más; blackjack natural paga 3 a 2;
  - 500 fichas y 8 manos; las apuestas se arman con fichas de 5, 10, 20, 50 y 100 (múltiplos de 5);
  - individual contra la banca; en sala, de 2 a 6 jugadores (personas y bots) contra la banca, con la misma
    validación de montos del póker (entero, múltiplo de 5).
- **🎨 Dibuja y adivina (`dibuja`, Inglés)**, estilo Pictionary, de 3 a 12 personas por turnos:
  - quien dibuja recibe una palabra del vocabulario de `juegos/datos/ingles.json` y dibuja en un lienzo compartido;
  - los demás escriben la palabra en inglés; más puntos por adivinar rápido y puntos para quien dibuja por cada
    acierto;
  - el trazo viaja como puntos simplificados (enteros de 0 a 255) en el archivo de quien dibuja y llega por Supabase
    Realtime (con el sondeo de respaldo);
  - el servidor limita tamaño y frecuencia del trazo y de los intentos, valida las respuestas y **nunca revela la
    palabra** a quien adivina (solo la recibe quien dibuja; se revela al terminar el turno);
  - solo en sala; práctica individual opcional («adivina el dibujo» con el emoji que se va aclarando).
- **🃏 Memorama (`en-memorama`) y 🔎 Sopa de letras (`mente-sopa`) también en sala**, contra bots y amigos:
  - Memorama: todos resuelven el mismo tablero (misma semilla); gana el menor tiempo o el de menos errores, a elegir
    al crear la sala.
  - Sopa de letras: carrera por encontrar las mismas palabras en la misma sopa; se ve el avance de cada quien.
  - Cada quien envía su resultado validado contra el reloj del servidor.
- Puntos con las reglas de `server/juegos.ts`: `bingo`, `blackjack` y `dibuja` entran al catálogo con título (para
  el ranking «🔥 Juegos») y tope de 1000 en individual; en sala, el tope de partidas de siempre.

## Capabilities

### Modified Capabilities
- `juegos`: tres juegos nuevos (Bingo, Blackjack y Dibuja y adivina) y dos juegos individuales que pasan a partida
  (Memorama y Sopa de letras).

## Impact

- **Superficies:** `juegos.html` (ganchos mínimos marcados `// juegos-salas-grandes`) y servidor Deno
  (`server/salas.ts` y `server/juegos.ts` con bloques localizados; módulo nuevo `server/salas_grandes.ts`). No toca
  `index.html`, `ingles.html`, `secundaria.html`, Notion, tablas `stald_*`, Supabase Auth ni la configuración de
  Realtime (solo usa la publicación que ya existe).
- **Archivos nuevos:** `juegos/bingo.js`, `juegos/blackjack.js`, `juegos/dibuja.js`, `juegos/memo-sopa-sala.js`,
  `server/salas_grandes.ts`, `server/salas_grandes_test.ts` y `tests/e2e/e2e-salas-grandes.js`.
- **Datos:** sin prefijos nuevos. Campos nuevos en los archivos de sala ya existentes (`juegos/salas/<código>/…`):
  `sala.secreto` (solo Dibuja; nunca sale del servidor) y, por jugador, `bingo`, `bingoFalsos`, `dibujo`,
  `aciertos`, `intentos` y `resultado`. Sin correos.
- **Matriz de acceso:** igual que las salas: solo quien está dentro lee la sala; cada quien escribe solo su archivo;
  la palabra de Dibuja solo la recibe quien dibuja en su turno (ni el admin la ve en el cuerpo de la sala).
- **Coordinación:** otros cambios en paralelo agregan juegos a `juegos.html`, `server/salas.ts` y
  `server/juegos.ts`; por eso la lógica vive en archivos propios y los ganchos son de una o dos líneas.
- **Acciones externas** (usuario, tras el merge): redeploy de Deno Deploy y publicación en GitHub Pages; verificación
  en producción.
