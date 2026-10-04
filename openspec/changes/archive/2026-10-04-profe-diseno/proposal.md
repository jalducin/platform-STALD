## Why

El profe pidió mejorar el diseño de su vista de Inglés (`ingles.html?modo=profe`). Hoy los problemas son estos:
- Es una sola columna muy larga: unos 3,600 px en escritorio y casi 5,000 px en celular.
- El plan del mes completo está siempre abierto.
- Lo urgente (sus atrasadas y lo del grupo que tiene que resolver antes) está repartido arriba y abajo.
- En escritorio desperdicia el ancho.

## What Changes

Solo cambia el frontend de la vista del profe. La vista de alumnos y alumnas y la del admin quedan igual.

- **Encabezado de progreso**:
  - semana actual del plan;
  - barra del mes con el avance de su ruta;
  - contadores: hechas, atrasadas, hoy y próximas;
  - la siguiente entrega.
- **🔥 Pendiente ahora**, una sola tarjeta con todo lo que urge:
  - atrasadas y de hoy, de su ruta (🎓) y del grupo (👥), en orden de fecha y con su botón de acción;
  - si no hay nada, dice "¡Al día!".
- **Pestañas**: 📅 Esta semana · 🗺️ Plan del mes · 👥 Mi grupo · ✅ Hechas.
  - Esta semana: lo de la semana con objetivo, temas, Busuu y práctica extra.
  - Plan del mes: un acordeón por semana; solo la semana actual va abierta y cada semana muestra su avance (x/y).
  - La página recuerda la última pestaña abierta en ese navegador.
- **Escritorio (≥ 960 px)**:
  - la página se ensancha a 1,080 px;
  - dos columnas: el contenido y una barra lateral fija;
  - la barra lateral tiene las horas por semana, la rutina y reglas, y las próximas 3 entregas.
- **Celular**: una columna, con las pestañas desplazables y la barra lateral al final.

## Capabilities

### Modified Capabilities
- `ingles`: diseño de la ruta del profe.

## Impact

- `ingles.html`: CSS de la vista del profe, más `renderProfe`, `renderPlanProfe` y `renderGrupoProfe`.
- `docs/frontend-standards.md`.
- Se ajustan los E2E del profe a las pestañas.
