## MODIFIED Requirements

### Requirement: Vista del profe ordenada por urgencia
La vista del profe (`ingles.html?modo=profe`) SHALL mostrar primero su avance y lo que está pendiente ahora.
Después SHALL organizar el resto en pestañas: Esta semana, Material, Mundos (con plan), Plan del mes (con plan), Mi
grupo y Hechas. «🔥 Pendiente ahora» SHALL mostrar 5 elementos y plegar el resto; las clases de su ruta no se marcan
como atrasadas (su ruta va a su ritmo: «Para hoy»).

#### Scenario: Lo urgente arriba
- **WHEN** el profe tiene una actividad de su ruta con la fecha sugerida ya pasada y un examen del grupo por resolver
- **THEN** ambas aparecen en "🔥 Pendiente ahora", con su etiqueta (🎓 Mis clases o 👥 Grupo) y su botón para resolver

#### Scenario: Plan del mes compacto
- **WHEN** el profe abre la pestaña Plan del mes
- **THEN** solo la semana actual está abierta, y las demás muestran su título y su avance (x/y)

#### Scenario: Se recuerda la pestaña
- **WHEN** el profe deja abierta la pestaña Mi grupo y vuelve a entrar
- **THEN** la página abre en Mi grupo

#### Scenario: Escritorio en dos columnas
- **WHEN** el profe abre su vista en una pantalla de 960 px o más
- **THEN** ve el contenido a la izquierda y una barra lateral con horas, rutina y próximas entregas

#### Scenario: Celular
- **WHEN** el profe abre su vista en el celular
- **THEN** todo va en una sola columna, sin desplazamiento horizontal de la página

## ADDED Requirements

### Requirement: Panel del profe con diseño RPG
La vista del admin de `ingles.html` y la ruta del profe (`ingles.html?modo=profe`) SHALL usar el diseño RPG de
Secundaria (tarjetas, chips de color, barras de progreso y botones reales), en claro y oscuro. «🏠 Resumen» SHALL
abrir con un encabezado (`#panel-profe`) que muestre solo datos que ya entrega el servidor: grupos activos, alumnos y
alumnas del registro sin bajas y quienes están «En riesgo» (sin entregas o con alguna entrega atrasada en la semana del
resumen), con un botón por persona que abre su cajón, y «📥 Por revisar» (misiones de Inglés listas para evaluar de
la bandeja `/profe/entregas`) con enlace a «Entregas», solo si la bandeja carga. Con un grupo elegido, el encabezado
SHALL contar solo ese grupo, y los grupos ocultos del panel no cuentan salvo con «Mostrar grupos ocultos». No SHALL
mostrar métricas que no existen.

Con grupos activos, el Resumen SHALL mostrar una tarjeta por grupo con su color, nivel, horario, número de alumnos y
alumnas, avance de la semana (entregadas / que ya abrieron, con barra), atrasos, «🔍 Ver grupo» (mismo filtro que el
selector «👥 Grupo») y «🎥 Meet» si tiene enlace.

Abajo de 640 px, el mapa de calor y las tablas de resultados y juegos SHALL verse como tarjetas, sin scroll horizontal
a 360 px. «➕ Registro» SHALL mostrar a cada alumno o alumna como tarjeta con su grupo, «🚪 Baja de Inglés» y «Quitar»
(o «↩️ Reactivar» si está de baja), y los campos del alta y de grupos con etiqueta visible. Todo botón, enlace-botón,
selector y campo visible de la vista del profe (incluido el cajón) SHALL medir 44 px o más, con foco visible, hover y
estado deshabilitado.

Las funciones actuales SHALL seguir igual: alta, baja, reactivar y quitar; crear, editar y mover grupos; resultados,
prórroga y reinicio en el cajón; ruta del profe y su Plan del mes con todas sus clases abiertas; Meets y material.
La matriz de acceso no cambia: solo el admin recibe y ve estos datos.

#### Scenario: Encabezado con resumen
- **WHEN** el admin abre `ingles.html#resumen` con 2 grupos activos y 7 alumnos y alumnas en el registro
- **THEN** ve «2 Grupos activos», «7 Alumnos y alumnas», el número de «En riesgo» cuando llega el resumen y
  «📥 Por revisar» con las entregas listas de la bandeja

