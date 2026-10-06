## Por qué
Encargo del profe (sprint 4): «Mejor manejo de caché para menos peticiones y mayor estabilidad.»

Línea base medida con la E2E nueva `tests/e2e/e2e-peticiones.js`, que cuenta en un proxy todo lo que llega al API
(también las verificaciones previas `OPTIONS`, que el navegador no muestra). Tabla completa en el reporte del cambio.
Hallazgos (verificados en el código y con un experimento en Chromium):

- **La mitad de las peticiones son `OPTIONS`.** `StaldAuth.fetchConSesion` (y `api()` de Inglés) piden con
  `cache: 'no-store'`. En Chromium ese modo **se salta la caché de verificaciones previas**: cada petición con
  `Authorization` paga un `OPTIONS` aunque el servidor mande `Access-Control-Max-Age: 86400`. Una sala de 2 personas
  durante 30 s hace 64 peticiones, 31 de ellas `OPTIONS`; alternar 4 veces las pestañas del ranking, 12.
- **`/config` se pide en cada página** (4 veces al ir del portal a Inglés, al portal y a Juegos) aunque no cambia.
- **El ranking se vuelve a pedir en cada clic** de pestaña (5 `GET` en 5 clics).
- **Fragilidad del sondeo de salas.** Si la red falla una vez, `fetch` lanza, la promesa del ciclo se rechaza y el
  sondeo **se detiene para siempre** (la partida se congela). Al volver a la pestaña, espera el intervalo completo.
- **Sin reintentos.** Un `503 mucho_trafico` pasajero se muestra como error («No se pudo cargar el ranking»).
- **Servidor.** `loadRows` (filas de Notion) **no tiene caché**: cada `/perfil`, `/ingles/data`, `/ingles/actividades`,
  `/ingles/resumen` y la identidad de Juegos consulta la base completa de Notion y resuelve a cada usuario (una
  petición por persona). Las cachés de corta vida (`cached` de actividades, `leerSemana`, `leerMarcas`) y las
  lecturas de `GitHubStore` no coalescen: varias peticiones simultáneas con la caché vencida salen todas a la fuente.
  `juegos/datos/*.json` se queda con una promesa rechazada si falla una vez.

## Qué cambia
- **Cliente (`comun/auth.js`, `juegos.html`, `ingles/comun.js`):**
  - `fetchConSesion` usa la caché por omisión del navegador (`cache: 'default'`): las respuestas del API siguen
    siendo `no-store` (no se guardan), pero la verificación previa se reutiliza por URL. `/config` se pide sin
    `no-store` y el servidor la deja guardar 10 min.
  - `StaldAuth.pedirJson(url, opts, { ttl })`: única salida de peticiones JSON de Juegos e Inglés. Junta peticiones
    `GET` idénticas en vuelo, guarda en memoria las que piden `ttl` (por persona: la clave lleva el correo de la
    sesión), vacía esa memoria tras cualquier envío (`POST`/`DELETE`) y al cerrar sesión, y reintenta los `GET` ante
    red caída, 429, 502, 503 y 504 (2 reintentos con espera creciente, respetando `Retry-After` hasta 5 s). Los
    envíos **no** se reintentan solos (no son idempotentes). Sin red, responde `{ ok: false, status: 0, error:
    'sin_conexion' }` con un mensaje amable en lugar de lanzar.
  - Ranking de Juegos con `ttl` de 30 s.
  - Sondeo de salas: nunca se detiene por un error de red; espera creciente (2.5 → 5 → 10 → 20 → 30 s) mientras falle,
    con el aviso «📶 Reconectando…», y vuelve a su ritmo al primer éxito. Con la pestaña oculta no consulta; al volver
    a verse, consulta enseguida.
  - `juegos/datos/*.json`: si falla la descarga, se olvida la promesa para reintentar la próxima vez.
- **Servidor (`server/`):**
  - `server/cache.ts`: `crearMemo` (caché por clave con vigencia, **single-flight** y copia vieja ante error por un
    tiempo acotado) y `unaALaVez` (single-flight sin vigencia).
  - Filas de Notion (`loadRows`) en caché 60 s, con single-flight, copia vieja hasta 10 min si Notion falla y
    usuarios de Notion resueltos en caché 10 min. Marcar «Completado» invalida las filas de Inglés.
  - Single-flight en `GitHubStore` (lecturas condicionales), `cached` de actividades, `leerSemana` de Juegos y
    `leerMarcas`.
  - `server/http_cache.ts`: política de caché HTTP por ruta. `/config` → `public, max-age=600`; `/juegos/ranking` →
    `private, no-cache` con `ETag` y `Vary: Authorization`, y 304 si `If-None-Match` coincide. Las demás rutas siguen
    `no-store` (datos personales: no se guardan en el aparato).

No cambian reglas de negocio, rutas, parámetros ni la forma del JSON.

## Superficies
- `comun/auth.js` (con `?v=5` en `index.html`, `ingles.html`, `juegos.html` y `secundaria.html`), `juegos.html`,
  `ingles/comun.js`.
- Servidor Deno: `server/main.ts`, `server/store.ts`, `server/actividades.ts`, `server/juegos.ts`; nuevos
  `server/cache.ts` y `server/http_cache.ts` con sus pruebas.
- Pruebas E2E: nueva `tests/e2e/e2e-peticiones.js` (fase `base`).
- Documentación: `docs/backend-standards.md`, `docs/frontend-standards.md`.
- Sin cambios en Postgres, Realtime, Auth, repo de datos ni Notion.

## Matriz de acceso
No cambia quién ve qué. La caché del cliente vive en memoria de la página, con el correo de la sesión en la clave, y
se vacía al cerrar sesión: nunca sirve datos de otra persona. El servidor solo deja guardar en el aparato `/config`
(pública) y el ranking (`private`, sin correos, el mismo que ve cualquier jugador); con `Vary: Authorization` y
revalidación en cada uso (`no-cache`). Las cachés del servidor ya existían por instancia; ahora se coalescen y la de
Notion guarda las filas completas, igual que hoy las cargaba en cada petición: el filtro por correo se sigue aplicando
en cada respuesta.

## Acciones externas
Ninguna. Se publica con el merge a `main` (Pages y Deno Deploy); el usuario integra.
