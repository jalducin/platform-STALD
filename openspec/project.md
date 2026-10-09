# Contexto del proyecto

## Qué es

Plataforma escolar web con cuatro espacios:

- **Portal**: entrada única con sesión.
- **Inglés**: actividades, exámenes y refuerzos en línea cada semana; grupos de clase y tablero del profe.
- **Juegos**: individuales y multijugador, con ranking semanal.
- **Secundaria**: tablero de tareas alimentado desde Notion.

La usan el profe (administrador, «modo maestro») y sus alumnos y alumnas (menores de edad) para ver pendientes,
resolver actividades, consultar su avance y jugar.

## Stack tecnológico

- Lenguaje(s): HTML/CSS/JS vanilla (frontend), TypeScript sobre Deno (backend).
- Framework(s): ninguno en frontend (módulos compartidos en `comun/`, `ingles/`, `juegos/` y `estilos/`); Deno
  Deploy (plan Pro) en backend (`server/main.ts`).
- Datos (detalle en `docs/data-model.md`):
  - **Postgres de Supabase** (proyecto *Portafolio*): datos vivos de Inglés (alumnos y alumnas, grupos,
    inscripciones, resultados y avance) en tablas `stald_*` del esquema `public`, con RLS sin políticas públicas.
    Solo el servidor las lee, con la llave de servicio (`server/db.ts`). Definición en
    `supabase/migrations/001_stald_ingles.sql`.
  - **Repo privado `jalducin/platform-STALD-data`** (JSON): contenido de Inglés (semanas, actividades y exámenes
    con respuestas) y datos de Juegos. Es también el respaldo de lectura de Inglés durante la transición.
  - **Notion** (API 2022-06-28): base de Secundaria. Inglés ya no lee Notion (cambio `cierre-tecnico`, fase 2):
    la base «📖 Clases Inglés» queda solo como historial y la identidad sale del registro `alumnos.json`.
- Otros:
  - **Supabase Realtime**: canal secreto por sala para las partidas multijugador (`server/realtime.ts`). Sin las
    variables `SUPABASE_*`, las salas usan sondeo.
  - **Supabase Auth**: inicio de sesión con correo y contraseña (`comun/auth.js`, `server/auth.ts`,
    `server/contrasena.ts`). El servidor toma el correo de la sesión verificada. Hasta el 2026-10-12
    (`LOGIN_TRANSICION_HASTA`) acepta todavía `?email=` sin sesión, salvo para el admin.
  - **GitHub Pages** (hosting del frontend) y **GitHub Actions** (vigilancia de `/salud` cada 30 min, con aviso
    por correo mediante un issue).

## Arquitectura

```
Navegador (GitHub Pages, sesión de Supabase Auth)
  ├─ index.html      ── /perfil, /config, /auth/preparar… ────────────┤  (portal)
  ├─ ingles.html     ── /ingles/actividades, /ingles/alumnos,          │
  │                     /ingles/grupos, /ingles/resumen,               │
  │                     /ingles/profe/actividades, /ingles/data ───────┤
  ├─ juegos.html     ── /juegos/… (partidas, ranking, salas, avatar) ──┤
  └─ secundaria.html ── /data ─────────────────────────────────────────┤
                                                                       ▼
        Deno Deploy `https://stald.jalducin.deno.net` (`server/main.ts`)
        (identidad con `quienEs`, reglas de acceso por correo y rol)
           │                 │                       │              │
           ▼                 ▼                       ▼              ▼
   Postgres Supabase   Repo privado de datos     Notion API    Supabase Realtime
   (tablas stald_*)    (contenido y Juegos)      (Secundaria)  (estado de las salas → navegador)
```

## Superficies y URLs

| Superficie | Ubicación |
|---|---|
| Repo | https://github.com/jalducin/platform-STALD |
| Portal (acceso) | https://jalducin.github.io/platform-STALD/ |
| Inglés | https://jalducin.github.io/platform-STALD/ingles.html |
| Juegos | https://jalducin.github.io/platform-STALD/juegos.html |
| Dashboard Secundaria | https://jalducin.github.io/platform-STALD/secundaria.html |
| Backend | `https://stald.jalducin.deno.net` — Deno Deploy, `server/main.ts` (ver `docs/deno-deploy-setup.md`) |
| Base de datos, Realtime y Auth | Supabase, proyecto *Portafolio* (variables `SUPABASE_*` en `docs/deno-deploy-setup.md`) |
| Datos privados | Repo `jalducin/platform-STALD-data` (contenido con respuestas y datos de Juegos, en JSON) |
| Edge Function (anterior) | `https://xozsrcnjnugwbrrrwoeb.supabase.co/functions/v1/tareas-estudio-secundaria`, legado; ya no lo usan las páginas (desde 2026-09-28) |

> El repo se llamaba `tareas-estudio-secundaria`. Los links `jalducin.github.io/tareas-estudio-secundaria/…`
> ya no funcionan: GitHub Pages no redirige repos renombrados.

## Especificaciones

- Specs vivas (requisitos vigentes, ya consolidados): `openspec/specs/<capability>/spec.md`.
- Cambios en curso: `openspec/changes/<cambio>/`; cambios cerrados: `openspec/changes/archive/`.

## Convenciones

- Idioma: documentación y comentarios en español; identificadores en inglés. Lenguaje inclusivo («alumnos y
  alumnas»).
- Commits: conventional commits.
- Ramas: `feature/[change-name]`.
- Estándares por área en `docs/*-standards.md`.

## Comandos clave

- Instalar dependencias: no aplica (sin build).
- Servir el frontend en local: `npx serve .` o `python -m http.server 8080`.
- Servidor local y pruebas del backend: ver `docs/deno-deploy-setup.md` («Probar en local») y
  `docs/backend-standards.md` §0 (`npx -y deno test` en `server/`).
- Probar el backend desplegado: `curl` contra `https://stald.jalducin.deno.net` con el encabezado
  `Authorization: Bearer <token>` (ver `docs/backend-standards.md`).
- Publicar: merge a `main` → GitHub Pages publica el frontend y Deno Deploy el backend.
- Cerrar un cambio: `openspec archive <cambio>` (consolida sus deltas en `openspec/specs/`).
