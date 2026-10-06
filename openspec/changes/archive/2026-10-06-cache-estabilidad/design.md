## Contexto
Páginas estáticas en GitHub Pages (otro origen que el API en Deno Deploy). Toda petición con sesión lleva
`Authorization: Bearer`, así que es una petición CORS «no simple»: necesita una verificación previa `OPTIONS` salvo
que el navegador la tenga en su caché (por URL, hasta 2 h en Chromium, según `Access-Control-Max-Age`). El servidor
corre en varias instancias de Deno Deploy, cada una con sus cachés en memoria; las fuentes son Notion (lento, límite
de ~3 peticiones/s), Postgres de Supabase y la API de contenidos de GitHub (5,000/h).

## Decisiones

### 1. Caché de verificaciones previas: `cache: 'default'` en el cliente
Experimento en Chromium 1228 (servidor con `Access-Control-Max-Age: 86400`): 3 `fetch` iguales con `Authorization`
- `cache: 'no-store'` → 3 `OPTIONS` + 3 `GET`;
- `cache: 'no-cache'` → 3 `OPTIONS` + 3 `GET`;
- `cache: 'default'` → 1 `OPTIONS` + 3 `GET`.

Chromium no usa la caché de verificaciones previas cuando la petición pide saltarse la caché HTTP. Por eso
`fetchConSesion` pasa a `cache: 'default'` (se respeta si el llamador pide otro modo). La frescura no cambia: el
servidor sigue respondiendo `Cache-Control: no-store` en las rutas con datos personales, así que el navegador no
guarda esas respuestas y siempre va a la red.

*Alternativa descartada:* mandar el token en la URL o como `text/plain` para evitar el `OPTIONS`: expone el token en
registros o cambia el contrato.

### 2. Política de caché HTTP por ruta (`server/http_cache.ts`)
`politicaCache(ruta)` decide, y `aplicarCacheHttp(req, res, politica)` aplica, solo a `GET` con 200:
| Ruta | `Cache-Control` | ETag / 304 |
|---|---|---|
| `/config` | `public, max-age=600` | sí |
| `/juegos/ranking` | `private, no-cache` + `Vary: Authorization` | sí |
| demás | `no-store, no-cache, must-revalidate` (como hoy) | no |

- ETag débil `W/"<SHA-256 del cuerpo, base64url, 22 caracteres>"`. Si `If-None-Match` lo trae (lista o `*`), 304
  sin cuerpo con los mismos encabezados CORS. El navegador agrega `If-None-Match` por su cuenta al revalidar; no es
  un encabezado del autor, así que no provoca verificación previa.
- El ranking no lleva correos y es el mismo para todos los jugadores (solo `yo` cambia por persona; por eso
  `private` + `Vary: Authorization`). `no-cache` obliga a revalidar en cada uso: nunca se muestra uno viejo sin
  preguntar. Ahorra bytes, no peticiones.
- No se agrega ETag a rutas con datos personales (actividades, perfil, filas): para que el navegador mande
  `If-None-Match` tendría que guardar la respuesta en disco, y en aparatos compartidos de la escuela eso deja datos
  de menores en la caché del navegador después de cerrar sesión. El ahorro (solo bytes) no lo justifica.
- Una respuesta 503/401/4xx nunca se guarda: la política solo aplica a 200.

### 3. Single-flight y vigencia en el servidor (`server/cache.ts`)
`crearMemo<T>({ ttlMs, staleMs?, max?, ahora? })` → `{ get(clave, cargar), borrar(clave?) }`:
- Vigente → valor guardado. Si ya hay una carga en vuelo para la clave → la misma promesa (single-flight).
- Si `cargar` falla y hay copia con menos de `staleMs` → la copia (se registra el error); si no, el error sube.
- `borrar` quita el valor **y** la carga en vuelo: quien pida después de una escritura no se cuelga de una lectura
  que empezó antes.
- Tope de entradas (`max`, por omisión 500) con desalojo del más viejo.

`unaALaVez()` → `(clave, fn)`: solo single-flight, sin guardar (para `GitHubStore.leer`, que ya tiene su caché con
ETag). `GitHubStore.invalidar` también olvida la lectura en vuelo de esa ruta y de su carpeta.

