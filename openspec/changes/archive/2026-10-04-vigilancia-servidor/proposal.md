## Why

Tras el incidente del 2026-10-02 (límite de la API de GitHub agotado), el profe pidió **recibir un correo cuando el
servidor se bloquee**. Deno Deploy no envía correo por sí solo, y no queremos sumar un proveedor con llaves.

## What Changes

- **Ruta `GET /salud`** en el servidor, sin correo:
  - consulta `https://api.github.com/rate_limit` con el token del servidor (esa consulta no cuenta contra el
    límite) y una lectura condicional del repo de datos;
  - responde `{ ok, github: { limite, usadas, restantes, reinicio }, estado }`, con `estado` = `ok`,
    `advertencia` (quedan menos del 10 %) o `bloqueado` (0 restantes o el repo no responde);
  - si está bloqueado, la respuesta es 503;
  - no expone el token ni datos privados.
- **Vigilante en GitHub Actions** (`.github/workflows/vigilancia.yml`), cada 15 min (y a mano):
  - **bloqueado** o el servidor no responde → abre un issue "🔴 Servidor bloqueado" que menciona a @jalducin
    (GitHub manda el correo de notificación) o comenta en el que ya esté abierto;
  - **advertencia** → abre o comenta "⚠️ Cerca del límite de GitHub";
  - **ok** con un aviso abierto → comenta "✅ Recuperado" y lo cierra.
  - Usa el `GITHUB_TOKEN` del workflow con `issues: write`, no el token del servidor. Repo público: minutos
    gratis.
- El correo llega a la dirección de notificaciones de la cuenta de GitHub `jalducin`. Si no es
  valentin.alducin88@gmail.com, el profe la cambia en Settings → Notifications → Custom routing.

## Capabilities

### Modified Capabilities
- `plataforma`: monitoreo del servidor con aviso por correo.

## Impact

- `server/main.ts` y `server/salud.ts` (nuevo), `.github/workflows/vigilancia.yml` (nuevo).
- Acciones externas: redeploy; el workflow corre en el repo público y abre issues cuando hay problema.
