## Why

El profe pidió (2026-11-02): «sepárame por materias y mejora el diseño de mi horario», y que «luzca hermoso». Su ruta
(`ingles.html?modo=profe`) ya trae casi 200 elementos de cinco materias (IA, Staff, Tech Lead, Inglés y Evaluación;
Cultura General en camino), pero solo se ven por semana del plan o por mundo: no hay un horario por día, no se distingue
la materia de cada tarea ni el avance de cada una, y no se ven sus reglas de calendario (días de oficina, máximo por
día, inglés diario, todo abierto).

En el repo de datos (commit 8474d8a) cada elemento de su ruta ya trae `materia`, y `plan.json` trae el resumen
`materias[{ materia, elementos, inicio, fin }]` y `materiaDelGrupo`. El coordinador publicará además
`plan.diasOficina` (fechas): la regla cambió de martes y jueves a lunes y martes desde el 9 de noviembre, así que la
vista no puede calcular los días de oficina por día de la semana.

También pidió que el encabezado de su ruta y la tarjeta «Mi ruta» del portal dejen el texto fijo («Tus clases propias
y las mismas actividades de tu grupo…») y digan lo de su plan («🍥 Mi propio camino ninja»).

## What Changes

- **Pestaña «🗓️ Mi horario»** (solo con `plan.json`): semana de lunes a domingo por días (lista vertical en
  celular; 2 columnas en tableta; 3, 4 o 7 en PC según el ancho), cada tarea con color, ícono y nombre de su materia,
  su estado con ícono y texto (⏳ pendiente, ✅ hecha, ⏰ vencida o ⏩ adelantada) y su botón (Abrir / Ver resultado);
  hoy protagonista («✨ Hoy», `aria-current="date"`); sello 🏢 y «Día de oficina: solo en página» **solo** en las
  fechas de `plan.diasOficina` (sin el campo, ningún sello); «máx. 2» en oficina y «máx. 4» los demás días (solo se
  muestra); flechas «Anterior»/«Siguiente» (limitadas a las semanas con tareas) y «Hoy»; estados vacíos («Día libre»,
  «Semana libre»); reglas plegables y leyenda; progreso por materia.
- **Lo del grupo** que el profe resuelve antes (`grupo: true`) entra al horario con su fecha de profe, la etiqueta
  «👥 Grupo» y la materia de `plan.materiaDelGrupo` (Inglés).
- **Filtro por materia** con chips («Todas» o una), con `aria-pressed`; es uno solo para las dos pestañas y se
  recuerda en el navegador (`profe_materia`).
- **Progreso por materia**: barra con hechas/totales y «Cierra el …». Con `plan.materias` el total (`elementos`) y el
  cierre (`fin`) salen del resumen (el total nunca queda debajo de las tareas que existen); sin él se calculan.
- **Pestaña «🧭 Por materia»**: la ruta agrupada por materia (orden del catálogo) y, dentro, por línea o tema
  (`linea`/`tema` del elemento o su `nivel`; lo del grupo en «Inglés con el grupo»), en orden de fecha.
- **Materia de respaldo** cuando un elemento no trae `materia`: por prefijo del id y su `nivel` (`profe-ing-`, `act-`,
  `tec-`, `refuerzo-`, `examen-`, `guia-` → Inglés; `profe-lid-` → Tech Lead; `profe-staff-`/`profe-ref-` según su
  nivel; `profe-cg-` → Cultura General; exámenes semanales, diagnóstico y AI Assessment → Evaluación; el resto → IA).
- **Encabezado de la ruta** desde `plan.titulo` y `plan.subtitulo` (respaldo: «🍥 Mi propio camino ninja» y un
  subtítulo con sus materias). El panel «⏱️ horas por semana» ya sale de `plan.horasSemana` y `plan.reparto` (sin
  texto fijo). **Tarjeta «Mi ruta» del portal**: «🍥 Mi camino ninja · IA, Staff, Tech Lead, Inglés y Cultura
  General, con todo abierto para avanzar a mi ritmo».
- Reglas puras en `comun/profe-horario-datos.js` (`globalThis.ProfeHorario`), dibujo en `ingles/profe-horario.js` y
  estilos en `ingles/profe-horario.css`. Nada cambia en el servidor: `meta()` ya pasa `materia` y `nivel`, y
  `plan.json` se devuelve tal cual.
- Sin cambios de funciones: liga a cada actividad, «Mis clases», «Esta semana», Mundos, Plan del mes, Mi grupo, Hechas
  y la experiencia RPG siguen igual.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: la vista del profe suma «Mi horario» y «Por materia» (con filtro, progreso y días de oficina del plan) y su
  encabezado sale del plan.

## Impact

- **Superficies:** `ingles.html` (`?modo=profe`) e `index.html` (texto de la tarjeta «Mi ruta»). Servidor Deno,
  Postgres, Realtime, Auth y Notion: sin cambios. Repo de datos: solo lectura de `materia`, `plan.materias`,
  `plan.materiaDelGrupo`, `plan.diasOficina`, `plan.titulo`, `plan.subtitulo`.
- **Acceso:** sin cambios. La ruta del profe la ve solo el admin (`/ingles/profe/actividades`); no se agregan datos de
  alumnas ni alumnos.
- **Archivos:** `comun/profe-horario-datos.js`, `ingles/profe-horario.js`, `ingles/profe-horario.css` (nuevos);
  `ingles/profe.js`, `ingles.html` (`?v=`), `index.html`; pruebas `server/profe_horario_test.ts`,
  `tests/e2e/e2e-profe-horario.js` con `tests/fixtures/profe-horario.json`, `tests/e2e/e2e-profe-diseno.js` (8
  pestañas) y `tests/e2e/correr.sh`; docs `docs/data-model.md`, `docs/frontend-standards.md`, `docs/pruebas.md`.
- **Acciones externas:** el coordinador publica `plan.diasOficina` y el nuevo `plan.titulo`/`subtitulo` en el repo de
  datos (responsable: coordinador). Mientras no exista `diasOficina`, la vista no muestra sellos 🏢.
