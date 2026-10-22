## Why

El profe pidió (2026-10-22) aplicar a Inglés el diseño RPG de Secundaria (cambio `secundaria-dashboard`). Este cambio
cubre la vista del **profe/admin** de `ingles.html` (modo admin y `?modo=profe`). La vista de alumnos y alumnas y la
función de ocultar grupos del panel van en cambios aparte (`ingles-alumno-diseno-rpg`, `ingles-ocultar-grupos`).

Después pidió «este diseño igual para mí como profe»: su **ruta de estudio** (`?modo=profe`, las 27 clases de IA y
Claude Code, Minto y Skills de `contenido/profe/`, con su Plan del mes) debe tener la misma experiencia RPG que la
alumna de Secundaria, separada del panel del admin.

Hoy el panel del admin abre con indicadores sueltos: no hay un resumen de un vistazo, los grupos solo se ven como una
lista en «👥 Grupos», el mapa de calor se desplaza de lado en el celular y varios botones (`.btn.sm`, campos del
registro, «🎥 Meet») miden menos de 44 px. La ruta del profe es una lista con «Atrasadas», aunque toda su ruta está
abierta y las fechas son ritmo sugerido.

## What Changes

- **Encabezado del panel** en «🏠 Resumen» (`#panel-profe`), con el estilo de la misión principal de Secundaria. Muestra
  solo datos que ya existen:
  - grupos activos (`/ingles/grupos`, sin los ocultos del panel);
  - alumnos y alumnas del registro (`/ingles/alumnos`, sin bajas);
  - «En riesgo»: sin entregas o con alguna entrega atrasada en la semana (`/ingles/resumen`). Cada nombre abre el cajón;
  - «📥 Por revisar»: misiones de Inglés listas para evaluar (`/profe/entregas`, la bandeja que ya existe), con enlace
    a «Entregas»;
  - con un grupo elegido, todo cuenta solo ese grupo; «🔍 Ver grupo» reinicia también los nicks, como el selector;
  - accesos: «➕ Registrar alumno o alumna», «🎬 Presentar la clase» y «🎓 Mi ruta».
- **Tarjetas por grupo** (`.pp-grupo`) en el Resumen: color, nivel, horario, cuántas personas, avance de la semana
  (entregadas / que ya abrieron) con barra, atrasos, «🔍 Ver grupo» (mismo filtro que el selector) y «🎥 Meet».
- **Tablas legibles en el celular:** abajo de 640 px, el mapa de calor y las tablas de «⭐ Resultados» y «🎮 Juegos»
  pasan a tarjetas por fila, sin scroll horizontal. En escritorio siguen como tabla.
- **Registro** como tarjetas (avatar con el color del grupo, correo, grupo, «🚪 Baja de Inglés», «Quitar» y
  «↩️ Reactivar»). Los campos del alta y de grupos llevan etiqueta visible.
- **Botones reales** en toda la vista del profe: 44 px o más (incluye `.btn.sm`, selectores, campos, casillas, celdas
  del mapa, pestañas de la ruta y «← Inicio» / «🎮 Juegos»), foco visible, hover y deshabilitado. Claro y oscuro.
- **Ruta del profe con la experiencia RPG** (`ingles/profe-rpg.js`): barra de nivel, rango, XP, insignias y racha;
  «⚔️ Misión principal activa»; «⚡ Retos de hoy · a tu ritmo»; pestaña «🌍 Mundos» con 9 mundos (Taller del Agente,
  Fábrica de Specs, Red de Conectores, Colmena de Subagentes, Biblioteca SDD, Arena en Acción, Proyecto Integrador,
  Torre de Minto y Forja de Skills); cada clase por pasos (Teoría → Video → Ejercicios → Libreta) como «⚔️ Misión» con
  «+XP» al terminar. Sin «atrasada»: «Para hoy» y «Ritmo de hoy». «🔥 Pendiente ahora» muestra 5 y pliega el resto.
- **Reglas** (aditivas) en `comun/gamificacion.js`: `MUNDOS_RUTA_PROFE`, `mundoDeClaseRuta`, `mapaRuta`,
  `mundoActualRuta`, `xpRuta` e `insigniasDe({ mapa })`. Secundaria e Inglés no cambian.
- Sin cambios de funciones: alta, baja y reactivar, quitar, grupos (crear, editar, mover, ocultar), resultados y
  retroalimentación (cajón con prórroga y reinicio), nicks, entregas, ruta del profe y su Plan del mes, Meets y material
  siguen igual.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: requisitos nuevos «Panel del profe con diseño RPG» y «Ruta del profe con la experiencia RPG».

## Impact

- Superficies: `ingles.html` (enlaces y `?v=`), `index.html` (`gamificacion.js?v=`), `ingles/admin.js`,
  `ingles/tablero.js`, `ingles/profe.js`, `ingles/profe-rpg.js` (nuevo), `ingles/panel-profe.css` (nuevo),
  `ingles/reproductor.js` y `ingles/secundaria-clase.js` (clase por pasos también en `?modo=profe`),
  `comun/gamificacion.js` (aditivo).
- Sin cambios en el servidor, el contrato HTTP, Postgres, el repo de datos ni Notion.
- Matriz de acceso: no cambia. El panel solo pinta lo que el servidor ya entrega al admin; la ruta, lo que
  `/ingles/profe/actividades` ya entrega al profe. Una alumna o alumno no recibe estos datos ni ve estas vistas.
- Pruebas: `server/gamificacion_profe_test.ts` (reglas) y E2E nueva `ingles-diseno-profe` (fase `ingles`); se ajustan
  `profe-diseno` (6 pestañas con plan y tope de altura con el tablero) y `peticiones` (+2 del admin: la bandeja).
- Docs: `docs/frontend-standards.md`, `docs/pruebas.md`.
- Acciones externas: ninguna.
