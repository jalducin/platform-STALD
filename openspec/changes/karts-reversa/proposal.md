## Why

El profe pidió: «agrega al juego un botón para reversa». Hoy en «Karts Turbo», si el carro queda atorado contra un
muro (Reinos Antiguos), una columna o de frente a la orilla, la única salida es girar en el lugar a muy poca
velocidad. Con reversa, alumnos y alumnas pueden salir de un atorón como en un carro de verdad.

## What Changes

- **Acción nueva `reversa`** en la capa de entrada `KartsEntrada` (junto a acel, freno, izq, der, derrape, item y
  pausa). Mientras se mantiene, el carro va hacia atrás despacio (≈ 38 % de la punta, aceleración suave); si iba
  hacia adelante, primero frena. El volante se invierte solo, como en un carro real en reversa.
- **Lógica pura en `juegos/karts-reversa.js`** (`window.KartsReversa`): velocidad de reversa, cuándo «frenar estando
  parado» se vuelve reversa y el cruce de la meta en ambos sentidos. Así se prueba con Deno sin el navegador.
- **Celular:** botón «⏪ REVERSA» en Botones, Joystick y Sensor, en una fila baja bajo FRENO / DERRAPE, sin encimarse
  en vertical ni en horizontal. Con «Acelerar: Automático», la reversa manda mientras se mantiene.
- **Mando clásico (`juegos/mando.js`, sin cambios en el módulo):** mantener B estando parado = reversa (como en
  muchos juegos de carreras); la etiqueta de B dice «frenar/rev».
- **Teclado:** mantener ↓/S estando parado = reversa, y la tecla R siempre.
- **Seguridad y juego limpio:** cruzar la meta hacia atrás resta una vuelta en el marcador y deja una «deuda»; volver a
  cruzarla hacia adelante solo la salda, sin sonido ni aviso de vuelta (no se pueden «farmear» vueltas). La reversa no
  se usa con el motor ahogado, girando por un golpe, cayendo, con el dron, al terminar ni en el piloto de prueba;
  los bots no la usan. En sala, el kart manda su estado igual que siempre (la velocidad puede ser negativa).
- **Tutorial de controles:** fila nueva con la reversa según el control.

Superficies: `juegos.html` (Karts dentro de Juegos) vía `juegos/karts.html` y el módulo nuevo
`juegos/karts-reversa.js`. Sin cambios en el servidor Deno, Postgres, Realtime, Auth, repo de datos ni Notion.

## Capabilities

### Modified Capabilities
- `juegos`: Karts agrega la reversa.

## Impact

- `juegos/karts.html`, `juegos/karts-reversa.js` (nuevo), `server/karts_reversa_test.ts` (nuevo),
  `tests/e2e/e2e-karts.js`, `docs/frontend-standards.md`.
- Acciones externas: ninguna. Matriz de acceso: no toca datos de alumnos y alumnas.
