## Why

El ranking de Juegos muestra quién juega más (⭐ Individuales y 👥 Partidas), pero no qué juegos están de moda.
Los alumnos y alumnas quieren saber cuáles juegos se juegan más en la semana, y al profe le sirve para ver qué
juegos enganchan. Hoy ese dato existe (cada partida guarda su `juego` en `juegos/semanas/<lunes>/<id>.json`), pero
nadie lo agrega.

## What Changes

- **Servidor (`server/juegos.ts`):**
  - función pura `juegosPopulares(semana)`: por cada juego del catálogo con al menos 1 jugador, cuenta
    jugadores distintos y partidas (individuales y de sala), y el mejor puntaje con el nombre visible (nick);
  - orden: jugadores distintos (mayor a menor), luego partidas, luego título;
  - los bots no cuentan: no tienen archivo de semana; solo cuentan los documentos de personas;
  - ruta nueva `GET /juegos/ranking/juegos?semana=<lunes>` → `{ semana, juegos[], jugadores }`, sin correos;
  - el agregado se calcula una vez por carga de la semana en caché (30 s) y la semana se lee con `leerCarpeta`
    (una sola consulta en Postgres en lugar de una por archivo).
- **Caché HTTP (`server/http_cache.ts`):** la ruta nueva usa la misma política que `/juegos/ranking`
  (`private, no-cache` con ETag).
- **Página (`juegos.html`):** tercera sub-pestaña «🔥 Juegos» en 🏆 Ranking, con el mismo encabezado de semana:
  - lista ordenada con 🥇🥈🥉, emoji y nombre del juego, «N jugadores · M partidas», barra proporcional al líder y
    «👑 Mejor puntaje: {nick}»;
  - vacío amable: «Todavía nadie juega esta semana. ¡Estrena un juego!»;
  - las tres sub-pestañas caben en una fila a 390 px.

## Capabilities

### Modified Capabilities
- `juegos`: ranking semanal de los juegos más jugados.

## Impact

- **Superficies:** `juegos.html` y servidor Deno (`server/juegos.ts`, `server/http_cache.ts`). No toca `index.html`,
  `ingles.html`, `secundaria.html`, Postgres (salvo leer `stald_docs` como hoy), Realtime, Auth ni Notion.
- **Contrato HTTP:** ruta nueva `GET /juegos/ranking/juegos`; `/juegos/ranking` no cambia. Única consumidora:
  `juegos.html`.
- **Privacidad / matriz de acceso:**
  - cualquier jugador o jugadora registrada (alumno, alumna, invitado, admin) ve el mismo top;
  - sin sesión o sin registro → 401 / 403 `no_registrado`, como el ranking actual;
  - el top solo trae ids del catálogo, títulos, conteos y el nombre visible (nick o nombre de pila) de quien tiene el
    mejor puntaje, el mismo que ya se ve en el ranking de jugadores. Nunca correos ni ids de jugador.
- **Acciones externas:** redeploy de Deno Deploy y publicación en Pages con el merge a `main` (integrador).
