## Decisiones

### 1. Fuente de datos

- Se reutiliza la semana que ya lee el ranking (`leerSemana(store, lunes)`): un documento por persona en
  `juegos/semanas/<lunes>/<id>.json` con `partidas[]` (`juego`, `puntos`, `modo: "sala"` en las de sala).
- **Bots:** los bots viven solo en el navegador del host y, como mucho, en el `podio` de la sala; nunca envían
  `POST /juegos/partida`, así que no tienen documento de semana. Contar documentos = contar personas. Por defensa, se
  ignoran documentos cuyo `tipo` no sea `alumno`, `invitado` o `admin`.
- Solo cuentan juegos del `CATALOGO` del servidor (un id desconocido en datos viejos se ignora).

### 2. Agregado (`juegosPopulares(semana): JuegoPopular[]`)

```ts
interface JuegoPopular { pos: number; id: string; titulo: string; jugadores: number; partidas: number;
  mejor: { nombre: string; puntos: number } | null }
```

- `jugadores` = documentos distintos con al menos una partida del juego (individual o sala).
- `partidas` = número de partidas del juego (individuales + sala).
- `mejor` = la partida con más puntos de ese juego (cualquier modo, igual que `mejores` del documento); empate → la
  más antigua (`en`). Si el mejor es 0 puntos, `mejor` es `null`. `nombre` es el nombre visible del documento (nick o
  nombre de pila), el mismo que ya publica `/juegos/ranking`.
- Orden: `jugadores` desc → `partidas` desc → `titulo` (es-MX). `pos` = índice + 1.
- Complejidad O(partidas de la semana); sin lecturas extra.

### 3. Caché

- `leerSemana` ya usa `crearMemo({ ttlMs: 30_000 })` con single-flight; `POST /juegos/partida`, el nick y el avatar
  la borran (`cache.borrar(lunes)`).
- El agregado se memoriza en un `WeakMap<Semana[], JuegoPopular[]>` con el arreglo de la caché como llave: se
  calcula una sola vez por carga y se libera solo cuando la caché suelta ese arreglo. No hay otra vigencia que
  mantener ni un `Map` con `Date.now()`.
- `leerSemana` pasa de `list` + un `get` por archivo a `leerCarpeta(store, dir)` de `server/db.ts`: con Juegos en
  Postgres es **una** consulta (`path=like.juegos/semanas/<lunes>/*`); con otro almacén hace lo mismo que antes.
- Caché HTTP: misma política que `/juegos/ranking` (`private, no-cache`, `Vary: Authorization`, ETag): la respuesta
  es igual para todos y no trae datos de quien la pide.

**Alternativa descartada:** `?tipo=juegos` en `/juegos/ranking`. Cambiaría la forma del JSON según un parámetro
(`top` de personas vs. de juegos) y obligaría a ramificar el cliente y las pruebas existentes. Una ruta propia
mantiene intacto el contrato actual.

### 4. Contrato

`GET /juegos/ranking/juegos?semana=<AAAA-MM-DD>` (por omisión, la semana actual; cualquier fecha se lleva a su lunes)

```json
{ "semana": "2026-09-28", "jugadores": 9,
  "juegos": [{ "pos": 1, "id": "cultura", "titulo": "Maratón de cultura", "jugadores": 5, "partidas": 14,
               "mejor": { "nombre": "Sofy", "puntos": 2350 } }] }
```

- `jugadores` (raíz) = personas distintas que jugaron algo en la semana.
- 400 `semana_invalida`; 401 sin sesión y 403 `no_registrado`, como el resto de `/juegos/…`.

### 5. Página

- `state.rtipo` admite `juegos`; `pintarRanking` delega a `pintarRankingJuegos` (función nueva, aislada) para no
  mezclarse con el ranking de personas. Petición con `ttl: 30000`, como el ranking actual.
- Emoji y nombre: del catálogo del cliente (`juegoPorId`); si no existe ahí, el `titulo` del servidor y 🎮.
- Fila: `.pos` (🥇🥈🥉 o número), emoji, nombre, «N jugadores · M partidas» (singular con 1), barra
  (`.rj-barra`, ancho = jugadores ÷ jugadores del líder, `aria-hidden`: el texto ya dice los números) y
  «👑 Mejor puntaje: {nick}» cuando hay `mejor`.
- Lista semántica `<ol class="rank">` con `aria-label`. Las sub-pestañas conservan su patrón actual
  (`button.opt` con `aria-pressed`, el mismo de ⭐ y 👥, que ya usan las E2E); la tercera usa la misma regla.
- 390 px: las tres sub-pestañas en una fila (`.opts.tres`, 3 columnas, letra un poco menor).
