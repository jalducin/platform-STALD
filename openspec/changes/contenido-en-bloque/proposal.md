## Why

Incidente del 2026-11-23 (18:22 CDMX): `/salud` respondió 503 `github_rate_limit` (5000 de 5000 consultas usadas). El
contenido se lee archivo por archivo: una instancia recién arrancada, sin ETag en memoria, gasta hasta 682 consultas
(129 de Inglés, 306 de la ruta del profe y 247 de Secundaria, medido con los datos reales). Unos 7 arranques completos en
una hora agotan el límite, y una instancia nueva no tiene copia que servir.

## What Changes

- `server/contenido.ts`: `ContenidoStore` lee `contenido/**` de un solo paquete (tarball del commit de `main`).
- A lo más cada 60 s revisa el commit con una petición condicional; solo baja el paquete si cambió.
- Con Postgres, deja un respaldo comprimido en `stald_docs` (`respaldo/contenido`). Solo se lee si GitHub falla y la
  instancia no tiene copia en memoria.
- Sin paquete ni respaldo, se lee archivo por archivo, como antes.

## Capabilities

### Modified Capabilities
- `plataforma`: lectura del contenido en bloque y respaldo.

## Impact

- Superficies: servidor Deno (`server/contenido.ts`, `server/main.ts`), Postgres (una fila en `stald_docs`, sin migración)
  y docs. Ninguna página cambia y el contrato HTTP tampoco.
- Matriz de acceso: no cambia. El respaldo trae respuestas correctas y vive en `stald_docs` (RLS sin políticas: solo la
  llave de servicio). Nunca se responde tal cual; pasa por las mismas reglas de las rutas.
- Acciones externas: ninguna manual (agente: verificar en producción).
