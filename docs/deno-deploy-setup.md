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

Con `DATA_DIR` el almacén es en memoria: no escribe en GitHub.
