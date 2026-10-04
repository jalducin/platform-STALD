## Decisiones

- `render()` en `MODO_PROFE` llama a `renderProfe(act)` en lugar de apilar las tarjetas y el tablero.
- Los números salen de `buildGroups(itemRowsAlumno(act))`, la misma lógica del tablero, así que no se reimplementa la
  clasificación:
  - hechas = `completed` + exámenes hechos;
  - atrasadas = `overdue`;
  - hoy = `today`;
  - próximas = `upcoming`.
- Barra del mes: elementos del plan con `estado: completo` entre el total de elementos del plan.
- Siguiente entrega: el primer pendiente con `fechaLimite >= hoy`.
- **Pendiente ahora**: elementos del profe y del grupo que no están completos y no están "próximamente", con
  `fechaLimite <= hoy`.
  - Cada fila lleva la etiqueta 🎓 Ruta o 👥 Grupo y usa el `accionItem` de siempre, así que los botones son los
    mismos.
- **Pestañas**:
  - son botones `role="tab"` con `aria-selected` y paneles `role="tabpanel"` con `hidden`;
  - cambiar de pestaña no vuelve a dibujar la página (no se pierde el scroll ni el estado);
  - la pestaña se guarda en `localStorage` (`profe_tab`), con try/catch.
- **Plan del mes**:
  - `#ruta-plan` conserva el encabezado (horizonte y nivel);
  - cada `.ruta-sem` es un `<details>` (la semana actual va con `open` y `.actual`);
  - el resumen de cada semana muestra el título y el avance x/y.
- **Mi grupo**: es la tarjeta de siempre `#grupo-profe`.
- **Hechas**: lista de lo completado con su mejor % y el botón "Ver resultado".
- **Barra lateral**:
  - horas por semana (`plan.reparto`);
  - "☀️ Rutina y reglas" plegable;
  - próximas 3 entregas.
- **CSS**:
  - `body.profe .wrap { max-width: 1080px }`;
  - `.pf-grid` en una columna; desde 960 px pasa a `minmax(0,1fr) 300px`, con la barra lateral `position: sticky`;
  - tokens de color existentes; funciona en modo claro y oscuro.

## Pruebas

- E2E `e2e-profe-diseno`, en escritorio y en celular:
  - encabezado con sus contadores y la barra del mes;
  - la tarjeta Pendiente ahora con su etiqueta Ruta o Grupo;
  - cambio de pestañas sin recargar, y la pestaña se recuerda al volver;
  - en el acordeón solo la semana actual va abierta;
  - dos columnas en escritorio y una en celular;
  - alto de la página en escritorio menor al de antes (3,579 px).
- Regresiones:
  - `e2e-ruta-profe`, `e2e-profe-grupo` y `e2e-pronunciacion`, ajustados a las pestañas;
  - `e2e-alta-alumnos` e `e2e-inicio-lunes`, que son la vista de alumno y de admin y no cambian.
