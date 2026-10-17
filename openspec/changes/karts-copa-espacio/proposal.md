## Why

El profe pidió una cuarta copa de «Karts Turbo» en el espacio, con pistas «imposibles», para que las copas vayan
subiendo de dificultad: Fiesta → Mesoamericana → Reinos Antiguos (sprint 34, en paralelo) → **Espacio** (la más
difícil). Hoy todas las pistas son de suelo firme: salirse del camino solo frena, no hay huecos, portales ni gravedad
distinta, y los bots corren igual en todas las copas. La inspiración es la ciencia ficción, pero todo es original:
sin nombres, naves, logotipos, sonidos ni personajes de ninguna franquicia.

## What Changes

- **4 pistas espaciales** (del tamaño de las pistas grandes, 2 vueltas), con camino flotante de piso metálico
  translúcido y orillas de neón, cielo de 360° con estrellas, planeta, nebulosa, estación o luna, y escenario propio:
  1. **Estación Orbital Quetzal** 🛰️: pasillos y hangares, **compuertas** que abren y cierran, un hangar sin gravedad.
  2. **Anillos de Saturno** 🪐: hielo que resbala y **rocas de hielo que cruzan** el camino, tramos sin barandal y un hueco.
  3. **Cinturón de Asteroides** ☄️: asteroides que cruzan, **huecos con rampa** y **plataformas móviles**.
  4. **Nebulosa Esmeralda** 🌌: **portales**, **gravedad baja**, plataformas y huecos: la más difícil.
- **Mecánicas nuevas, baratas y deterministas** (solo dependen de la posición y del reloj de la carrera):
  - **tramos sin barandal**: donde no hay postes de neón, salirse es caer al vacío; un **dron de rescate** original te
    remolca de vuelta con una penalización fija (≈ 2.2 s detenido). Donde hay barandal, el kart raspa y sigue;
  - **huecos con rampa** (saltar con velocidad o caer), **gravedad baja** (saltos más largos y menos agarre),
    **plataformas móviles** (cruzar el hueco encima de ellas), **franjas turbo y antiturbo**, **portales** fijos
    (entrada → salida siempre igual), **compuertas** que abren y cierran (el centro nunca se cierra del todo) y
    **rocas que cruzan** (como la trajinera).
- **Copa del Espacio** (`espacio`) con las 4 pistas en orden de dificultad; los bots más rápidos de todas las copas
  (`ritmoBots` por pista). Se juega sola, en **copa completa en sala** y cada pista **suelta en sala** (la lista de
  pistas de sala del servidor sale de las definiciones, sin copiarla).
- **Desbloqueo**: la Copa del Espacio se abre al subir al podio en 2 copas distintas; sus pistas se pueden practicar
  siempre en «Carrera rápida» y en sala.
- **Selector y menú** con las copas en orden de dificultad (campo `nivel`), sin listas fijas: el menú, el selector de
  pistas, las copas en sala (`KartsCopa.COPAS_SALA`) y el `<select>` de «Crear partida» salen de `KartsPistas.COPAS`.
- **Pintura dorada**: vuelve a pedir lo que dice el taller (récord bajo la meta en las 4 pistas de la Copa Fiesta);
  con 12 o más pistas de sala ya no sería alcanzable.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: Karts suma 4 pistas espaciales con mecánicas nuevas, la Copa del Espacio con su regla de desbloqueo y la
  lista de copas en orden de dificultad.

## Impact

- **Superficies:** `juegos.html` (solo `?v=`), `juegos/karts.html` (física espacial, dibujo, menú y ganchos de prueba),
  `juegos/karts-pistas.js` (pistas, copa y funciones puras de las mecánicas), nuevo `juegos/karts-espacio.js` (piso,
  sprites y cielo espaciales, sin estado), `juegos/arcade.js` (`ritmoBots`), `juegos/karts-copa.js` (copas de sala
  derivadas), `juegos/app/salas.js` (opciones de copa derivadas), `juegos/plataformas.html` (solo `?v=` de
  `arcade.js`) y el servidor Deno (`server/carreras.ts`: `MAPAS_SALA.karts` derivado de las pistas de sala). No toca
  `index.html`, `ingles.html`, `secundaria.html`, Postgres `stald_*`, Supabase, Notion ni `.env`.
- **Datos:** el progreso de Karts agrega la copa `espacio` en `copas` y las 4 pistas en `records` (ids válidos para el
  servidor: copa de 2 a 12 letras, pista `^[a-z][a-z-]{1,19}$`); misma forma y `VERSION_PISTAS` 2 (las pistas de antes
  no cambian, sus récords siguen valiendo). **Matriz de acceso:** sin cambios (cada persona solo ve y guarda su
  progreso; las salas siguen las reglas de siempre).
- **Coordinación:** el sprint 34 (Reinos Antiguos) toca en paralelo `karts-pistas.js`, `karts.html`,
  `server/carreras.ts` y las copas. Los cambios van marcados `// karts-copa-espacio`, las listas dejan de estar fijas
  y el orden lo da `nivel`; antes del PR se mezcla `origin/main` conservando ambos lados.
- **Pruebas:** `server/karts_espacio_test.ts` (pistas cerradas y manejables, mecánicas sobre el camino, caída y
  rescate, portales deterministas, minimapa, ids, límites por pista, desbloqueo), ajustes en
  `server/karts_pistas_test.ts`, `server/karts_copa_test.ts` y `server/carreras_test.ts`; E2E `e2e-karts.js`
  (selección, vuelta con caída y rescate, copa, fps, capturas) y `e2e-karts-vivo.js` (sala en una pista nueva).
- **Acciones externas:** ninguna (Pages y Deno Deploy publican con el merge a `main`).
