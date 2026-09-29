## ADDED Requirements

### Requirement: Backend en Deno Deploy
El backend SHALL correr en Deno Deploy desde `server/main.ts`, con las mismas rutas relativas
(`/data`, `/ingles/data`, `/ingles/examenes…`, `/ingles/actividades…`) y la configuración por variables de
entorno: `NOTION_TOKEN`, `SUPER_ADMIN_EMAIL`, `GITHUB_TOKEN` y `DATA_REPO`. NO SHALL depender de Supabase.

#### Scenario: Sin Supabase
- **WHEN** se busca `supabase` en `server/`
- **THEN** no hay importaciones ni llamadas a Supabase

### Requirement: Datos en el repo privado de GitHub
El contenido (con respuestas) y los resultados SHALL guardarse como JSON en el repo privado indicado por
`DATA_REPO`, leídos y escritos con la API de contenidos de GitHub:
- `contenido/semanas/<lunes>.json` (calendario).
- `contenido/actividades/<id>.json` y `contenido/examenes/<id>.json`.
- `resultados/<id>/<slug-alumno>.json`.

Las escrituras SHALL usar el `sha` del archivo para no sobrescribir cambios concurrentes. Los resultados
NO SHALL incluir correos.

#### Scenario: Escritura concurrente
- **WHEN** dos envíos del mismo alumno llegan a la vez
- **THEN** uno se guarda y el otro se reintenta con el `sha` nuevo, sin perder intentos

### Requirement: Migración del diagnóstico
Los resultados de `diagnostico-a1` guardados en Supabase Storage SHALL copiarse a
`resultados/diagnostico-a1/` del repo de datos antes de apagar la función de Supabase. Se convierten al
formato de intentos (`intentos[0]` con sus respuestas y calificación, `mejor` igual al intento 1 y
`migradoDe: "supabase-storage"`) sin cambiar ninguna calificación.

#### Scenario: Resultados migrados
- **WHEN** termina la migración
- **THEN** el repo de datos tiene los mismos 4 (o más) resultados que Storage, con los mismos porcentajes
