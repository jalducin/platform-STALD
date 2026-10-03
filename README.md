# platform-STALD

Dashboards de tareas escolares alimentados desde Notion (Secundaria e Inglés).

- Portal (entrada única): https://jalducin.github.io/platform-STALD/
- Secundaria: https://jalducin.github.io/platform-STALD/secundaria.html
- Juegos: https://jalducin.github.io/platform-STALD/juegos.html
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
| [ai-specs/skills/nueva-semana-ingles/SKILL.md](ai-specs/skills/nueva-semana-ingles/SKILL.md) | Flujo semanal: armar, validar y subir la clase de Inglés de la semana siguiente |

## Vigilancia del servidor

Cada 15 minutos, GitHub Actions revisa `https://stald.jalducin.deno.net/salud`. Si el servidor se bloquea (límite de
la API de GitHub agotado) o no responde, abre un issue **"🔴 Servidor bloqueado"** que menciona a @jalducin, y GitHub
manda el aviso por correo. Cuando se recupera, lo cierra con "✅ Recuperado". Detalle en
[docs/backend-standards.md](docs/backend-standards.md).

El correo llega a la dirección de notificaciones de la cuenta de GitHub. Para dirigirlo a otra, configúralo en
GitHub → Settings → Notifications → **Custom routing** (y en Settings → Emails, verifica esa dirección).