#### Scenario: Encabezado con un grupo elegido
- **WHEN** el admin toca «🔍 Ver grupo» en «Sábado A1»
- **THEN** el título dice «Sábado A1», no aparece «Grupos activos», y «Alumnos y alumnas» y «Por revisar» cuentan solo
  ese grupo; la sección «Nicks» se vuelve a pedir para ese grupo, como con el selector

#### Scenario: Tarjeta por grupo
- **WHEN** hay grupos activos y llega el resumen de todos los grupos
- **THEN** cada grupo tiene su tarjeta con «Entregas de la semana» y barra; «🔍 Ver grupo» deja el selector en ese grupo

#### Scenario: Celular a 360 px
- **WHEN** el admin abre cualquier sección a 360 px, en claro u oscuro
- **THEN** no hay scroll horizontal, el mapa de calor se ve como una tarjeta por alumno o alumna y todos los controles
  visibles miden 44 px o más

#### Scenario: Ruta del profe con el Plan del mes
- **WHEN** el profe abre `ingles.html?modo=profe` y la pestaña «🗺️ Plan del mes»
- **THEN** ve las 27 clases del plan y cada una ya abierta trae su botón, con controles de 44 px o más y sin scroll
  horizontal a 360 px

#### Scenario: Sin grupos activos
- **WHEN** Inglés no usa la base de datos (`/ingles/grupos` responde 503)
- **THEN** el encabezado no muestra «Grupos activos» ni tarjetas por grupo, y el resto del panel funciona igual

### Requirement: Ruta del profe con la experiencia RPG
Con `plan.json`, `ingles.html?modo=profe` SHALL mostrar su ruta de estudio con la misma experiencia RPG que la alumna
de Secundaria, separada del panel del admin (grupos, registro, entregas):

- barra de nivel, rango, XP del nivel, insignias y racha;
- «⚔️ Misión principal activa» (lo que ya empezó; si no, lo primero pendiente del mundo actual) con su botón;
- «⚡ Retos de hoy · a tu ritmo»: hasta 3 clases pendientes cuya fecha sugerida ya llegó (o, si va al día, las
  siguientes), con su mundo, estado y XP;
- la pestaña «🌍 Mundos»: el camino de mundos de su ruta y una tarjeta por mundo con avance y sus clases;
- con plan, cada clase se abre por pasos (Teoría → Video → Ejercicios → Libreta) con el banner «⚔️ Misión» y su mundo, y al
  enviarla muestra «+XP», el nivel y las insignias nuevas.

Los mundos de la ruta SHALL ser «Taller del Agente» (semanas 1–2), «Fábrica de Specs» (3), «Red de Conectores» (4),
«Colmena de Subagentes» (5), «Biblioteca SDD» (6), «Arena en Acción» (7) y «Proyecto Integrador» (8), más «Torre de
Minto» (clases de la Pirámide de Minto) y «Forja de Skills» (clases de Skills), que ganan sobre la semana. Las reglas
(XP, nivel, insignias y mundos) SHALL salir de `comun/gamificacion.js` sin cambiar las de Secundaria ni las de Inglés.
Toda la ruta está abierta y las fechas son ritmo sugerido: ningún estado de la ruta SHALL decir «atrasada» ni
«bloqueado», y toda clase hecha cuenta con el bono de a tiempo. «🔥 Pendiente ahora» muestra 5 y pliega el resto.

#### Scenario: Tablero de la ruta
- **WHEN** el profe abre `ingles.html?modo=profe` el 2026-10-22 con su plan de 27 clases
- **THEN** ve su nivel y XP, la misión principal con «Empezar», retos de hoy y ningún texto «atrasada»

#### Scenario: Mundos de la ruta
- **WHEN** abre «🌍 Mundos»
- **THEN** ve los 9 mundos; «Pirámide de Minto 1» está en «Torre de Minto» y «Clase: Skills en Claude a fondo» en
  «Forja de Skills»

#### Scenario: Clase como misión con XP
- **WHEN** abre la misión principal y envía sus respuestas
- **THEN** la clase se ve por pasos con «⚔️ Misión» y su mundo, y el resultado muestra «+XP» con su nivel

#### Scenario: Sin plan
- **WHEN** los datos no traen `plan.json`
- **THEN** no hay tablero RPG ni pestaña «🌍 Mundos», y las clases se abren como lista; la vista del profe queda como
  antes

#### Scenario: Actividad del grupo
- **WHEN** el profe resuelve una actividad de «👥 Mi grupo»
- **THEN** se abre por pasos, sin mundo, y al enviarla no muestra «+XP» (no es de su ruta)
