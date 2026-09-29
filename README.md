# platform-STALD

Dashboards de tareas escolares alimentados desde Notion (Secundaria e Inglés).

- Secundaria: https://jalducin.github.io/platform-STALD/
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
