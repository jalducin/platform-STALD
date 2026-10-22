## ADDED Requirements

### Requirement: Panel del profe con diseño RPG
La vista del admin de `ingles.html` y la ruta del profe (`ingles.html?modo=profe`) SHALL usar el diseño RPG de
Secundaria (tarjetas, chips de color, barras de progreso y botones reales), en claro y oscuro. «🏠 Resumen» SHALL
abrir con un encabezado (`#panel-profe`) que muestre solo datos que ya entrega el servidor: grupos activos, alumnos y
alumnas del registro sin bajas y quienes están «En riesgo» (sin entregas o con alguna entrega atrasada en la semana del
resumen), con un botón por persona que abre su cajón. No SHALL mostrar métricas que no existen (p. ej. entregas por
revisar).

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
- **THEN** ve «2 Grupos activos», «7 Alumnos y alumnas» y el número de «En riesgo» cuando llega el resumen, sin
  «entregas por revisar»

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
