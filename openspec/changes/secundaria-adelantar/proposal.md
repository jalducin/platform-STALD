## Why

Pedido del profe (2026-10-22): «Recuerda que pueda adelantar actividades». La alumna de Secundaria debe poder resolver
sus clases antes de su día. Hoy cada clase abre su día (`disponibleDesde`) y vence al siguiente (`fechaLimite`), y
`comun/gamificacion.js` deduce el día de la clase de esas dos fechas (`diaDeClase`). Si se abre antes, el horario,
«Hoy te toca», «Esta semana» y los mundos se descuadran. Además, el servidor solo lista las semanas ya iniciadas: las
clases de la segunda semana del bloque no aparecerían aunque ya estuvieran abiertas.

## What Changes

- **Contenido:** campo nuevo opcional `dia` (AAAA-MM-DD) en actividades y exámenes: el día del horario en que toca la
  clase. Regla de datos para adelantar en Secundaria: `dia` = día del horario; `disponibleDesde` = inicio del bloque de
  2 semanas; `fechaLimite` = el día siguiente a `dia`.
- **`comun/gamificacion.js`:** `diaDeClase(it)` devuelve `it.dia` si viene; si no, la regla actual (compatibilidad).
  Todas las vistas que agrupan por día ya usan `diaDeClase` (Inicio y retos diarios, «Esta semana», «Mi horario»,
  mundos, portal: `ingles/secundaria.js`, `ingles/secundaria-inicio.js`, `comun/secundaria-datos.js`). `?v=2` en
  `ingles.html` e `index.html`.
- **Servidor (`server/actividades.ts`):**
  - `meta` deja pasar `dia` en `/secundaria/actividades` e `/ingles/actividades` (como `materia`).
  - Secundaria lista también las clases de semanas futuras que ya abrieron (`disponibleDesde` ≤ hoy), como la ruta del
    profe. El grupo de Inglés no cambia.
- **Validador (`server/motor.ts`, `server/semana.ts`, `server/validar_semana.ts`):**
  - `validateItem`: `dia` opcional; si viene, fecha real dentro de [`disponibleDesde`, `fechaLimite`] (error si no).
  - `--secundaria`: con `dia`, `disponibleDesde` puede ser anterior al lunes de la semana; `dia` debe caer de lunes a
    domingo de esa semana.
  - Inglés (grupo y ruta del profe) no cambia sus reglas de apertura.
- **Estados y XP:** sin cambios de reglas. Antes de su `dia` la clase no es «de hoy» ni atrasada (`fechaLimite` =
  `dia` + 1); hecha antes de su día cuenta a tiempo y el +20 XP sigue la regla actual.
- **Skill `clases-secundaria`:** la regla nueva de fechas; espejos sincronizados.
- **Pruebas:** Deno (`server/secundaria_adelantar_test.ts`) y E2E `secundaria-adelantar` (fixture semana 2026-10-19,
  `--hoy 2026-10-22`).

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `examenes-secundaria`: requisito nuevo «Adelantar clases de Secundaria» (ADDED).

## Impact

- Superficies: `ingles.html` (modo Secundaria), `index.html` (horario del portal), servidor Deno. No toca Postgres,
  Realtime, Auth, Notion ni `juegos.html`.
- Repo de datos: solo cuando el coordinador suba clases con `dia` (acción externa del coordinador, no de este cambio).
- Matriz de acceso: sin cambios. La alumna ve solo sus clases (`alumnos`), ahora también las de la semana siguiente que
  ya abrieron; el admin ve todo; sin Secundaria, 403. Se verifica en `server/secundaria_adelantar_test.ts` y en las
  pruebas existentes de `examen-secundaria`.
- Coordinación: `comun/gamificacion.js` cambia en una línea (`diaDeClase`); lo tocan también los cambios de misiones
  de Secundaria y del RPG de Inglés.
