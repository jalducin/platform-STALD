# Contexto del proyecto

## Qué es

Dashboards web de tareas y clases escolares, alimentados en vivo desde Notion. Los usa un
padre/maestro (administrador) y sus alumnas para ver pendientes, entregas y progreso.

## Stack tecnológico

- Lenguaje(s): HTML/CSS/JS vanilla (frontend), TypeScript sobre Deno (backend).
- Framework(s): ninguno en frontend; Deno Deploy en backend (`server/main.ts`).
- Base de datos: ninguna propia; las bases de Notion son el origen de datos (ver `docs/data-model.md`).
- Otros: GitHub Pages (hosting), Notion API 2022-06-28, integración de Notion con capability de
  lectura de correos de usuarios.

## Arquitectura

```
Navegador (GitHub Pages)
  ├─ index.html   ──GET /perfil?email=…──────┤  (portal)
  ├─ secundaria.html ─GET /data?email=…──────┤
  └─ ingles.html  ──GET /ingles/data?email=…─┤
                                             ▼
             Deno Deploy `https://stald.jalducin.deno.net` (`server/main.ts`)
             (lee Notion, filtra por correo; actividades en repo privado de datos)
                                             ▼
                                        Notion API
```

## Superficies y URLs

| Superficie | Ubicación |
|---|---|
| Repo | https://github.com/jalducin/platform-STALD |
| Portal (acceso) | https://jalducin.github.io/platform-STALD/ |
| Dashboard Secundaria | https://jalducin.github.io/platform-STALD/secundaria.html |
| Dashboard Inglés | https://jalducin.github.io/platform-STALD/ingles.html |
| Juegos | https://jalducin.github.io/platform-STALD/juegos.html |
| Backend | `https://stald.jalducin.deno.net` — Deno Deploy, `server/main.ts` (ver `docs/deno-deploy-setup.md`) |
| Datos privados | Repo `jalducin/platform-STALD-data` (contenido con respuestas y resultados JSON) |
| Edge Function (anterior) | `https://xozsrcnjnugwbrrrwoeb.supabase.co/functions/v1/tareas-estudio-secundaria`, legado; ya no lo usan las páginas (desde 2026-09-28) |

> El repo se llamaba `tareas-estudio-secundaria`. Los links `jalducin.github.io/tareas-estudio-secundaria/…`
> ya no funcionan: GitHub Pages no redirige repos renombrados.

## Convenciones

- Idioma: documentación y comentarios en español; identificadores en inglés.
- Commits: conventional commits.
- Ramas: `feature/[change-name]`.
- Estándares por área en `docs/*-standards.md`.

## Comandos clave

- Instalar dependencias: no aplica (sin build).
- Servir el frontend en local: `npx serve .` o `python -m http.server 8080`.
- Probar el backend: `curl "<URL función>/data?email=<correo>"` (ver `docs/backend-standards.md`).
- Pruebas del backend y despliegue de la Edge Function: ver `docs/backend-standards.md` §1.
- Publicar el frontend: merge a `main` → GitHub Pages lo publica solo.
