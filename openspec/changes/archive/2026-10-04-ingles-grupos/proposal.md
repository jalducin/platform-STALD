## Why

Hoy Inglés tiene **un solo grupo implícito**: todos los alumnos y alumnas ven el mismo calendario, las mismas
actividades y el mismo Meet. El profe necesita **grupos de clase**. Por ejemplo, "Sábado A1" y "Domingo B1",
cada uno con su horario, su enlace de Meet, sus integrantes y su calendario de semanas.

Además, los datos vivos de Inglés están hoy en archivos JSON del repo privado de GitHub: el registro de alumnos y
alumnas, los resultados y el avance. Ese formato funcionó para empezar, pero tiene límites:
- No permite consultar por grupo, por alumno o por fecha sin leer muchos archivos.
- Cada lectura y escritura cuenta contra el límite de la API de GitHub (ya hubo una caída por eso).
- No hay relaciones: alumno ↔ grupo ↔ resultados.

Ya usamos Supabase (proyecto *Portafolio*) para las partidas en tiempo real. Su Postgres gratuito (500 MB) resuelve
lo anterior con un modelo relacional, consultas rápidas, transacciones y respaldos.

## What Changes

- **Base de datos de Inglés en Supabase Postgres**, en un esquema propio `stald` para no mezclarse con el
  portafolio. Tablas:
  - `grupos`: nombre, nivel, horario, Meet, color y si está activo.
  - `alumnos`: nombre, correo, inicio y si está activo.
  - `inscripciones`: alumno ↔ grupo, con fechas para conservar el historial.
  - `resultados`: intentos y mejor calificación por alumno y elemento.
  - `avance`: marcas de clases.
- **Solo Deno habla con la base**, con la llave de servicio. El navegador no la toca. Se activa RLS en todas las
  tablas y no se agregan políticas públicas.
- **Calendario por grupo:**
  - Cada semana de contenido (`contenido/semanas/*.json`) declara a qué grupos aplica: `grupos: ["sabado-a1"]`.
  - Si no lo declara, aplica a todos.
  - Las actividades y los exámenes se pueden reutilizar entre grupos.
- **Alumnos en grupos:**
  - Al dar de alta a alguien se elige su grupo.
  - Se puede mover a alguien de grupo. Sus resultados se conservan y el cambio aplica desde la fecha del movimiento.
  - La regla del lunes de inicio sigue igual.
- **Vista del admin, mínima y funcional** en este sprint (la versión pulida va en `ingles-pro`):
  - selector de grupo;
  - alta y edición de grupos;
  - lista de integrantes por grupo;
  - filtro de resultados por grupo.
- **Migración segura:**
  - Un script copia `alumnos.json`, `resultados/**` y `avance/**` a Postgres. Toda la gente actual queda en el
    grupo "Grupo 1", que el profe puede renombrar.
  - Primero corre en modo de prueba, sin escribir, y cuadra los conteos.
  - Los JSON de GitHub quedan como respaldo de solo lectura durante un ciclo.
  - Mientras tanto, si Postgres falla, el servidor vuelve a leer los JSON.
- Juegos, la ruta del profe y el contenido (actividades, exámenes, semanas) **siguen en el repo**. Es contenido
  versionado que el profe edita; no se migra.

## Capabilities

### New Capabilities
- `ingles-grupos`: grupos de clase, inscripciones y calendario por grupo.

### Modified Capabilities
- `ingles`: almacenamiento de alumnos, resultados y avance en Postgres; filtros por grupo.

## Impact

- Archivos nuevos:
  - `server/db.ts`: cliente REST de Supabase (PostgREST) con `fetch`, sin dependencias.
  - `server/grupos.ts`.
  - `supabase/migrations/*.sql`.
  - `herramientas/migrar-ingles.ts`.
- Archivos que cambian: `server/alumnos.ts`, `server/actividades.ts`, `server/main.ts` e `ingles.html` (vista de
  admin mínima).
- Variables de Deno: no hay nuevas, porque se reusan `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`.
- Riesgo principal: la migración de calificaciones. Se mitiga con modo de prueba, cuadre de conteos, respaldo y
  respaldo de lectura en los JSON.
