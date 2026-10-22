## ADDED Requirements

### Requirement: Inicio de Secundaria tipo tablero
`ingles.html?modo=secundaria` (adonde lleva `secundaria.html`) SHALL abrir en la pestaña «🏠 Inicio». El Inicio SHALL
mostrar:

- una barra con nivel, rango, XP del nivel, insignias y racha (reglas de `gamificacion`);
- «Hola, <nombre>» con la fecha de hoy y la «Misión principal activa» (la primera clase de hoy sin hacer o, si no
  hay, la próxima);
- «Retos diarios · Hoy te toca»: una tarjeta grande por clase de hoy y por lo pendiente que vence hoy. Cada tarjeta
  trae chip de materia con color y emoji, tema, estado (pendiente, vence hoy, vence mañana, en curso, hecha con su
  calificación, atrasada o todavía no abre), mundo, XP y un botón principal «Empezar», «Continuar» o «Ver resultado»
  que abre la clase;
- progreso de la semana (x de y clases hechas), racha, mundos, actividad reciente, promedio por materia, insignias;
- accesos a «📅 Esta semana», «🗓️ Mi horario» y «📚 Mis materias».

Sin clases hoy SHALL decir «Hoy no tienes clases 🎉» y su próxima clase. El admin SHALL ver el mismo tablero con los
datos de la alumna elegida (`?alumna=<slug>`, selector), de solo lectura («👀 Vista previa» en lugar de Empezar), y
además «📝 Resultados». La pestaña SHALL guardarse en el hash (`#inicio`, `#semana`, `#horario`, `#materias`,
`#resultados`). Debe verse a 360 px sin scroll horizontal, en modo claro y oscuro.

#### Scenario: Retos de hoy
- **WHEN** hoy es 2026-10-27 y la alumna ya hizo Matemáticas (100 %) y le falta Ciencias, que vence hoy
- **THEN** ve 2 tarjetas: Matemáticas «Hecha · 100 %» con «Ver resultado» y Ciencias «Vence hoy» con «Empezar», y
  «1 / 2 · ¡Te falta 1 reto para completar el día!»

#### Scenario: Progreso, racha, XP y promedios
- **WHEN** de las 15 clases de la semana hizo 3 (Inglés 100 % tarde, Español 50 % tarde, Matemáticas 100 % a tiempo)
  y envió algo hoy
- **THEN** ve «3 de 15 clases hechas», «1 día seguido», «Nv. 1 · Aprendiz» (cambio `fix-e2e-rpg`) con 270 / 300 XP, 2 de 7 insignias y
  promedios Inglés 100 %, Español 50 % y Matemáticas 100 %

#### Scenario: Sin clases hoy
- **WHEN** hoy no tiene clases
- **THEN** ve «Hoy no tienes clases 🎉» y su próxima clase

#### Scenario: Vista del profe
- **WHEN** el admin abre `ingles.html?modo=secundaria&alumna=<slug>`
- **THEN** ve el tablero de esa alumna con su selector, «Vista previa» en lugar de «Empezar» y la pestaña
  «📝 Resultados»

#### Scenario: Sin Secundaria
- **WHEN** entra un correo sin Secundaria
- **THEN** ve el aviso de que la sección es solo para alumnos y alumnas de Secundaria

### Requirement: Mis materias y mundos
La pestaña «📚 Mis materias» SHALL mostrar una tarjeta por cada una de las 8 materias (y «Otras clases» si hay clases
sin materia conocida). Cada tarjeta trae clases hechas / total, promedio, último tema visto y su camino de mundos
(completado, en curso o bloqueado, con el actual marcado). Las secuencias SHALL salir de constantes del front
documentadas (`Gamificacion.MUNDOS`, `SecundariaDatos.SECUENCIAS`), copiadas de la skill `clases-secundaria`, sin
inventar datos.

#### Scenario: Matemáticas en octubre
- **WHEN** hoy es 2026-10-27 y tiene 2 clases de Matemáticas, una hecha con 100 %
- **THEN** la tarjeta dice «1 de 2 clases hechas», «⭐ 100 %» y el camino Valle de los Números (Aritmética, ahora) →
  Ciudad de las Formas → Torre de las Incógnitas (bloqueado)

### Requirement: Día de cada clase de Secundaria
El día de una clase SHALL ser su `disponibleDesde` cuando vence ese mismo día o el siguiente, y su `fechaLimite`
cuando tiene una ventana más larga. «Hoy», «📅 Esta semana», «🗓️ Mi horario» y el horario del portal SHALL agruparse
por ese día.

#### Scenario: Clase que abre el lunes y vence el martes
- **WHEN** una clase tiene `disponibleDesde` 2026-10-26 y `fechaLimite` 2026-10-27
- **THEN** aparece el lunes 26

#### Scenario: Guía con ventana
- **WHEN** una tarea abre el 2026-10-21 y vence el 2026-10-24
- **THEN** aparece el sábado 24

### Requirement: Botones reales en Secundaria
En Secundaria, «← Inicio», «🎮 Juegos», «Cerrar sesión», las pestañas, los accesos y los botones de cada clase SHALL
verse y comportarse como botones: fondo, borde, padding, hover, foco visible, estado deshabilitado y un área táctil de
al menos 44 px.

#### Scenario: Celular
- **WHEN** la página mide 360 px
- **THEN** todos esos botones miden 44 px o más de alto y el foco con teclado se ve
