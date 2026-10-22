## Why

El profe pidió (2026-10-21) que Secundaria «sea una plataforma interactiva», con un diseño más profesional y botones
que sean botones. Después dio una referencia visual de «RPG educativo»: barra de XP, nivel y rango, insignias, racha,
misión principal, mapa de mundos, retos diarios y actividad reciente. No lleva ranking (hay una sola alumna) ni panel
de padres.

Hoy `secundaria.html` lleva a `ingles.html?modo=secundaria`, que abre con una lista. Ahí no se ve qué le toca hoy, cómo
va en la semana ni sus promedios. «Hoy» y «Mi horario» agrupan por `fechaLimite`. En el repo de datos cada clase abre
su día y vence al siguiente, así que las clases del lunes salían el martes.

## What Changes

- **Inicio tipo tablero RPG** (pestaña «🏠 Inicio», la primera de `ingles.html?modo=secundaria`, adonde llega
  `secundaria.html`):
  - barra de nivel, rango, XP del nivel, insignias y racha (`comun/gamificacion.js`, cambio `gamificacion-nucleo`);
  - «⚔️ Misión principal activa» con «Hola, <nombre>» y la fecha;
  - «⚡ Retos diarios · Hoy te toca»: tarjetas grandes por clase con chip de materia, estado (pendiente, vence hoy o
    mañana, en curso, hecha con calificación, atrasada, todavía no abre), mundo, XP y un botón grande «Empezar»,
    «Continuar» o «Ver resultado»;
  - progreso de la semana (anillo, x de y), racha y mundos;
  - actividad reciente con su XP, promedio por materia, insignias;
  - accesos a «📅 Esta semana», «🗓️ Mi horario» y «📚 Mis materias y mundos».
- **«📚 Mis materias»**: una tarjeta por materia con clases hechas/total, promedio, último tema y su camino de mundos
  (completado, en curso o bloqueado). Las secuencias salen de la skill `clases-secundaria`, por medio de
  `Gamificacion.MUNDOS` y `SecundariaDatos.SECUENCIAS`.
- **Día de la clase:** `disponibleDesde` si dura un día; si tiene ventana, su `fechaLimite`. Aplica a Hoy, Esta
  semana, Mi horario y el portal.
- **Pestañas** con hash (`#inicio`, `#semana`, `#horario`, `#materias`, `#resultados`). Al volver de una clase se queda
  la pestaña. Al recargar dentro de una clase se abre «📅 Esta semana».
- **Admin (profe):** ve el mismo tablero con los datos de una alumna (`?alumna=<slug>`, selector), con «Vista previa»
  en lugar de Empezar, y además «📝 Resultados» por clase.
- **Portal (`index.html`):** quien tiene Secundaria ve el bloque «🗓️ Mi horario». Trae 7 días compactos, «Hoy te
  toca: …» destacado y los botones «📚 Mis clases» y «🗓️ Mi horario». El admin ve el horario de la primera alumna.
- **Botones reales:** en Secundaria, «← Inicio», «🎮 Juegos», «Cerrar sesión», las pestañas, los accesos y los botones
  de clase tienen fondo, borde, padding, hover, foco visible, estado deshabilitado y área táctil de 44 px o más. En el
  portal, los botones del bloque.
- **Estilos:** `ingles/secundaria.css` (nuevo) y `estilos/materias.css` (colores por materia, movidos desde
  `ingles/ingles.css` para compartirlos con el portal). Las fuentes Inter y Orbitron de Google Fonts se cargan solo en
  modo Secundaria.
- **Lógica pura** en `comun/secundaria-datos.js`: día de la clase, estado, progreso, promedios, horario y materias.
  Reusa `comun/gamificacion.js`.
- **Servidor:** sin cambios en este PR. Usa `/secundaria/actividades`: `hoy`, `racha`, `estado`, `intentosUsados`,
  `mejor`, `mejorATiempo`, `ultimoEnvio`, `materia`, `alumnas` y `vistaDe`. También usa `/perfil` (nombre).

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `examenes-secundaria`: requisitos nuevos (ADDED) «Inicio de Secundaria tipo tablero», «Mis materias y mundos»,
  «Día de cada clase de Secundaria» y «Botones reales en Secundaria».
- `portal`: requisito nuevo (ADDED) «Mi horario de Secundaria en el portal».

## Impact

- Superficies:
  - `ingles.html` (modo Secundaria), `ingles/secundaria.js`, `ingles/secundaria-inicio.js` (nuevo),
    `ingles/secundaria.css` (nuevo) e `ingles/ingles.css` (sin los colores de materia);
  - `estilos/materias.css` (nuevo), `comun/secundaria-datos.js` (nuevo), `index.html`;
  - E2E.
- Sin cambios en el servidor, Postgres, Notion ni en el repo de datos.
- Matriz de acceso (sin cambios):

  | Quién | `secundaria.html` / `ingles.html?modo=secundaria` | Bloque «🗓️ Mi horario» del portal |
  |---|---|---|
  | Alumna de Secundaria | su tablero (sus clases, XP, insignias, promedios) | su semana |
  | Admin | el tablero de la alumna elegida (`?alumna=`), solo lectura, y «📝 Resultados» | la semana de la primera alumna |
  | Persona sin Secundaria | aviso «solo para alumnos y alumnas de Secundaria» (403) | no aparece |
  | Sin sesión | entrada con contraseña (401) | — |

  La página no decide permisos: muestra lo que devuelve el servidor.
- Acciones externas: publicación en Pages al fusionar (agente); verificación en producción solo lectura (agente).
- Coordinación: el PR #225 (clase interactiva) toca `ingles.html`, `ingles/ingles.css` y `ingles/reproductor.js`. Antes
  de fusionar se hace merge de `main` y se sube el `?v=` por encima del que haya.

## Cómo revertir

Revertir el PR. Los datos no cambian.
