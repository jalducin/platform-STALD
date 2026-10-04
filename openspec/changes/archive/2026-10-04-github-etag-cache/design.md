## Decisiones

### 1. Caché condicional en `GitHubStore`
- Mapa por instancia `clave → { etag, valor }`, con claves `get:<ruta>` y `list:<carpeta>`. Es LRU simple con
  tope de 3,000 entradas: al pasar el tope se borra la más antigua.
- **`get`**:
  - manda `If-None-Match` si ya hay `etag`;
  - **304** → regresa la copia;
  - **404** → borra la entrada y regresa `null`;
  - **200** → guarda el `etag` y el documento;
  - límite (ver §2) → regresa la copia si existe; si no, lanza `github_rate_limit`;
  - cualquier otro error → lanza `github_get_<status>`, como hoy.
- **`list`**: igual, con la lista de nombres.
- **`put` y `remove`**: si el cambio funciona, invalidan `get:<ruta>` y `list:<carpeta de la ruta>`. Un conflicto
  (409/422) también invalida `get:<ruta>`, para que el reintento lea fresco.

### 2. Cómo se detecta el límite
- La respuesta es 403 o 429.
- Además, cumple una de estas: `x-ratelimit-remaining` vale `0`, existe `retry-after`, o el cuerpo menciona
  `rate limit`.

### 3. Respuesta del servidor
- En `main.ts`, si el error es `github_rate_limit` → `503 { error: "mucho_trafico" }`; si no, `500 upstream_error`
  como hasta ahora.
- `juegos.html` e `ingles.html` traducen `mucho_trafico` a un mensaje amable.

### 4. Pruebas
Se sustituye `fetch` por uno falso que simula GitHub (ETag, 304, 404, 403 por límite) y se cuentan las llamadas.
