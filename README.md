# platform-STALD

Dashboards de tareas escolares alimentados desde Notion (Secundaria e Inglés).

- Portal (entrada única): https://jalducin.github.io/platform-STALD/
- Secundaria: https://jalducin.github.io/platform-STALD/secundaria.html
- Juegos: https://jalducin.github.io/platform-STALD/juegos.html
- Crear cuenta de Juegos (para quien no está en las clases; enlace para compartir): https://jalducin.github.io/platform-STALD/index.html?juegos=1
- Inglés: https://jalducin.github.io/platform-STALD/ingles.html

Flujo de trabajo: Spec-Driven Development con OpenSpec (`/opsx:new` → `/opsx:ff` → `/opsx:apply` →
`/opsx:verify` → `/opsx:archive`). Todo cambio empieza como un cambio en `openspec/changes/`.

## Documentación

| Documento | Contenido |
|---|---|
| [openspec/project.md](openspec/project.md) | Qué es, arquitectura, URLs, comandos |
| [openspec/config.yaml](openspec/config.yaml) | Contexto y reglas para los artefactos OpenSpec |
| [docs/base-standards.md](docs/base-standards.md) | Principios base e idioma |
| [docs/documentation-standards.md](docs/documentation-standards.md) | Mantenimiento de la documentación |
| [docs/frontend-standards.md](docs/frontend-standards.md) | Páginas HTML / GitHub Pages |
| [docs/backend-standards.md](docs/backend-standards.md) | Backend Deno Deploy, contrato HTTP, seguridad |
| [docs/data-model.md](docs/data-model.md) | Bases de Notion, exámenes y actividades semanales (formatos JSON) |
| [docs/deno-deploy-setup.md](docs/deno-deploy-setup.md) | Configurar el backend en Deno Deploy y el repo privado de datos |
| [docs/pruebas.md](docs/pruebas.md) | Pruebas unitarias (CI) y E2E en local (`tests/e2e/correr.sh`), sesión de prueba y `stald_test_*` |
| [ai-specs/skills/nueva-semana-ingles/SKILL.md](ai-specs/skills/nueva-semana-ingles/SKILL.md) | Flujo semanal: armar, validar y subir la clase de Inglés de la semana siguiente |

## Inicio de sesión (Supabase Auth)

Se entra con un **enlace mágico** al correo (o su código de 6 dígitos), sin contraseña; la sesión dura semanas en
el dispositivo y es la misma en portal, Inglés, Juegos y Secundaria (`comun/auth.js`). El servidor valida el token y
toma el correo verificado. Hasta el 2026-10-12 se acepta todavía el correo sin sesión (salvo el admin, que siempre
requiere sesión). El profe puede generar un «🔗 Enlace de acceso» desde el portal para mandarlo por WhatsApp.
Detalle en [docs/backend-standards.md](docs/backend-standards.md) y
[docs/frontend-standards.md](docs/frontend-standards.md).

## Vigilancia del servidor

Cada 30 minutos, GitHub Actions revisa `https://stald.jalducin.deno.net/salud`. Si el servidor se bloquea (límite de
la API de GitHub agotado) o no responde, abre un issue **"🔴 Servidor bloqueado"** que menciona a @jalducin, y GitHub
manda el aviso por correo. Cuando se recupera, lo cierra con "✅ Recuperado". Detalle en
[docs/backend-standards.md](docs/backend-standards.md).

El correo llega a la dirección de notificaciones de la cuenta de GitHub. Para dirigirlo a otra, configúralo en
GitHub → Settings → Notifications → **Custom routing** (y en Settings → Emails, verifica esa dirección).

## Partidas en tiempo real (Supabase)

Las partidas multijugador usan Supabase Realtime del proyecto **Portafolio** (el mismo que usa el formulario de
contacto del portafolio `jalducin.github.io`; son dos repos apuntando al mismo proyecto, sin tablas compartidas).
Deno publica cada cambio de la sala en un canal secreto y las páginas lo reciben al instante, con una consulta de
respaldo cada 30 s. Sin las variables `SUPABASE_*` en Deno, las partidas funcionan con sondeo. Variables en
[docs/deno-deploy-setup.md](docs/deno-deploy-setup.md); detalle en [docs/backend-standards.md](docs/backend-standards.md).

## Datos vivos en Postgres

Los grupos de clase y los datos vivos de Inglés (alumnos, resultados y avance) están en el Postgres de Supabase. Es
el mismo proyecto *Portafolio*, con tablas `stald_*`, protegidas con RLS y accesibles solo desde el servidor. El
contenido (actividades, exámenes y semanas) sigue en el repo. Juegos (salas, partidas, ranking, perfiles) pasa a
Postgres al migrarse con `herramientas/migrar-ingles.ts --juegos`. Si Postgres no responde, el servidor responde 503
en lugar de mostrar datos viejos. Detalle en [docs/data-model.md](docs/data-model.md).
