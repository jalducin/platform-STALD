# Configurar el backend en Deno Deploy (una sola vez)

El backend (`server/main.ts`) corre en Deno Deploy y guarda el contenido y los resultados en el repo
privado `jalducin/platform-STALD-data`. No usa Supabase. Necesitas 3 datos y unos 10 minutos.

## 1. Token de GitHub solo para el repo de datos

1. Entra a <https://github.com/settings/personal-access-tokens/new> (fine-grained token).
2. **Token name:** `platform-STALD-data`. **Expiration:** 1 año (o la que prefieras).
3. **Repository access:** *Only select repositories* → `jalducin/platform-STALD-data`.
4. **Permissions → Repository permissions → Contents:** *Read and write*. No actives nada más.
5. **Generate token** y copia el valor (empieza con `github_pat_…`). Solo se muestra una vez.

## 2. Token de Notion

1. Entra a <https://www.notion.so/profile/integrations> → integración **Dashboard Tareas**.
2. Copia el **Internal Integration Secret** (empieza con `ntn_…` o `secret_…`).

## 3. Proyecto en Deno Deploy

1. Entra a <https://dash.deno.com> con tu cuenta de GitHub (si te manda a `console.deno.com`, es la
   versión nueva y los pasos son equivalentes).
2. **New Project** → elige el repo `jalducin/platform-STALD`, rama `main`.
3. **Entrypoint:** `server/main.ts`. Sin paso de build. **Create / Deploy**.
4. En **Settings → Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `NOTION_TOKEN` | el secreto de Notion (paso 2) |
| `SUPER_ADMIN_EMAIL` | tu correo de admin |
| `GITHUB_TOKEN` | el token de GitHub (paso 1) |
| `DATA_REPO` | `jalducin/platform-STALD-data` |
| `SUPABASE_URL` | `https://eolsklubeywfmuyrtxla.supabase.co` (opcional: partidas en tiempo real, cambio `salas-realtime`) |
| `SUPABASE_PUBLISHABLE_KEY` | llave *publishable* del proyecto (va al navegador) |
| `STALD_TABLAS` | opcional; prefijo de las tablas de Inglés en Postgres. Por omisión `stald_`; solo las pruebas usan `stald_test_` (cambio `ingles-grupos`) |
| `SUPABASE_SERVICE_KEY` | llave `service_role` (Legacy API keys) o *secret*; solo servidor |
| `LOGIN_TRANSICION_HASTA` | opcional (`AAAA-MM-DD`); último día en que se acepta `?email=` sin sesión. Por omisión `2026-10-12` (constante en `server/auth.ts`, cambio `plataforma-login`) |
| `SITIO_URL` | opcional; a dónde llevan los enlaces de acceso que genera el profe. Por omisión `https://jalducin.github.io/platform-STALD/` |

**Inicio de sesión (cambio `plataforma-login`):** usa las mismas `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para
validar las sesiones (`/auth/v1/user`) y `SUPABASE_SERVICE_KEY` para el «🔗 Enlace de acceso» del profe. La
configuración de Supabase Auth (URL del sitio, redirecciones, plantilla y SMTP) está en el reporte
`openspec/changes/plataforma-login/reports/2026-10-04-step-5-pruebas-y-verificacion.md`.

5. Copia la URL del proyecto (algo como `https://platform-stald.deno.dev`) y pásamela. Con ella cambio
   `DEFAULT_API` en `ingles.html` y verifico todo en producción.

Cada push a `main` vuelve a publicar el backend automáticamente.

## Probar en local (desarrollo)

```bash
DATA_DIR=<copia local del repo de datos> ROWS_FIXTURE=<filas simuladas.json> \
SUPER_ADMIN_EMAIL=admin@example.com PORT=8787 \
npx -y deno run --allow-net --allow-env --allow-read server/main.ts
# y abrir ingles.html?api=http://127.0.0.1:8787
```

Con `ROWS_FIXTURE`, `GET /config` responde `{ prueba: true }`: la pantalla de entrada no manda correos y acepta
cualquier código de 6 dígitos; la sesión es `Bearer prueba:<correo>`. Para entrar directo en un E2E:
`localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email, token: 'prueba:' + email }))`.

Con `DATA_DIR` el almacén es en memoria: no escribe en GitHub.
