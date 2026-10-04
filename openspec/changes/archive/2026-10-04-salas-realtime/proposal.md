## Why

Deno Deploy avisó el 2026-10-03 del 90 % de las HTTP Requests del plan gratis. Las salas consultan su estado cada
2.5–5 s por jugador, y eso es el grueso del consumo. El profe decidió usar **Supabase** en el mismo proyecto de su
portafolio (`Portafolio`, ref `eolsklubeywfmuyrtxla`, organización "haljordan's Org", free), con dos repos apuntando al
mismo proyecto.

Mover el servidor a funciones de Supabase no reduce peticiones: su plan gratis trae menos invocaciones de funciones
que Deno. Lo que sí las elimina es **Supabase Realtime**: el servidor empuja el estado y las páginas dejan de
preguntar.

## What Changes

- **Canal secreto por sala:** al crear una sala se genera `canal` (24 hex). Solo se entrega a jugadores y al admin,
  en el `GET` de la sala.
- **Deno publica el estado** tras cada escritura de una sala (unirse, empezar, respuesta) con un *broadcast* de
  Realtime: `POST <SUPABASE_URL>/realtime/v1/api/broadcast` con la llave de servicio, topic `sala-<canal>`, evento
  `estado` y payload `{ sala, jugadores, ahora }`. Tiene tope de 3 s y, si falla, no rompe la respuesta.
- **Las páginas se suscriben** con supabase-js (CDN jsDelivr, versión fija, carga diferida solo en salas) y la llave
  pública:
  - suscritas: aplican el estado recibido y sondean solo cada 30 s como respaldo;
  - si el canal falla o se cierra: vuelven al sondeo actual (2.5 s o 5 s).
- **Sin datos personales en el canal:** el estado ya no lleva correos (como hoy), y el topic no es adivinable.
- **Configuración:** variables de Deno `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (pública) y
  `SUPABASE_SERVICE_KEY` (secreta). Sin ellas todo funciona como hoy (sondeo), así se puede desplegar antes de
  configurarlas.
- Las salas creadas antes del cambio (sin `canal`) siguen con sondeo.

## Capabilities

### Modified Capabilities
- `juegos`: partidas en tiempo real con Supabase Realtime.

## Impact

- `server/salas.ts`, `server/juegos.ts`, `server/main.ts`, `juegos.html` y pruebas.
- Supabase (proyecto Portafolio): solo Realtime Broadcast, sin tablas ni migraciones en esta fase. La parte del
  portafolio (`contact_messages`) no se toca.
- **Paso del profe:** cargar las 3 variables en Deno Deploy. El agente le da los valores fuera del repo.
- Fase 2, opcional: mover el almacenamiento de salas del repo de GitHub a Postgres en el mismo proyecto.
