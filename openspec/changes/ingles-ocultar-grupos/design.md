## Contexto

Los grupos viven en `stald_grupos` (Postgres, cambio `ingles-grupos`); `server/grupos.ts` los lee con caché de 60 s y
los usa también para el grupo vigente del alumno o alumna (`grupoDe`, `grupoInfo`). La vista del admin
(`ingles/admin.js`, `ingles/tablero.js`) arma casi todo en el navegador a partir de `/ingles/data`,
`/ingles/actividades`, `/ingles/alumnos`, `/ingles/grupos` y `/juegos/admin/resumen`; solo el tablero
(`/ingles/resumen`) calcula indicadores en el servidor.

## Decisiones

### 1. Columna `oculto_admin` en `stald_grupos` (no JSON en `stald_docs`)

- **Elegida:** columna `oculto_admin boolean not null default false`, migración `002_stald_grupos_oculto_admin.sql`
  (idempotente: `add column if not exists`, para `stald_` y `stald_test_`), aplicada como `001` con
  `supabase db query --linked`.
- **Por qué:** la bandera es un atributo del grupo; viaja con la misma lectura y la misma caché que el resto del grupo,
  sin una segunda fuente que se pueda desincronizar (grupo renombrado o borrado, documento huérfano). La migración es
  aditiva y con default `false`: no cambia nada al aplicarse.
- **Alternativa descartada:** `stald_docs` con `config/grupos-ocultos.json`. Evita la migración, pero `PgStore` no
  enruta `config/` a Postgres (iría al repo de GitHub) y habría que leerlo aparte con `db.select`; además duplica la
  identidad del grupo en otro lugar.
- **Compatibilidad:** el servidor lee `g.oculto_admin === true`; sin la columna (servidor nuevo antes de la
  migración) todo grupo cuenta como visible y solo `POST /ingles/grupos/ocultar` fallaría (500). Por eso la migración
  se aplica antes del merge.
- **Nombre en la API:** `ocultoAdmin` (lo que pidió el profe); en la tabla, `oculto_admin` (como `meet_url`).

### 2. Ruta propia `POST /ingles/grupos/ocultar`

- `{ grupo: "<id>", oculto: true|false }`, solo admin (mismo 403 `solo_admin` que el resto de `/ingles/grupos`).
- `oculto` debe ser boolean (400 `oculto_invalido`); el grupo debe existir (400 `grupo_inexistente`).
- Actualiza solo esa columna (`PATCH stald_grupos?id=eq.<id>`), así el formulario de edición del grupo no puede
  encenderla ni apagarla por accidente. El `upsert` de `POST /ingles/grupos` sigue sin enviar la columna (PostgREST
  con `merge-duplicates` conserva las columnas que no vienen).
- Limpia la caché de grupos.

### 3. Dónde se filtra

- **Servidor, `/ingles/resumen`:** sus indicadores («a tiempo», promedio, atrasos, «sin entregas») se calculan en el
  servidor, así que el filtro tiene que estar ahí. `DepsResumen` gana `ocultoAdmin?(grupo)`; sin `?ocultos=1`, y si
  no se pidió un grupo concreto, quedan fuera los alumnos y alumnas cuyo grupo efectivo está oculto. Si se pide
  `?grupo=<id>` de un grupo oculto (el admin lo eligió con el interruptor encendido), se respeta.
- **Navegador, el resto de vistas del admin:** ya filtran por grupo con `grupoDeNombre`; se agrega
  `ocultoEnPanel(nombre)` = el grupo efectivo está oculto **y** el interruptor está apagado. Se aplica en:
  - `renderAdmin` (lista `names`: avance «Alumnos» y «Últimas calificaciones»);
  - `renderAlumnosAdmin` (lista de «Registro» y su contador);
  - `opcionesGrupo` (selector de grupo, alta y mover: un grupo oculto solo sale con el interruptor encendido o si es
    el grupo actual de esa persona);
  - `renderAdminWeek` (conteo «N con intentos»);
  - `retroAlumnos` y `retroGrupal` de `ingles/presentacion.js` (guion de la clase y diapositiva de retroalimentación
    del Meet: bloques por alumno o alumna, errores comunes, promedios y entregas);
  - `renderJuegosAdmin` (ranking y su contador). Las tarjetas de partidas multijugador no se filtran: son partidas
    compartidas con otras personas.
  - `cargarResumen` manda `&ocultos=1` cuando el interruptor está encendido.
- **No se filtra** lo de alumnos y alumnas: `/ingles/data` y `/ingles/actividades` no reciben ni leen la bandera, y
  `grupoInfo` hacia el alumno o alumna sigue mandando solo `id, nombre, nivel, horario, meet_url, color`.
- `/ingles/data` y `/ingles/actividades` del admin no se filtran en el servidor: el interruptor muestra y oculta sin
  recargar, y no hay dato privado nuevo (el admin ya ve a todos).

### 4. Interruptor y botón

- Interruptor «Mostrar grupos ocultos (N)» (casilla) en la barra del selector de grupo, solo si N > 0. Estado en
  `state.mostrarOcultos` (no se guarda: cada carga empieza ocultando). Al apagarlo con un grupo oculto elegido en el
  selector, el filtro vuelve a «Todos los grupos». Si ya no queda ningún grupo oculto (se mostró el último), el
  interruptor se apaga solo, para que el siguiente grupo que se oculte desaparezca de inmediato.
- En «👥 Grupos», cada fila: «👁️ Ocultar del panel» o «Mostrar en el panel» (`data-action="ocultar-grupo"`) y la
  etiqueta «oculto del panel». Sin confirmación: es reversible y no toca datos de alumnos.
- Cambios de UI mínimos (otro agente rediseña Inglés): sin estilos nuevos; se reutilizan `btn ghost sm`,
  `grupos-barra` y `progress-text`.

## Modelo de amenaza mínimo

- Cambiar la bandera exige sesión de admin (403 a cualquier otra persona). La bandera no es un permiso: no quita ni da
  acceso a nadie, solo decide qué ve el admin por omisión.
- La migración no toca RLS: `stald_grupos` sigue sin políticas públicas.

## Riesgos

- Servidor desplegado sin la columna: solo falla ocultar (500); mitigado aplicando la migración antes del merge.
- Rediseño RPG en paralelo: conflictos en `ingles/*.js`; mitigado con cambios pequeños y merge de `main` antes del PR.
