## Why

El profe quiere más variedad en «Karts Turbo» y que las pistas cuenten algo de nuestra historia: hoy hay 4 pistas
(pradera, desierto, hielo y volcán) y una sola copa. Pide 4 pistas inspiradas en civilizaciones de México
(mexica, teotihuacana, maya y olmeca), con su propia mecánica, y una copa que las junte. Además, las definiciones de
las pistas viven repartidas entre `juegos/arcade.js` (trazado y física) y `juegos/karts.html` (paleta, cielo y
escenario), lo que dificulta agregar pistas sin tocar el código del juego.

## What Changes

- **Datos de pistas en un solo archivo:** nuevo `juegos/karts-pistas.js` (script clásico, sin DOM) con las 8 pistas
  (trazado, física, colores, paleta del cielo, escenario, descripción y mecánicas), las copas y una función pura para
  encuadrar el minimapa. `juegos/arcade.js` lee de ahí; `Arcade.PISTAS` sigue siendo la lista de pistas **de sala**
  (las 4 de siempre, igual que `MAPAS_SALA` del servidor) y `Arcade.pistaPorId` encuentra las 8.
- **4 pistas nuevas** (en carrera rápida y copa; las salas no cambian):
  1. **Calzadas de Tenochtitlan** (mexica): calzadas sobre el lago, canales, chinampas con ahuejotes, el Templo
     Mayor y los volcanes en el horizonte; paleta azul verde con ocre. Mecánica: **trajinera** que cruza el canal
     (obstáculo móvil determinista; si te pega, giras).
  2. **Calzada de los Muertos** (Teotihuacan): recta larga entre las pirámides del Sol y de la Luna, cabezas de
     serpiente emplumada en las orillas; paleta roja y de piedra. Mecánica: **rampas de velocidad** en la calzada.
  3. **Sacbé de Chichén Itzá** (maya): camino blanco en la selva, El Castillo al fondo, un tramo por el juego de
     pelota y un **salto sobre el cenote** (sin saltar, el agua te frena); paleta verde y caliza.
  4. **Selva de La Venta** (olmeca): selva húmeda, cabezas colosales junto a la pista, un río y **zonas de lodo** que
     frenan; paleta de verdes profundos y basalto.
  Cada una con su trazado cerrado, cielo de 360° con su silueta, escenario, minimapa, nombre y descripción corta en
  el selector. Representación respetuosa: sin caricaturas.
- **Copa Mesoamericana** (La Venta → Teotihuacan → Chichén Itzá → Tenochtitlan, en orden cronológico) junto a la
  Copa Fiesta; el avance y los récords se guardan igual (`copas[id]`, `records[pista]`, `copaEnCurso.copa`).
- **Selector de pistas** agrupado por copa, con descripción corta.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: Karts suma 4 pistas mesoamericanas con mecánicas propias y la Copa Mesoamericana.

## Impact

- **Superficies:** `juegos.html` (carga `juegos/karts-pistas.js` antes de `juegos/arcade.js`), `juegos/arcade.js`,
  `juegos/karts.html` (pistas, escenario, cielo, copa y selector de pistas), `juegos/plataformas.html` (solo el `?v=`
  de `arcade.js`) y el nuevo `juegos/karts-pistas.js`. No toca el servidor, `index.html`, `ingles.html`,
  `secundaria.html`, Postgres `stald_*`, Supabase, Notion ni `.env`.
- **Coordinación:** otros dos cambios en paralelo tocan Karts (27A: rivales en vivo en `juegos/en-vivo.js` y la parte
  multijugador; 28a: personajes en `juegos/personajes.js`, dibujo del piloto y selector de personajes). Este cambio
  solo toca pistas, escenario, copa y selector de pistas, y no fija la lista de personajes.
- **Datos:** el progreso de Karts (`/juegos/progreso/karts`) agrega la copa `mesoamericana` en `copas` y las pistas
  nuevas en `records`, con la misma forma. **Matriz de acceso:** sin cambios (cada persona solo ve y guarda su
  progreso, igual que antes).
- **Pruebas:** `server/karts_pistas_test.ts` (datos: trazados cerrados y manejables, minimapa coherente, copas) y
  `tests/e2e/e2e-karts.js` (selector, vuelta completa en cada pista nueva con el piloto de prueba, Copa
  Mesoamericana, fps con CPU ×4 y capturas).
- **Acciones externas:** ninguna (Pages publica con el merge a `main`).
