## Why

El profe pidió el 2026-10-21 «quitar las clases de Notion» y el 2026-10-22 **borró las bases de Notion de
Secundaria**. Sofía ya tiene sus clases nuevas en `contenido/secundaria/` (vista `ingles.html?modo=secundaria`, PR
#220), pero todo lo de Secundaria seguía leyendo Notion:

- `secundaria.html` pintaba el tablero de la base «📖 Clases» (`/data`); con la base borrada muestra `upstream_error`.
- La identidad salía de las filas de Notion (`loadRows(SECUNDARIA_DB_ID…)`) en `/perfil`, `/secundaria/actividades`,
  Juegos, el registro de Juegos y la contraseña. Con Notion borrado esas rutas fallan (`upstream_error`) y Sofía no
  puede entrar.

## What Changes

Se entrega en dos PR del mismo cambio.

### PR 1 — hotfix (acceso sin Notion)

- **Identidad de Secundaria desde el registro de alumnos y alumnas** (`alumnos.json`, Postgres en producción; el mismo
  de Inglés). Tiene Secundaria la entrada que:
  - tiene `secundaria: true` (marca del profe), o
  - cuyo slug aparece en `alumnos` de algún elemento visible de `contenido/secundaria/` (las clases de Sofía traen
    `alumnos: ["sofia","sofy"]`; ella está como «Sofy», así que entra sin ningún clic).
  - Slug: `slugSecundaria` si lo tiene; si no, el de su `nombre`. La baja de Inglés no quita Secundaria.
- **Sin Notion nunca falla:** si nadie tiene Secundaria por el registro, se intentan las filas de Notion (aviso en el
  log, como mucho cada 10 min); si Notion falla, no hay token o la base no existe → lista vacía, sin `upstream_error`.
- `server/secundaria_registro.ts` (nuevo) y `filasSecundaria()` en `server/main.ts` para `/perfil`,
  `/secundaria/actividades`, Juegos, registro de Juegos y contraseña. `Identidad.slug?` en `server/actividades.ts`.
- `POST /ingles/grupos/secundaria { email, secundaria }` (solo admin, reversible) y `secundaria` en
  `GET /ingles/alumnos`. Al marcar guarda `slugSecundaria` si su slug de Notion difiere.
- `GET /secundaria/actividades` del admin: `alumnas` (sin correos) y `?alumna=<slug>` con la vista de esa alumna.
- `secundaria.html` es un puente a `ingles.html?modo=secundaria` (conserva la query): ya no llama a `/data`.
- `/data` queda en el servidor como historial sin consumidores (con la base borrada responde error).

### PR 2 — experiencia (después del hotfix)

- Admin: botón «🏫 Secundaria: sí/no» por persona en el registro de `ingles.html`; pestañas «👀 Como la ve…»,
  «🗓️ Su horario» y «📊 Resultados» en la vista de Secundaria.
- Portal: bloque «🗓️ Mi horario» en el perfil de quien tiene Secundaria, con «Hoy te toca: …» y botón a sus clases.
- Secundaria: encabezado «Hola, …» con fecha y lo de hoy, tarjetas con estado, acción principal grande, progreso de la
  semana, vacío amable; botones reales (≥ 44 px) en Secundaria y el perfil; claro/oscuro y 360 px.
- Documentación completa (data-model, standards, deno-deploy-setup con `NOTION_TOKEN` opcional, README, config).

## Capabilities

### Modified Capabilities
- `examenes-secundaria`: MODIFIED «Exámenes de Secundaria»; ADDED «Identidad de Secundaria desde el registro»,
  «Marcar Secundaria desde el registro», «secundaria.html muestra las clases nuevas» y «El profe ve las clases como la
  alumna».
- `notion-data-api`: MODIFIED «Perfil de acceso»; ADDED «Base «📖 Clases» como historial».
- `plataforma`: MODIFIED «Identidad de Inglés sin Notion» (Secundaria tampoco lee Notion).
- `portal`: MODIFIED «Secundaria en su propia página».

## Impact

- **Superficies:** servidor Deno (`server/main.ts`, `server/actividades.ts`, `server/alumnos.ts`,
  `server/secundaria_registro.ts`), `secundaria.html`, `ingles.html` (modo Secundaria y registro del admin, PR 2),
  `index.html` (perfil, PR 2). Postgres: solo la entrada de `alumnos.json` cuando el profe marca a alguien (por la
  página). Notion: ya no se lee. Repo de datos: sin cambios.
- **Matriz de acceso:**

  | Quién | `/secundaria/actividades` | `?alumna=<slug>` | `/perfil` → `accesos.secundaria` | `POST /ingles/grupos/secundaria` |
  |---|---|---|---|---|
  | Admin | 200, todo con resultados y `alumnas` (nombre y slug) | 200, vista de esa alumna; desconocida → 404 | `true` | 200 |
  | Registro con `secundaria: true` o con clases exclusivas (aunque esté de baja de Inglés) | 200, solo lo suyo; exclusivo ajeno → 404 | se ignora | `true` | 403 |
  | Registro sin Secundaria (Inglés) o fuera del registro | 403 `sin_acceso` | 403 | `false` | 403 |
  | Sin sesión | 401 (400 si hay sesión sin correo) | igual | igual | igual |

  Ninguna respuesta lleva correos ajenos; fixtures solo `@example.com`. Verificación: pruebas Deno de cada fila, E2E y
  producción en solo lectura.
- **Acciones externas:** redeploy de Deno Deploy al hacer merge (agente); verificación en producción solo lectura
  (agente). `NOTION_TOKEN` no se borra de Deno Deploy (queda opcional). No hace falta ningún clic del profe para que
  Sofía entre: entra por sus clases exclusivas.
- **Seguimiento:** quitar la caída a Notion (tarea 9.1).

## Cómo revertir

Revertir el PR. Con Notion borrado, revertir deja otra vez `upstream_error`: preferir un arreglo hacia adelante.
