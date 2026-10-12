## Why

Dragon Run es un juego de correr y saltar, pero está en «⚡ Mente ágil». El profe pide pasarlo a «🕹️ Arcade», junto a
Axo y Karts. También pide misiones: una razón para volver cada día y metas a largo plazo, con premios que solo se ven
en el juego y no tienen valor real.

Hoy el juego no guarda nada en el servidor: solo el récord en `localStorage`. Las misiones necesitan un avance que
siga al alumno o alumna en cualquier celular. Para eso ya existe la ruta genérica `GET/PUT /juegos/progreso/<juego>`.

## What Changes

- **Categoría.** `dragon-run` pasa de `mente` a `arcade` en el catálogo de `juegos.html` y en `CATALOGO`
  (`server/juegos.ts`). El tope (2000), el título y la forma de sumar puntos no cambian.
- **Misiones diarias.** Cada día hay 3 misiones, siempre las mismas para la misma fecha y jugador. Ejemplos:
  «Recorre 1,000 m», «Junta 50 monedas», «Esquiva 15 obstáculos seguidos», «Llega al castillo» y «Haz 10 dobles
  saltos».
- **Logros permanentes.** Cinco logros con niveles 🥉 bronce, 🥈 plata y 🥇 oro: Explorador (metros), Coleccionista
  (monedas), Esquivador (obstáculos seguidos), Conquistador (castillos) y Constante (días seguidos).
- **Premios cosméticos.** Hay 6 colores del dragón y 4 estelas. Se desbloquean con logros y misiones, y no dan puntos
  ni ventajas.
- **Pantallas.**
  - Antes de correr, una pantalla muestra las misiones del día, los logros y los premios. Ahí se elige el color y
    la estela.
  - Al cumplir una misión durante la carrera aparece el aviso «¡Misión cumplida!».
  - Al terminar, el resultado de Juegos repite lo que se cumplió.
- **Avance en el servidor.** `dragon-run` se agrega a `JUEGOS_PROGRESO` (`server/progreso.ts`) con su validación de
  forma exacta: llaves, rangos, fechas, ids de premios y tamaño. `juegos.html` lee y guarda el avance como con Axo y
  Karts: el juego nunca llama al servidor.
- **Celular y accesibilidad.**
  - En `juegos.html`, el juego usa la caja `.arcade-caja`, como los otros juegos de Arcade.
  - Las pantallas usan tamaños legibles a 390 px.
  - Con `prefers-reduced-motion` no hay sacudidas y hay menos partículas.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`:
  - MODIFIED «Catálogo de juegos»: Arcade incluye Dragon Run.
  - MODIFIED «Dragon Run»: pasa a Arcade.
  - MODIFIED «Progreso individual de juegos en el servidor»: se agrega `dragon-run`.
  - ADDED «Misiones de Dragon Run».

## Impact

- **Superficies:** `juegos.html` y servidor Deno (`server/progreso.ts` y `server/juegos.ts`). No toca el portal,
  Inglés, Secundaria, Postgres, Realtime, Auth ni Notion.
- **Repo de datos:** archivos nuevos `juegos/progreso/dragon-run/<id-jugador>.json`. Solo guardan el id, sin correos.
- **Archivos:**
  - `juegos/dragon-run.html`.
  - `juegos/dragon-misiones.js` (nuevo): reglas de misiones y premios, compartidas con las pruebas de Deno.
  - `server/progreso.ts`, `server/juegos.ts`, `server/progreso_test.ts` y `server/juegos_test.ts`.
  - `tests/e2e/e2e-dragon-run.js` y `tests/e2e/e2e-juegos.js`.
  - `docs/data-model.md`, `docs/frontend-standards.md` y `docs/backend-standards.md`.
- **Matriz de acceso:** cada jugador lee y escribe solo su propio avance de Dragon Run, porque el id sale de la
  sesión. Nadie más lo ve, tampoco el admin. Es la misma regla de la ruta de progreso.
- **Acciones externas:** ninguna. Deno Deploy y Pages publican con el merge a `main` (lo hace el usuario).
