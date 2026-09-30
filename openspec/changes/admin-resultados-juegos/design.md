## Decisiones

### 1. Índice semanal de salas
`GitHubStore.list` solo lista archivos, no carpetas. Para no recorrer `juegos/salas/`, al crear una sala
se agrega `{ codigo, juego, host (nombre), creada }` a `juegos/salas-semana/<lunes>.json` (con `sha` y
reintentos). El resumen lee ese índice y los archivos de cada sala.

### 2. Total final y podio
- `POST /juegos/sala/<código>/respuesta` acepta además:
  - `final` (0–3000): el total del jugador; cualquier jugador lo envía;
  - `podio` (hasta 32 entradas `{ nombre ≤ 30, total 0–3000, bot? }`): solo el host.
- `juegos.html` los envía al mostrar el podio. El total es el mismo que ya se calcula en el cliente para
  el ranking.

### 3. `GET /juegos/admin/resumen`
- Solo `tipo === "admin"` (403 para los demás). Acepta `?semana=<lunes>`; por defecto, la actual.
- **`jugadores`:** todos los archivos de `juegos/semanas/<lunes>/`, con `nombre`, `tipo`, `total`,
  `mejores`, número de partidas y la última. Ordenados por total.
- **`salas`:** por cada entrada del índice, sus jugadores (`nombre`, `tipo`, `final`, respuestas
  contestadas) y el `podio` del host.
- **`catalogo`:** `{ id: titulo }`, para mostrar nombres de juego.
- No incluye correos.

### 4. Enlace de partida
- Al cargar, `juegos.html` lee `?sala=` (4 letras) y lo guarda solo en memoria. Tras entrar (o registrarse
  como invitado, sin recargar), llama a `unirse` y abre la sala. Si falla (no existe, ya empezó), muestra la
  pestaña Partidas con el aviso.
- **Enlace:** `origen + ruta + ?sala=<código>`; se conserva `?api=` para pruebas.
- **"📤 Compartir":** usa `navigator.share` si existe; si no, `navigator.clipboard.writeText` y muestra
  "¡Enlace copiado!".
- **QR:** qrcodejs de cdnjs, cargado solo al abrir la sala de espera; es la misma excepción ya justificada
  para la presentación.

### 5. Vista de admin (`ingles.html`)
- Se carga junto con las actividades, solo para el admin.
- Si falla, la tarjeta muestra el aviso y el resto de la vista no se afecta.
- **Tarjeta plegable "🎮 Juegos de la semana":**
  - tabla del ranking: nombre (con "(invitado)" si aplica), ⭐ total, juegos distintos y partidas;
  - "Partidas de la semana": una por sala, con el juego, la fecha y hora, el anfitrión y el podio (del
    host o, si falta, los `final` de cada jugador), de la más reciente a la más antigua.
- **Bloque del alumno o alumna:** se empareja por nombre (el jugador `a-<slug>` usa el mismo "Nombre" de
  Notion).
