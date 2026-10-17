## Why

El profe notó que en «Karts Turbo» las cajas de ítem dan más cosas jugando solo que en una partida en sala: en sala
solo salen 🪙 monedas, 🌶️ turbo y ⭐ estrella, y faltan 🍌 cáscara, 🟢 bola, 🚀 cohete y ⚡ rayo. En el sprint 27A
(`juegos-en-vivo`) se decidió no tener ítems entre personas porque cada aparato manda solo sobre su kart. Ahora que el
canal en vivo, el reloj común de la sala y la copa en sala ya funcionan, se puede jugar con todos los ítems sin perder
esa regla.

## What Changes

- **Todos los ítems en sala en vivo** con el diseño «la víctima decide»: cada aparato sigue mandando solo sobre su
  kart.
  - Quien usa un ítem manda un evento en vivo `item` (tipo, posición, ángulo, vuelta y avance, hora de la carrera, id
    único dueño + número y, en el cohete, el blanco). Cada aparato dibuja el objeto a partir del evento con la misma
    simulación determinista (paso fijo de 1/60 s): la cáscara queda en la pista, la bola rebota por el camino y el
    cohete persigue a su blanco.
  - Cada aparato revisa los choques de los objetos **solo contra su kart**; si le pegan, gira en su pantalla y manda
    `item-golpe` con el id del objeto para que los demás lo quiten (y lo ven girar por su estado en vivo).
  - El **rayo** frena a quien iba adelante de quien lo usó: cada aparato compara su avance a esa hora de la carrera
    (reloj común de la sala) con el avance de quien lo usó.
  - La **estrella** da inmunidad en tu aparato y los demás la ven por el estado del kart; si un kart con estrella te
    choca, giras tú.
- **Tabla de ítems en sala en vivo** como la individual (por lugar: quien va atrás recibe mejores), un poco más suave
  (menos cohetes y rayos, más turbo y estrella para quien va atrás). Sin canal en vivo (respaldo con fantasmas) sigue
  la tabla reducida de siempre.
- **Anti-abuso**: se descartan ids repetidos, números viejos y eventos de más de 4 s; máximo 1 ítem por segundo por
  persona; solo participantes de la sala (ya lo filtra `EnVivo`); tras un golpe de ítem en sala hay 4 s de gracia (no
  te pueden tumbar en cadena), lo que acota el tiempo perdido y mantiene el tiempo dentro del límite del servidor.
- **Copa en sala**: igual, carrera por carrera (los eventos de otra carrera de la copa se ignoran).
- **Fantasmas** (bots de sala y respaldo sin canal): sin cambios; no reciben ítems.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: Karts en sala en vivo reparte y usa todos los ítems entre personas con la regla «la víctima decide».

## Impact

- **Superficies:** `juegos/karts.html` (cambios marcados `// karts-objetos-en-sala`), nuevo `juegos/karts-objetos.js`
  (lógica pura de ítems en red: tablas, codificación, registro anti-abuso, simulación determinista, choque, rayo y
  gracia), `juegos.html` y demás solo `?v=` si hiciera falta. El servidor no cambia: sigue validando el tiempo; una
  prueba confirma que el peor caso de golpes cabe en el límite de cada pista. No toca `index.html`, `ingles.html`,
  `secundaria.html`, Postgres `stald_*`, Supabase, Notion ni `.env`.
- **Datos:** ninguno nuevo. Los eventos en vivo solo llevan números, el tipo de ítem y el id de la sala (sin correos
  ni nombres). **Matriz de acceso:** sin cambios (solo participantes de la sala reciben y aceptan eventos).
- **Coordinación:** el sprint 34 (Copa Reinos Antiguos) toca `karts.html`, `karts-pistas.js` y `server/carreras.ts`;
  la lógica va en un archivo aparte y antes del PR se mezcla `origin/main` conservando ambos lados.
- **Pruebas:** `server/karts_objetos_test.ts` (unitarias) y `tests/e2e/e2e-karts-vivo.js` (cohete, cáscara, rayo,
  estrella, latencia y pérdida sin duplicados, respaldo con tabla reducida, fps con 8 karts e ítems).
- **Acciones externas:** ninguna (Pages y Deno Deploy publican con el merge a `main`).
