## Decisiones

### 1. Motor (`juegos/cartas.js`)
- Es un script clásico que define `globalThis.Cartas`. `juegos.html` lo carga con `<script src>` y Deno lo importa
  en las pruebas.
- Cartas `0..51`: el rango es `id % 13` (2…A) y el palo es `⌊id/13⌋` (♠♥♦♣).
- `valor5(ids)` = categoría × 13⁵ + desempates. Las categorías van de carta alta a escalera de color. En la escalera
  A-2-3-4-5, la carta alta es el 5.
- `mejorMano(ids)`: revisa las 21 combinaciones de 5 cartas y regresa `{ valor, categoria, nombre, cartas }`.
- Estado de la partida: `pokerNueva(jugadores, { fichas, manos })`.
- `pokerMano(st, rng)`:
  - avanza el botón;
  - ciegas 10/20, 20/40, 40/80 y 75/150, que suben cada 4 manos;
  - reparte 2 cartas a cada quien;
  - en cara a cara, el botón pone la ciega chica.
- `opciones(st)` regresa `{ pasar, igualar, minSubir, maxSubir }`.
- `pokerActuar(st, { accion, monto })`:
  - acciones: `retirarse`, `pasar`, `igualar`, `subir` (`monto` = total de la ronda) y `todo`;
  - regresa `false` si la jugada no es válida;
  - una subida vuelve a abrir la ronda para los demás.
- Al completarse la ronda, se reparte el flop, el turn o el river. Si a lo mucho queda un jugador con fichas, se
  reparten todas las comunes y se muestran las manos.
- Botes laterales por niveles de aportación. Las fichas que sobran de un empate van al primero después del botón.
- `pokerBot(st, rng)`:
  - antes del flop: fuerza por par, cartas altas, mismo palo y cartas seguidas;
  - después del flop: categoría de su mejor mano, con menos fuerza si la mano está toda en la mesa;
  - decide igualar, retirarse o subir comparando su fuerza con las probabilidades del bote, con 7 % de farol.

### 2. Individual
- `elegirPoker()`: se eligen los rivales (1–4) o el modo pareja.
- Bots con nombres de casino: Le Chiffre 🃏, Vesper 💎, Felix 🎩 y Mathis 🍸.
- Mesa con paño verde:
  - comunes y bote al centro;
  - asientos con fichas y apuesta;
  - botonera con control de monto.
- Al final de cada mano se muestran las manos con su nombre y quién ganó. Se sigue con un botón o solo a los 4 s.
- Fin: a las 10 manos, al quedarte sin fichas o al quedar solo tú.
  - Puntos: `min(1000, round(fichas / N))`. La pareja ganadora suma +150.

### 3. En partida
- `JUEGOS_PARTIDA` y `TIEMPO_REAL` incluyen `poker`. Al crear la sala se puede elegir `equipos: "1"`.
- `estadoPoker()` reconstruye la mesa igual que `estadoUna()`:
  - la mano `k` usa `rngDe(seed, 'poker-mano-' + k)`;
  - los bots juegan a los 1.5 s con `rngDe(seed, 'pbot' + paso)`;
  - el turno humano dura 30 s; si se acaba, la jugada automática es pasar o retirarse;
  - entre manos hay una pausa de 5 s para ver el resultado.
- Servidor: si `sala.juego === "poker"`, `jugada.accion` debe ser una de las 5 acciones y `monto` un entero de 0 a
  1,000,000. Aplica la misma regla de `turno_tomado`.
- Fin: el podio usa los puntos de la partida individual. Con equipos muestra los totales A/B y el equipo ganador
  suma +150.

### 4. Cómo se juega
- `AYUDA[id]` (HTML) y `ayuda(id)` abren un `<dialog>` accesible que se cierra con Esc o con el botón.
- Contenido del póker:
  - objetivo;
  - ronda por ronda;
  - acciones;
  - tabla de manos de mayor a menor, con ejemplo;
  - aviso de que las fichas no tienen valor.

## Pruebas
- `server/cartas_test.ts`:
  - orden de las categorías, escalera baja y mejor mano de 7 cartas;
  - mano completa con retiros;
  - jugadas inválidas;
  - bote lateral con all-in;
  - empate;
  - 200 partidas de bots con semilla: las fichas se conservan, las jugadas siempre son válidas y la partida
    siempre termina.
- Servidor: `poker` permitido en partidas y validación de su jugada.
- E2E:
  - individual: ayuda, 10 manos y puntos guardados;
  - en partida: dos navegadores con bots, la misma mesa en ambos y jugadas por turno.

## Ajuste post-apply (profe): ritmo más lento
- Iba tan rápido que se perdían. Se agregan unos 4 s de pausa para ver qué pasó:
  - individual:
    - el resultado de cada mano se ve 10 s antes de avanzar solo (antes 6 s);
    - cada bot tarda 2 s en actuar (antes 1.1 s);
  - en sala:
    - pausa entre manos de 9 s (`PK_PAUSA_MS`; antes 5 s);
    - cada bot tarda 2.5 s (`PK_BOT_MS`; antes 1.5 s).
