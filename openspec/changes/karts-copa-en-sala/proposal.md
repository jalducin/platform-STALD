## Why

El profe pidió: «en partida que les deje jugar copas completas de varias pistas como en el individual». Hoy una sala de
Karts corre una sola carrera; las copas de 4 pistas (puntos por lugar, tabla, podio) solo existen en el modo individual.

## What Changes

- **Crear sala de Karts**: «Formato»: «🏁 Una carrera» (como hoy, se elige pista) o «Copa completa»: Copa Fiesta,
  Copa Mesoamericana o Copa mixta (2 pistas de cada copa al azar con la semilla de la sala).
- **La sala corre las 4 carreras seguidas**: puntos por lugar como en el individual (15, 12, 10, 8, 6, 4, 2, 1; no
  terminar = 0), tabla entre carreras con cuenta regresiva de 10 s, la siguiente empieza sola para todos y, al final,
  podio de la copa con suspenso (`Emocion.podio`), tabla de las 4 carreras y revancha (la mixta sortea otras pistas).
- **Servidor** (`server/karts_copa.ts`, reglas compartidas en `juegos/karts-copa.js`): opciones `modo: "copa"` y
  `copa`; `POST /respuesta { copa: { carrera, ms, monedas } }` o `{ copa: { carrera, abandono: true } }` validado como
  una carrera suelta (mínimo y límite de su pista y reloj desde el inicio de esa carrera); orden obligatorio (409
  `carrera_fuera_de_turno` / `carrera_cerrada`); cierre al reportar todas las personas esperadas o al vencer el límite
  (no terminó = 0); `GET /sala` y Realtime traen la copa (fase, carrera en curso, calendario, resultados y tabla);
  `POST /partida` de una sala de copa topa los puntos con la tabla del servidor (suma de los puntos por lugar de cada
  carrera, tope 2000).
- **En vivo (27A)**: el iframe de Karts no se recarga entre carreras: el canal en vivo sigue toda la copa (con el número
  de carrera en cada mensaje) y, sin canal, fantasmas como siempre. Quien se desconecta a media copa suma 0 en lo que
  falta; si vuelve, entra en la siguiente carrera.
- El personaje elegido en la sala (sprint 29) vale para toda la copa; los bots completan la mesa con sus tiempos
  simulados por pista y suman sus propios puntos.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisito nuevo «Copa completa de Karts en sala».

## Impact

- Superficies: `juegos.html` (carga `juegos/karts-copa.js`), `juegos/app/arcade.js`, `juegos/app/salas.js`,
  `juegos/app/arranque.js`, `juegos/karts.html`; servidor Deno (`server/karts_copa.ts` nuevo, `server/salas.ts`,
  `server/juegos.ts`); `tests/e2e/correr.sh` (tiempo de `karts-vivo`).
- Matriz de acceso: los resultados de cada carrera son del asiento (tiempo y monedas, sin datos personales); los ve
  quien ya ve la sala (mismas reglas de `GET /juegos/sala/<código>`) y solo su dueño los escribe (jugador de la sesión).
- Depende de `karts-pistas-grandes` (límites por pista). No se escribe en tablas `stald_`. Sin acciones externas.
