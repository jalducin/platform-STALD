## Decisiones

### 1. `server/salud.ts`
- `revisarSalud({ token, store, fetch })`:
  1. `GET https://api.github.com/rate_limit` con el token → `resources.core` (`limit`, `used`, `remaining`,
     `reset`). Esa consulta no consume el límite.
  2. `store.list("contenido/semanas")`, condicional con ETag, para confirmar que el repo responde. Si lanza
     `github_rate_limit` u otro error → `bloqueado`.
- `estado`:
  - `bloqueado` si `remaining === 0` o el repo falla;
  - `advertencia` si `remaining < 10 %` de `limit`;
  - `ok` en los demás casos.
- La respuesta incluye `reinicio` en ISO (hora UTC en que se libera) y nunca el token.
- `main.ts`: `/salud` antes de exigir correo, con 200 (ok o advertencia) o 503 (bloqueado). Con `DATA_DIR`
  (pruebas locales) responde ok con `github: null`.

### 2. Vigilante (`.github/workflows/vigilancia.yml`)
- `on: schedule: "*/15 * * * *"` y `workflow_dispatch`; `permissions: issues: write`; `concurrency` para no
  encimarse.
- Paso único con `bash` + `curl` + `jq` + `gh` (`GH_TOKEN: ${{ github.token }}`):
  - `curl --max-time 30` a `/salud`; si no hay respuesta o no es JSON → `estado = caido`;
  - busca un issue abierto con la etiqueta `vigilancia`;
  - `bloqueado` o `caido` → crea (o comenta) "🔴 Servidor bloqueado" con @jalducin, las lecturas restantes y la
    hora de reinicio en CDMX;
  - `advertencia` → crea (o comenta) "⚠️ Cerca del límite de GitHub";
  - `ok` y hay un issue abierto → comenta "✅ Recuperado" y lo cierra.
  - Si está abierto y el estado no cambió, no vuelve a comentar en cada corrida (evita el spam de correos).
- La etiqueta `vigilancia` se crea si no existe.

### 3. Por qué no un proveedor de correo
Resend o SES requieren cuenta y llave nueva. Las notificaciones de GitHub ya llegan por correo, son gratis y dejan
historial en los issues.
