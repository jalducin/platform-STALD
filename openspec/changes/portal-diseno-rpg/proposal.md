## Why

El profe pidió (2026-10-22): «Solo falta el diseño en el panel de inicio». Secundaria, Inglés y Juegos ya usan el
diseño RPG compartido (`estilos/ui.css`); el portal (`index.html`) sigue con el diseño anterior: tarjetas simples, sin
encabezado tipo héroe, sin selector de tema y con la entrada (login) de otro estilo.

## What Changes

- **Portal con sesión** (`index.html` + `estilos/portal.css` nuevo, con los tokens `--rpg-*` de `estilos/ui.css`):
  - Encabezado tipo héroe (`#portal-heroe`): avatar de Juegos si existe, saludo con el nombre de pila, fecha y etiqueta
    del rol («🧑‍🏫 Modo maestro»).
  - Avance RPG solo con datos que el portal ya tiene, sin peticiones nuevas: la alumna o el alumno de Secundaria ve su
    semana (clases hechas / total con barra) y su racha (`/secundaria/actividades`). El nivel y rango **no** se muestran
    en el portal: el nivel real suma la XP de las misiones (`/misiones`), que el portal no pide; mostrar uno parcial
    sería un dato distinto al de su página.
  - Tarjetas grandes por área según `/perfil` (Inglés, Mi ruta del profe, Secundaria y Juegos): color y emoji, una línea
    de estado cuando el dato ya existe («2 clases hoy · 1 pendiente», «⭐ 120 puntos esta semana · #3»,
    «3 alumnas y alumnos») y un botón principal real de 44 px o más.
  - «🗓️ Mi horario» (`#sec-portal`) y el atajo de Material con el mismo estilo.
- **Admin (profe):** las mismas tarjetas como accesos rápidos (panel de Inglés, Mi ruta, Secundaria con selector de
  alumna o alumno sacado de la lista que el portal ya pide, y Juegos) y el bloque «🔑 Restablecer contraseña». Sin
  resumen «📥 Por revisar / 🚨 En riesgo»: costaría peticiones extra (`/profe/entregas`, `/ingles/resumen`).
- **Sin sesión:** entrada con el mismo estilo (panel héroe, campos y botones de 44 px), sin perder: contraseña,
  «¿Olvidaste tu contraseña?», invitación a Juegos con correo desconocido, «Crea tu cuenta de Juegos»
  (`juegos.html?registro=1`) e `index.html?juegos=1`.
- **Selector de tema** (`#tema-btn`, 🌓 / 🌙 / ☀️) en el encabezado del portal, con la misma clave `stald_tema` que
  Inglés y Juegos, aplicado antes de pintar.
- **Pie:** enlaces «🔒 Aviso de privacidad» y «📝 Consentimiento» con `data-interruptor="privacidad"` (apagado hoy:
  no se ven).
- Sin cambios de servidor, contrato HTTP ni datos.

## Capabilities

### Modified Capabilities
- `portal`: requisito nuevo «Portal con diseño RPG».

## Impact

- `index.html` (marcado, script y `?v=`), `estilos/portal.css` (nuevo), `docs/frontend-standards.md`.
- E2E nueva `portal-diseno`; las del portal (`portal`, `login`, `peticiones`, `privacidad`, `secundaria-dashboard`,
  `material`, `baja-ingles`) deben seguir en verde con los mismos selectores (`#tiles [data-espacio]`, `#hello`,
  `#admin-tag`, `#sec-portal`, `#material-link`, `#login`, `#guest`, …).
- Peticiones: las mismas que hoy (presupuesto `portal (alumna)` = 5).
- Matriz de acceso: sin cambios. El portal muestra solo lo que `/perfil`, `/juegos/yo` y `/secundaria/actividades`
  ya le daban a esa persona; el selector de alumna solo aparece al admin (lista que el servidor ya le daba solo a él).

## Cómo revertir

Revertir el PR (solo estáticos).
