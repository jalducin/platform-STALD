## ADDED Requirements

### Requirement: Vista de alumnos y alumnas con diseño RPG y actividades por pasos
La vista de alumnos y alumnas de `ingles.html` SHALL usar el lenguaje visual de Secundaria en todas sus secciones
(Inicio, Semana con «Esta semana» y «Para ponerte al día», «⚔️ Misiones», Material de estudio, Resultados y Perfil):
- paneles con borde y brillo RPG y filas de actividad como tarjetas;
- botones reales de al menos 44 px con foco visible y chips en píldora;
- modo claro y oscuro, sin scroll horizontal a 360 px.

Al abrir una actividad, examen, refuerzo o reto del Meet, la vista SHALL guiar por pasos «1 Teoría → 2 Video →
3 Ejercicios → 4 Libreta» con la misma clase de Secundaria (`ingles/secundaria-clase.js`, sin duplicarla):
- la etiqueta SHALL ser el tipo y no «Misión», y el mundo SHALL ser el de Inglés;
- al enviar, SHALL verse el resultado con «+N XP», el nivel y «Lo siguiente →».

La vista previa del admin SHALL seguir como antes (la ruta del profe la cambia `ingles-diseno-profe`).

#### Scenario: Semana a 360 px
- **WHEN** una alumna abre «📅 Semana» en un celular de 360 px en modo oscuro
- **THEN** cada actividad se ve como tarjeta con su botón de al menos 44 px y no hay scroll horizontal

#### Scenario: Actividad por pasos
- **WHEN** un alumno abre una actividad con teoría, video, ejercicios y libreta
- **THEN** ve el indicador de 4 pasos, la etiqueta «📘 Actividad» y el mundo «🏝️ Isla del Alfabeto»

#### Scenario: Vista previa del admin
- **WHEN** el profe abre la vista previa de una actividad
- **THEN** la ve como lista, sin pasos
