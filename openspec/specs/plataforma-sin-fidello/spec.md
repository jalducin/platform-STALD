# plataforma-sin-fidello Specification

## Purpose
Infraestructura del backend: Deno Deploy, datos en el repo privado de GitHub y en Postgres de Supabase, sin la Edge Function legado. Origen: tareas-online-semanales, actualizado por ingles-grupos.
## Requirements
### Requirement: Backend en Deno Deploy
El backend SHALL correr en Deno Deploy desde `server/main.ts`, con las rutas relativas `/data`, `/ingles/data`,
`/ingles/actividades…` (que sustituye a `/ingles/examenes…`), `/perfil` y `/juegos/…`, y la configuración por
variables de entorno (`NOTION_TOKEN`, `SUPER_ADMIN_EMAIL`, `GITHUB_TOKEN`, `DATA_REPO` y las `SUPABASE_*`). NO SHALL
depender de la Edge Function ni de Supabase Storage. De Supabase SHALL usar solo, desde el servidor:
- Postgres, para los datos de Inglés (ver «Datos de Inglés en Postgres» en la capability `ingles`);
- Realtime, opcional, para las salas de Juegos (ver «Partidas en tiempo real con Supabase Realtime»).

Sin las variables `SUPABASE_*`, el servidor SHALL seguir funcionando con el repo de datos y con sondeo en las salas.

#### Scenario: Sin Edge Function
- **WHEN** se buscan llamadas a la Edge Function `tareas-estudio-secundaria` o a Supabase Storage en `server/`
- **THEN** no hay ninguna

#### Scenario: Sin configuración de Supabase
- **WHEN** el servidor arranca sin las variables `SUPABASE_*`
- **THEN** lee y escribe en el repo de datos y las salas usan sondeo

### Requirement: Datos en el repo privado de GitHub
El contenido (con respuestas) y los datos de Juegos SHALL guardarse como JSON en el repo privado indicado por
`DATA_REPO`, leídos y escritos con la API de contenidos de GitHub:
- `contenido/semanas/<lunes>.json` (calendario).
- `contenido/actividades/<id>.json` y `contenido/examenes/<id>.json`.

Los alumnos y alumnas, los resultados (`resultados/<id>/<slug-alumno>.json`) y el avance SHALL vivir en Postgres
una vez hecha la migración, con el repo de datos como respaldo de lectura durante la transición. Las escrituras SHALL
usar una versión (`sha` en GitHub, `version` en Postgres) para no sobrescribir cambios concurrentes. Los resultados
NO SHALL incluir correos.

#### Scenario: Escritura concurrente
- **WHEN** dos envíos del mismo alumno o alumna llegan a la vez
- **THEN** uno se guarda y el otro se reintenta con la versión nueva, sin perder intentos

#### Scenario: Contenido en GitHub
- **WHEN** se publica una semana nueva
- **THEN** sus archivos viven en `contenido/` del repo de datos y no en Postgres

### Requirement: Migración del diagnóstico
Los resultados de `diagnostico-a1` guardados en Supabase Storage SHALL copiarse a
`resultados/diagnostico-a1/` del repo de datos antes de apagar la función de Supabase. Se convierten al
formato de intentos (`intentos[0]` con sus respuestas y calificación, `mejor` igual al intento 1 y
`migradoDe: "supabase-storage"`) sin cambiar ninguna calificación.

#### Scenario: Resultados migrados
- **WHEN** termina la migración
- **THEN** el repo de datos tiene los mismos 4 (o más) resultados que Storage, con los mismos porcentajes

