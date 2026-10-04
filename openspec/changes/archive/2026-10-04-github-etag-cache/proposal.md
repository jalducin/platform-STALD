## Why

Incidente del 2026-10-02 (21:00 CDMX): **se cayeron Juegos, Inglés y el portal** (`500 upstream_error` en todas
las rutas). La causa fue que se agotó el límite de la API de GitHub (5,000 por hora por usuario) que usa el
servidor para leer el repo privado de datos.

Las partidas consultan su estado cada 2 s y cada consulta lee varios archivos, así que con el uso normal el límite
puede agotarse. Desde `alta-alumnos`, Inglés y el portal también leen el repo de datos, por eso se cayó todo.

## What Changes

- **Peticiones condicionales (ETag) en `GitHubStore`.** `get` y `list` guardan el `ETag` y el contenido de cada
  ruta y mandan `If-None-Match`. Si GitHub responde **304** (sin cambios), se usa la copia en memoria. Según la
  documentación de GitHub, **las respuestas 304 no cuentan contra el límite**, y la mayoría de las consultas de
  sala y de los catálogos regresan sin cambios.
- **Copia de respaldo cuando se agota el límite.** Si GitHub responde por límite (403/429 con
  `x-ratelimit-remaining: 0` o un mensaje de *rate limit*), `get` y `list` regresan la última copia conocida en
  lugar de fallar. Si no hay copia, lanzan `github_rate_limit`.
- **Error claro.** Cuando el límite lo impide, el servidor responde `503 { error: "mucho_trafico" }` en lugar de
  `500 upstream_error`, y Juegos e Inglés muestran "Hay mucha actividad; intenta de nuevo en unos minutos".
- Escribir (`put`) o borrar (`remove`) invalida la copia de esa ruta y la lista de su carpeta.
- La caché de cada instancia tiene un tope de entradas para no crecer sin límite.
- **Sesiones muertas** (pedido del profe): una pestaña olvidada en una partida seguía consultando cada 2.5 s. Ahora:
  - la página deja de consultar cuando la partida terminó, cuando la sala venció o ya no existe (410/403/404), o tras
    1 h abierta;
  - el servidor responde 410 a una sala vencida sin leer a sus jugadores.

## Capabilities

### Modified Capabilities
- `plataforma`: resiliencia del almacén ante el límite de la API de GitHub.

## Impact

- `server/store.ts`, `server/main.ts`, `juegos.html` e `ingles.html` (mensaje), y pruebas.
- Acciones externas: redeploy tras el reinicio del límite y verificación en producción.
