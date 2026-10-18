## Why

Después de probarlas, el profe dijo: «las pistas del espacio y pirámides dentro deben tener curvas mucho más complejas,
eso falta». Las 4 pistas de la Copa del Espacio (sprint 35) y las 4 de la Copa Reinos Antiguos (sprint 34) son vueltas
grandes con curvas amplias y poco técnicas: casi no hay chicanas, horquillas, espirales ni pasillos con giros de 90°,
y nada en las pruebas mide la «complejidad» de un trazado.

## What Changes

- **Trazados nuevos y mucho más técnicos** en las 8 pistas, diseñados con rectas y arcos (tortuga) y cerrados con
  precisión, conservando la identidad y las mecánicas de cada una (que se mueven a los tramos nuevos):
  - **Estación Orbital Quetzal** 🛰️: escalón de pasillos, **laberinto de pasillos** (greca con 10 giros de 90°
    seguidos), chicana y horquilla; compuertas en los pasillos, hangar sin gravedad dentro de la greca.
  - **Anillos de Saturno** 🪐: **espiral doble** de 443° alrededor del planeta (entra, gira y sale entre sus propios
    anillos), horquilla, **curva que se cierra**, chicana y serpentina con 2 horquillas.
  - **Cinturón de Asteroides** ☄️: **sacacorchos** de 277° alrededor de un asteroide, curva que se cierra,
    **laberinto en escalera** (6 giros de 90°), recta de huecos y plataforma, chicana y horquilla.
  - **Nebulosa Esmeralda** 🌌: **remolino en espiral doble** de 410° con un portal que corta por el centro, horquilla,
    serpiente de S encadenadas sin barandal, curva que se cierra y horquilla doble.
  - **Reinos Antiguos** (Giza, El Castillo, Karnak, Angkor): galerías interiores con giros de 90° encadenados, rampas
    en espiral de pirámide y escaleras, conservando interiores, columnas, bloques, losas, rocas y adornos.
- **Ocho con cruce a otra altura:** el motor es Mode-7 de un solo plano (una sola textura del piso y avance por la
  muestra más cercana), así que no hay puentes reales; no se agrega un ocho. El «paso por encima» se simula con los
  portales de la Nebulosa (el del remolino corta por el centro de la espiral).
- **Complejidad medible:** una función pura `KartsPistas.complejidad(M)` (curvas > 120°, espirales ≥ 360° en un solo
  sentido, sacacorchos ≥ 270°, giros de 90° seguidos, chicanas, horquillas) y pruebas que exigen un mínimo por pista.
- **Récords por trazado:** `VERSION_PISTAS` sube a 3 y las pistas rediseñadas llevan `trazado: 3`. Al abrir el juego, los
  récords de esas 8 pistas pasan a `recordsV2` («trazado anterior»); los de las otras pistas, las copas ganadas, las
  piezas y el equipo se quedan. El servidor acepta la forma nueva (`pistasV: 3` + `recordsV1` + `recordsV2`).
- **Salas y copas:** `MAPAS_SALA` ya sale de las pistas; la referencia, el mínimo y el límite de sala de cada pista se
  recalculan solos con el largo nuevo (±15 % del de antes).
- **Rendimiento:** 60 cuadros por segundo con CPU ×4 y 8 karts, medido en el E2E.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: trazados técnicos medibles en las pistas del Espacio y de Reinos Antiguos y récords versionados por trazado.

## Impact

- Superficies: `juegos.html` (Karts dentro de Juegos), servidor Deno (`server/progreso.ts` valida la forma nueva;
  `server/carreras.ts` sin cambios: límites derivados). Sin cambios en Postgres, Realtime, Auth, repo de datos ni Notion.
- Archivos: `juegos/karts-pistas.js` (trazados, mecánicas, `trazado`, `complejidad`), `juegos/karts.html` (migración
  y texto del récord «trazado anterior», marcado `// karts-curvas-complejas`), `server/progreso.ts`, pruebas de Deno
  y E2E, docs.
- Acciones externas: ninguna (Deno Deploy y Pages publican con el merge a `main`).
