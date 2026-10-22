## Why

El profe pidió (2026-10-22) aplicar a Inglés el diseño RPG de Secundaria (cambio `secundaria-dashboard`). Este cambio
cubre la vista del **profe/admin** de `ingles.html` (modo admin y `?modo=profe`). La vista de alumnos y alumnas y la
función de ocultar grupos del panel van en cambios aparte, en paralelo.

Hoy el panel del admin abre con indicadores sueltos: no hay un resumen de un vistazo, los grupos solo se ven como una
lista en «👥 Grupos», el mapa de calor se desplaza de lado en el celular y varios botones (`.btn.sm`, campos del
registro, «🎥 Meet») miden menos de 44 px.

## What Changes

- **Encabezado del panel** en «🏠 Resumen» (`#panel-profe`), con el estilo de la misión principal de Secundaria. Muestra
  solo datos que ya existen:
  - grupos activos (`/ingles/grupos`);
  - alumnos y alumnas del registro (`/ingles/alumnos`, sin bajas);
  - «En riesgo»: sin entregas o con alguna entrega atrasada en la semana (`/ingles/resumen`). Cada nombre abre el cajón.
  - Accesos: «➕ Registrar alumno o alumna», «🎬 Presentar la clase» y «🎓 Mi ruta».
  - No hay «entregas por revisar»: Inglés califica solo y no tiene esa cola. No se inventa la métrica.
- **Tarjetas por grupo** (`.pp-grupo`) en el Resumen: color, nivel, horario, cuántas personas, avance de la semana
  (entregadas / que ya abrieron) con barra, atrasos, «🔍 Ver grupo» (mismo filtro que el selector) y «🎥 Meet».
- **Tablas legibles en el celular:** abajo de 640 px, el mapa de calor y las tablas de «⭐ Resultados» y «🎮 Juegos»
  pasan a tarjetas por fila, sin scroll horizontal. En escritorio siguen como tabla.
- **Registro** como tarjetas (avatar con el color del grupo, correo, grupo, «🚪 Baja de Inglés», «Quitar» y
  «↩️ Reactivar»). Los campos del alta y de grupos llevan etiqueta visible.
- **Botones reales** en toda la vista del profe: 44 px o más (incluye `.btn.sm`, selectores, campos, celdas del mapa,
  pestañas de la ruta y «← Inicio» / «🎮 Juegos»), foco visible, hover y deshabilitado. Claro y oscuro con tokens.
- **Ruta del profe** (`?modo=profe`): el encabezado, los indicadores, las pestañas y el Plan del mes toman el mismo
  estilo; las 27 clases de IA abiertas conservan su botón.
- Sin cambios de funciones: alta, baja y reactivar, quitar, grupos (crear, editar, mover), resultados y
  retroalimentación (cajón con prórroga y reinicio), ruta del profe y su Plan del mes, Meets y material siguen igual.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: requisito nuevo «Panel del profe con diseño RPG».

## Impact

- Superficies: `ingles.html` (enlace a `ingles/panel-profe.css`, `?v=` de `admin.js` y `tablero.js`),
  `ingles/admin.js`, `ingles/tablero.js`, `ingles/panel-profe.css` (nuevo).
- Sin cambios en el servidor, el contrato HTTP, Postgres, el repo de datos ni Notion.
- Matriz de acceso: no cambia. El panel solo pinta lo que el servidor ya entrega al admin (`isAdmin`); una alumna o
  alumno no recibe estos datos ni ve el panel.
- Pruebas: E2E nueva `ingles-diseno-profe` (fase `ingles`); siguen las de admin/profe.
- Docs: `docs/frontend-standards.md`, `docs/pruebas.md`.
- Acciones externas: ninguna.
