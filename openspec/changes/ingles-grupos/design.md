## Contexto y decisiones

### 1. Por qué Postgres y por qué en el proyecto Portafolio
- El plan gratuito de Supabase permite 2 proyectos y ya están ocupados: *Fidello QAS* y *Portafolio*.
  - Un esquema propio, `stald`, dentro de *Portafolio* aísla los datos del portafolio sin costo.
  - Al portafolio solo le toca `public.contact_messages`.
- Dos riesgos del plan gratuito:
  - **Pausa por 7 días sin actividad:** no aplica, porque Deno consulta la base a diario.
  - **Límite de 500 MB:** el volumen actual es de unos cientos de KB.
- Se consulta por **PostgREST** (`/rest/v1/...`) con la llave de servicio desde Deno: no hay driver, conexiones ni
  dependencias. El encabezado `Accept-Profile: stald` elige el esquema.

### 2. Modelo de datos

```sql
create schema if not exists stald;
create table stald.grupos (
  id text primary key,                 -- slug: "sabado-a1"
  nombre text not null, nivel text, horario text, meet_url text, color text default '#4f46e5',
  activo boolean not null default true, creado timestamptz not null default now()
);
create table stald.alumnos (
  id text primary key,                 -- slug del nombre (igual que hoy en resultados/)
  nombre text not null, email text unique, inicio date, activo boolean not null default true,
  origen text not null default 'registro', creado timestamptz not null default now()
);
create table stald.inscripciones (
  alumno_id text references stald.alumnos(id), grupo_id text references stald.grupos(id),
  desde date not null, hasta date,     -- hasta null = vigente
  primary key (alumno_id, grupo_id, desde)
);
create unique index una_vigente on stald.inscripciones(alumno_id) where hasta is null;
create table stald.resultados (
  item_id text not null, alumno_id text references stald.alumnos(id),
  doc jsonb not null,                  -- mismo formato que resultados/<item>/<slug>.json (intentos, mejor)
  version int not null default 1, actualizado timestamptz not null default now(),
  primary key (item_id, alumno_id)
);
create table stald.avance (alumno_id text primary key references stald.alumnos(id), doc jsonb not null, version int not null default 1);
alter table stald.grupos enable row level security; -- igual en todas: sin políticas públicas
```

- `resultados.doc` conserva el formato JSON de hoy. Así `motor.ts` no cambia y el riesgo de la migración baja.
- La concurrencia es optimista: se escribe con `version = version + 1` y `where version = <leída>`. Esto equivale
  al `sha` que hoy da GitHub.

### 3. Acceso a datos
- `server/db.ts`: `createDb({ url, key, fetch? })` → `select`, `upsert` y `update(where version)` sobre PostgREST,
  con tiempo máximo de 5 s y errores tipados.
- Se agrega un adaptador `ResultadosStore` que implementa la parte de la interfaz `Store` que usan
  `actividades.ts` y `alumnos.ts`: `get` y `put` de `resultados/…`, `alumnos.json` y `avance/…`.
  - Con eso, `handleActividades` y `motor.ts` no cambian.
  - Fallback: si una lectura de Postgres falla, el adaptador lee del `GitHubStore`. Las escrituras van solo a
    Postgres.
- Grupos (`server/grupos.ts`, solo admin):
  - `GET /ingles/grupos`;
  - `POST /ingles/grupos` (crear o editar);
  - `POST /ingles/grupos/mover { email, grupo }`.
- Alta: `POST /ingles/alumnos` acepta `grupo`; si no se manda, va al primer grupo activo.

### 4. Calendario por grupo
- `contenido/semanas/<lunes>.json` agrega el campo opcional `grupos: string[]`; si no está, la semana aplica a todos.
- `visibleItems` recibe el grupo de quien consulta:
  - un elemento se ve si su semana aplica a ese grupo;
  - el admin ve todo, y en su vista puede filtrar por grupo.
- Los resultados son por alumno, no por grupo. Por eso, al mover a alguien de grupo, conserva todo su historial.

### 5. Migración (`herramientas/migrar-ingles.ts`)
1. `--prueba`: lee los JSON y calcula lo que insertaría, por ejemplo «2 alumnos, 5×N resultados, 1 avance, 1 grupo,
   M inscripciones», sin escribir nada.
2. Real:
   - aplica `supabase/migrations/001_stald_ingles.sql` con `supabase db push` (CLI ya instalada);
   - inserta con `upsert`, así que se puede repetir sin duplicar.
3. Verificación:
   - cuadran los conteos de cada tabla;
   - se comparan 3 documentos al azar campo por campo.
4. Respaldo: se etiqueta el repo de datos (`antes-de-postgres`) y los JSON se conservan.
5. Corte: Deno cambia a `ResultadosStore`. Durante 1 ciclo convive el respaldo de lectura; después se quita.

### 6. Vista del admin, mínima
- Encabezado con selector de grupo. "Todos" es el valor por omisión.
- Tarjeta "👥 Grupos": crear o editar nombre, nivel, horario, Meet y color; ver integrantes.
- En el alta, un selector de grupo; en cada alumno o alumna, un botón "Mover de grupo".
- Los resultados y "Últimas calificaciones" se filtran por el grupo elegido.

## Pruebas
- Unitarias:
  - `db.ts`, con un `fetch` falso: URLs, encabezados de esquema, concurrencia y errores;
  - `ResultadosStore`: lee de Postgres, usa el respaldo cuando falla y escribe con versión;
  - grupos: crear, editar, mover, permisos (solo admin) y validación;
  - calendario por grupo: un elemento de una semana con `grupos` solo se ve en ese grupo.
- Migración: modo de prueba contra una copia de los datos con conteos esperados; idempotencia (2 corridas = mismo
  resultado).
- E2E:
  - el admin crea "Sábado A1", da de alta a una alumna en ese grupo, mueve a otra y filtra resultados;
  - una alumna resuelve una actividad y el resultado queda en Postgres.
- Producción: migración real con cuadre de conteos y verificación de lectura, con limpieza de datos de prueba.
