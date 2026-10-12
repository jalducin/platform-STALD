## Why

El profe pidió dos ajustes a los clásicos:

- **Basta:** las categorías de siempre (nombre, animal, fruta…) ya se sienten repetidas. Quiere que quien crea la
  partida pueda sumar una o dos categorías divertidas, como Pokémon o Antojito mexicano.
- **¡Una!:** hoy, si alguien no tiene carta para tirar, roba solo una y casi siempre pasa. El profe quiere la regla de
  casa: robar del mazo hasta sacar una carta que sí se pueda tirar.

## What Changes

- **Basta, categorías divertidas.** Hay una lista fija de 10:
  - Pokémon;
  - Actor o actriz;
  - Flor;
  - Personaje de anime;
  - Película;
  - Superhéroe o villano;
  - Antojito mexicano;
  - Cosa que hay en el refri;
  - Excusa para no ir a la fiesta;
  - Something in the kitchen.

  Funcionan así:
  - En sala, el anfitrión elige hasta 2 al crear la partida. Se guardan en `sala.opciones.extra`, y la revancha las
    hereda.
  - En Basta individual se eligen antes de que salga la letra.
  - Aparecen como columnas normales, con los mismos puntos: única, repetida, no verificada, vacía.
  - Cada una tiene un banco pequeño de respuestas por letra. Ese banco sirve de diccionario y de palabras para los
    bots.
  - El servidor valida los ids. Un id desconocido, repetido o más de 2 → 400 `extras_invalidas`.
- **¡Una!, robar hasta poder tirar.**
  - Si no tienes carta jugable, robas del mazo hasta sacar una que sí sirva. Aplica a personas y bots, en individual
    y en sala.
  - Si el mazo se acaba sin una jugable, pasa el turno. Para robar no se rebaraja el descarte.
  - En sala, la jugada `robar` se reproduce del mazo de la semilla, así que es determinista. El servidor rechaza
    `robar` o `pasar` si traen carta o color.
  - Las cartas robadas entran con una animación, y aparece el aviso «Robaste 3 cartas hasta encontrar una que sí
    puedes tirar».

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisitos MODIFIED «Basta», «Basta en partida», «¡Una!» y «¡Una! en partida».

## Impact

- Superficies:
  - `juegos.html` (Basta individual y en sala, ¡Una! individual y en sala);
  - módulos nuevos `juegos/basta.js` y `juegos/una.js`;
  - `juegos/datos/basta.json`, con `extras` en la raíz;
  - servidor Deno: `server/salas.ts`, con `EXTRAS_BASTA` y la validación de `opciones.extra` y de `robar`/`pasar`.
- No toca Postgres, Supabase (Auth ni Realtime), el repo privado de datos ni Notion.
- Datos personales: no se agregan. `opciones.extra` solo guarda ids de categorías. La matriz de acceso de las salas no
  cambia: quien está en la sala ve las opciones de la sala, igual que hoy.
- Pruebas:
  - nueva `server/basta_una_test.ts`;
  - E2E `clasicos`, `basta-rondas`, `una-sala` y `una-robo`, actualizadas.
- Docs: `docs/data-model.md`, `docs/backend-standards.md` y `docs/frontend-standards.md`.
- Acciones externas: ninguna. Deno Deploy y Pages publican con el merge a `main`, que hace el usuario.
