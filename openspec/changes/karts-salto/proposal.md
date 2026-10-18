## Why

El profe pidió: «agrega un botón de salto a Karts». Un brinquito arcade (como en los clásicos) le da a alumnos y
alumnas una forma justa de esquivar una cáscara o una bola en el piso y de entrar al derrape con estilo, sin romper
las mecánicas que ya piden rampa (huecos del espacio, cenote) ni el conteo de vueltas.

## What Changes

- **Acción nueva `salto`** en `KartsEntrada`: un brinco corto (0.4 s en el aire, 14 px de alto, sombra en el piso y
  un pequeño aplastón al caer). En el aire no se gira brusco (35 % del giro, salvo que ya vengas derrapando).
  Enfriamiento de 0.6 s después de caer: no se puede «spamear».
- **Lógica pura en `juegos/karts-salto.js`** (`window.KartsSalto`), probada con Deno.
- **Para qué sirve:** esquivar cáscara y bola (a media altura del brinco) y entrar al derrape: si mantienes el salto
  y giras al caer, empieza el derrape con su mini-turbo.
- **Qué NO hace:** no es el «aire» de una rampa: no cruza huecos del espacio ni el cenote (caes o te mojas igual), no
  te salva del lodo, del cohete, del rayo, de los bloques que caen ni de la roca rodante (es más alta que el brinco),
  no acelera y no toca el conteo de vueltas.
- **Celular:** botón propio «⤴ SALTO» (Botones, Joystick y Sensor), columna alta a la derecha de DERRAPE, FRENO y
  REVERSA.
- **Mando clásico:** R/L (los del derrape): presionar = brinco, mantener girando = derrape. Etiqueta «salto/derrape».
- **Teclado:** ESPACIO (el del derrape), igual que el mando: presionar brinca, mantener girando derrapa.
- **En vivo:** el estado del kart manda la altura (índice 10, interpolada) y los demás ven el brinco (y los saltos de
  rampa). Los aparatos con la versión anterior la ignoran.
- Tutorial y lista de teclas actualizados.

Superficies: `juegos.html` (Karts dentro de Juegos) vía `juegos/karts.html` y el módulo nuevo `juegos/karts-salto.js`.
Sin cambios en el servidor Deno, Postgres, Realtime, Auth, repo de datos ni Notion.

## Capabilities

### Modified Capabilities
- `juegos`: Karts agrega el salto.

## Impact

- `juegos/karts.html`, `juegos/karts-salto.js` (nuevo), `server/karts_salto_test.ts` (nuevo),
  `tests/e2e/e2e-karts.js`, `tests/e2e/e2e-karts-vivo.js`, `docs/frontend-standards.md`.
- Acciones externas: ninguna. Matriz de acceso: no toca datos de alumnos y alumnas.
