## Why

El profe pidió (2026-10-22) que el diseño de Secundaria se aplique a todo Inglés, no solo al tablero. La vista de
alumnos y alumnas debía tener botones reales, tarjetas y chips, funcionar en claro y oscuro y a 360 px, y abrir las
actividades y exámenes por pasos, como la misión de Secundaria. La vista del profe la rediseña otro agente en paralelo.

## What Changes

- **Actividades y exámenes por pasos** (vista de alumnos y alumnas): `openItem` usa la clase de
  `ingles/secundaria-clase.js` (1 Teoría → 2 Video → 3 Ejercicios → 4 Libreta, videos de YouTube incrustados con
  `youtube-nocookie`, libreta con «✅ Ya la hice») mediante `claseEnPasos()`.
  - En Inglés la etiqueta es el tipo («📘 Actividad», «📝 Examen», «🔁 Refuerzo», «🎥 Reto del Meet»), no «Misión»,
    y el mundo es el de Inglés.
  - El resultado muestra «🎉 ¡Listo!», «+N XP», el nivel y «Lo siguiente →».
  - Los tips sin enlace se ven en la Teoría (como en la vista de lista). La práctica revisada en el servidor
    (`/practica/comprobar`) sigue solo en Secundaria. «Lo siguiente →» omite los Meets sin reto, y el nivel del
    resultado incluye la XP de las misiones evaluadas.
  - El admin (vista previa) y la ruta del profe siguen con la vista de lista.
- **Diseño RPG de toda la vista** (`ingles/rpg-ingles.css`, solo `body.vista-alumno` fuera de Secundaria). Aplica a
  Inicio, Semana (Esta semana, Para ponerte al día, Todas mis tareas, con los Meets), ⚔️ Misiones, Material, Resultados y Perfil:
  - paneles con los tokens `--rpg-*` de `estilos/ui.css`;
  - cada fila de actividad como tarjeta;
  - botones de 44 px o más con foco visible;
  - chips en píldora y la pestaña actual en índigo.
- Sin cambios de servidor ni de datos.

## Capabilities

### Modified Capabilities
- `ingles`: requisito nuevo «Vista de alumnos y alumnas con diseño RPG y actividades por pasos».
- Se actualiza el escenario «Inglés sin cambios» del cambio sin archivar `secundaria-sin-notion` (requisito «Clase
  interactiva de Secundaria»): ahora dice «Inglés por pasos».

## Impact

- `ingles.html` (`?v=`), `ingles/reproductor.js`, `ingles/secundaria-clase.js` y `ingles/rpg-ingles.css`.
- E2E nueva `ingles-alumno-diseno`; `e2e-secundaria-clase.js` actualizada.
- Matriz de acceso: sin cambios, porque es solo presentación. Alumnos y alumnas ven lo suyo, y el admin conserva su
  vista previa.

## Cómo revertir

Revertir el PR (solo estáticos).