Aplicación:
| Lugar | Vigencia | Copia ante error | Invalidación |
|---|---|---|---|
| `loadRows` (filas de Notion por base) | 60 s | 10 min | `parcheCompletado` borra Inglés |
| `resolveUser` (usuarios de Notion) | 10 min | — | — |
| `leerMarcas` | 60 s (como hoy) | se conserva lo último (como hoy) | — |
| `cached` de actividades | 60 s (como hoy) | — | `clearCache()` |
| `leerSemana` de Juegos | 30 s (como hoy) | — | al guardar partida |
| `GitHubStore.get/list` | ETag (como hoy) | límite → copia (como hoy) | `put`/`remove` |

- `loadRows` devuelve una **copia** (`structuredClone`) del valor guardado: `filasNotion` aplica las marcas del modo
  de pruebas sobre las filas y `aplicarAlumnos` arma filas nuevas; así nadie modifica la copia compartida. Con
  `ROWS_FIXTURE` también se guarda (lee el archivo una vez por minuto), para que las E2E ejerzan el mismo camino.
- 60 s es lo que ya tardaba en verse un cambio en Notion por las otras cachés (identidad de Juegos 60 s, contenido
  60 s). Notion ya no es la fuente viva de Inglés; solo historial.

### 4. `StaldAuth.pedirJson` (cliente)
```
pedirJson(url, opts?, { ttl? }) → Promise<{ ok, status, body }>
```
- Clave = correo de la sesión (o `anon`) + URL. Las páginas ya mandan el correo en la URL durante la transición.
- `GET`: si hay valor con `ttl` vigente → copia (`JSON.parse(JSON.stringify())`); si hay una petición en vuelo con
  la misma clave → la misma promesa; si no, red. Solo se guarda con `ttl` y respuesta `ok`.
- Reintentos solo de `GET`: red caída (fetch lanza), 429, 502, 503, 504. Esperas `600 ms` y `1800 ms`
  (`Retry-After` en segundos manda, con tope de 5 s). `window.__REINTENTO_MS` (solo pruebas) cambia la base.
- No `GET` (POST, DELETE): una sola vez; al terminar (bien o mal) vacía la memoria (los datos pudieron cambiar).
  Un POST con red caída devuelve `status: 0` sin reintentar: si el servidor lo alcanzó a procesar, reintentar
  duplicaría la escritura.
- Sin red tras los reintentos: `{ ok: false, status: 0, body: { error: 'sin_conexion', mensaje: 'Sin conexión…' } }`.
- 401 de sesión: igual que hoy (cada página llama a su `sesionVencida`); no se reintenta.
- `salir()` y `limpiarCache()` vacían la memoria.

`api()` de `juegos.html` y de `ingles/comun.js` delegan en `pedirJson` (Inglés conserva el respaldo sin
`StaldAuth`). El portal usa `fetchConSesion` directo (dos peticiones al cargar): gana con la decisión 1 sin más cambios.

### 5. Sondeo de salas
- El ciclo atrapa cualquier error (`traerSala().catch`) y siempre reprograma: nunca se queda detenido por la red.
- Fallos seguidos (`status` 0, 429 o ≥ 500) → espera `min(30 s, base × 2^fallos)` y aviso `#p-red` «📶 Reconectando…»;
  al primer éxito vuelve a la base y se oculta el aviso. 403/404/410 detienen como hoy.
- `visibilitychange` a visible con la sala abierta: cancela la espera y consulta enseguida (sin duplicar: si ya hay
  una consulta en vuelo, la deduplica `pedirJson`).
- Con Realtime conectado el respaldo sigue en 30 s (ya estaba así).

### 6. Medición
`tests/e2e/e2e-peticiones.js` levanta un proxy HTTP local entre las páginas y el API (`?api=<proxy>`), cuenta cada
petición (con `OPTIONS` y su status) y puede inyectar fallas (`503` o socket cerrado) por ruta. Con `MEDIR=1` solo
imprime; sin él compara cada flujo con su umbral. Los flujos y umbrales están en el archivo; la tabla antes/después,
en el reporte.

## Riesgos
- Navegadores que no cachean verificaciones previas (o con DevTools «Disable cache») no ganan, pero tampoco pierden.
- Un cambio en Notion tarda hasta 60 s más en verse en `/perfil` (antes, inmediato). Aceptado: Notion es historial.
- El ranking puede mostrarse hasta 30 s viejo en la misma página si nadie de esa página jugó (un envío lo vacía).
