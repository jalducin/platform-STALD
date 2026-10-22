## Why

El profe pidió (2026-10-22): «El grupo 2 y 3 de Inglés no avanzan: que queden ocultos de admin pero no les quites
acceso a alumnos». Hoy no hay forma de sacar un grupo de la vista del admin sin tocar a sus alumnos y alumnas: la baja
de Inglés (`ingles-baja-alumno`) les quita el acceso, y desactivar el grupo (`activo: false`) cambia el grupo efectivo
de quien no tiene inscripción. Hace falta una bandera por grupo que **solo** afecte lo que ve el admin.

## What Changes

- **Base de datos:** columna nueva `oculto_admin boolean not null default false` en `stald_grupos` y
  `stald_test_grupos` (migración versionada `supabase/migrations/002_stald_grupos_oculto_admin.sql`, idempotente).
- **Servidor (`server/grupos.ts`, `server/main.ts`, `server/resumen.ts`):**
  - `GET /ingles/grupos` devuelve `ocultoAdmin` (boolean) en cada grupo.
  - Ruta nueva `POST /ingles/grupos/ocultar` `{ grupo, oculto: boolean }` (solo admin): enciende o apaga la bandera.
    Reversible; repetirla responde `sinCambio: true`.
  - `GET /ingles/resumen` deja fuera por omisión a los alumnos y alumnas de grupos ocultos (filas, indicadores y
    «sin entregas»). Con `?ocultos=1`, o si se pide `?grupo=<id>` de un grupo oculto, los incluye. La respuesta trae
    `ocultos` (cuántos alumnos y alumnas quedaron fuera).
  - Editar un grupo (`POST /ingles/grupos`) no toca la bandera.
- **Vista del admin (`ingles/admin.js`, `ingles/tablero.js`, `ingles/comun.js`, `ingles/presentacion.js`,
  `ingles/app.js`, `ingles.html`):**
  - Interruptor «Mostrar grupos ocultos (N)» en la barra del selector de grupo (solo si hay grupos ocultos).
  - Con el interruptor apagado (por omisión), los alumnos y alumnas de grupos ocultos no aparecen en: tablero y
    resumen (mapa de calor, indicadores), avance («Alumnos»), «Últimas calificaciones», lista de «Registro» y su
    contador, el selector de grupo, el conteo «con intentos» de «Esta semana», el guion y la retroalimentación del
    Meet («🎬 Presentar» / «📋 Guion») ni el ranking de «Juegos de la semana».
  - En «👥 Grupos», cada grupo tiene «👁️ Ocultar del panel» o «Mostrar en el panel» y la etiqueta «oculto del panel».
  - Cambios mínimos y localizados (otro agente rediseña la UI de Inglés): filtro, interruptor y botón.
- **Alumnos y alumnas: sin cambio.** `/ingles/data`, `/ingles/actividades` (calendario, horario, Meet del grupo,
  entregas y resultados) y `/perfil` no leen la bandera.
- **Correos de Meet del admin:** no aplica; la vista del admin no lista correos para el Meet.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: requisito nuevo «Grupos ocultos del panel del admin» (ADDED).

## Impact

- Superficies: servidor Deno, `ingles.html` (solo vista del admin) y Postgres de Supabase (*Portafolio*, columna
  nueva). Sin cambios en `index.html`, `juegos.html`, `secundaria.html`, el repo de datos ni Notion.
- Datos: `stald_grupos.oculto_admin` (default `false`: nadie queda oculto al aplicar la migración). Un servidor sin la
  columna lee `undefined` y la trata como `false`.
- Matriz de acceso:

  | Quién | `POST /ingles/grupos/ocultar` | `GET /ingles/grupos` | `GET /ingles/resumen` | Inglés propio (`/ingles/data`, `/ingles/actividades`, entregas) |
  |---|---|---|---|---|
  | Admin (sesión) | 200 (`sinCambio` si ya estaba así); 400 `grupo_inexistente` / `oculto_invalido` / `json_invalido` | 200 con `ocultoAdmin` | 200, sin grupos ocultos salvo `?ocultos=1` o `?grupo=<oculto>` | sin cambio |
  | Alumna o alumno de grupo oculto | 403 `solo_admin` | 403 | 403 | **sin cambio**: entra, ve su calendario, horario y Meet, entrega y se guarda su resultado |
  | Alumna o alumno de otro grupo | 403 `solo_admin` | 403 | 403 | sin cambio |
  | Sin sesión | 401 | 401 | 401 | 401 |

  Nadie fuera del admin ve la bandera: no viaja en `/ingles/actividades` (`grupoInfo` no la incluye).
- Acciones externas:
  - Aplicar `002_stald_grupos_oculto_admin.sql` en *Portafolio* (agente, con `supabase db query --linked`, el mismo
    flujo que `001`), antes del merge. Es aditiva e idempotente.
  - Redeploy automático al merge (agente) y verificación de producción solo lectura (agente).
  - **Ocultar los grupos 2 y 3 en producción: lo hace el profe con el botón** (usuario). Este cambio no oculta ningún
    grupo.

## Cómo revertir

- Un grupo: «Mostrar en el panel» (o `POST /ingles/grupos/ocultar` con `oculto: false`).
- El cambio: revertir el PR. La columna puede quedarse (default `false`, ningún código anterior la lee); si se quiere
  quitar: `alter table public.stald_grupos drop column if exists oculto_admin` (y en `stald_test_grupos`).
