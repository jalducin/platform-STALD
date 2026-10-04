## Decisiones

### 1. Topic secreto
- `Sala.canal?: string` = 24 hex aleatorios (`crypto.getRandomValues`) al crear la sala.
- `GET /juegos/sala/<código>`, que ya exige ser jugador o admin, agrega
  `rt: { url, key: <publishable>, topic: "sala-" + canal }` solo si hay configuración y la sala tiene `canal`.
- Los canales son públicos de Realtime (`private: false`). La privacidad viene de que el topic no es adivinable,
  igual que los enlaces con token de las fotos.

### 2. Publicación desde Deno (`server/realtime.ts`)
- `publicarSala(cfg, topic, payload)` → `POST {url}/realtime/v1/api/broadcast` con `apikey` y
  `Authorization: Bearer <service>`, body `{ messages: [{ topic, event: "estado", payload, private: false }] }` y
  `AbortSignal.timeout(3000)`. Los errores se registran y se ignoran.
- En `handleSalas`, tras `unirse`, `empezar` y `respuesta` exitosos: se borra la caché de esa sala, se vuelve a leer
  `estado` y se publica `{ sala, jugadores, ahora }`.
- Cada guardado de un jugador sube su contador `EnSala.v` (1, 2, 3…). Así la página puede descartar avisos que
  llegan fuera de orden.
- `cfg` llega por `DepsJuegos.realtime` (inyectable en pruebas con un `fetch` falso).

### 3. Página (`juegos.html`)
- `conectarRealtime(rt)`:
  - carga `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js` (una vez);
  - `createClient(url, key).channel(topic).on('broadcast', { event: 'estado' }, …).subscribe(cb)`.
- Al recibir: se mezcla con el estado local:
  - por jugador gana el de mayor `v`; un jugador que solo existe localmente se conserva;
  - una sala ya empezada no vuelve a `inicio: null`;
  - recalcula `offset` y llama a `pintarSala()`.
- Estado del canal:
  - `SUBSCRIBED` → una consulta para ponerse al día (los avisos enviados antes de suscribirse no llegan) e
    intervalo de sondeo de 30 s;
  - `CHANNEL_ERROR`, `TIMED_OUT` o `CLOSED` → intervalo normal.
- `limpiar` desuscribe (`removeChannel`).

### 4. Medición esperada
- Quiz con 5 jugadores durante 10 min: de ~650 peticiones (con el ahorro de hoy) a ~50 envíos + ~100 de respaldo.
- ¡Una!: los envíos se quedan igual, y las consultas pasan de cada 2.5 s a cada 30 s.

### 5. Pruebas
- Unitarias:
  - canal al crear;
  - `rt` solo con configuración;
  - publicación tras unirse, empezar y responder, con topic y payload correctos;
  - la falla de la publicación no rompe la respuesta.
- E2E local con el proyecto real de Supabase (llaves solo como variables del proceso, nunca en archivos):
  - dos navegadores en una sala ven los cambios por Realtime sin sondear (se cuentan GET);
  - el corte del canal vuelve al sondeo.
