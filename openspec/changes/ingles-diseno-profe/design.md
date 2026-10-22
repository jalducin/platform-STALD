## Context

`ingles.html` pinta la vista del admin con `renderAdmin` (`ingles/tablero.js`) y la ruta del profe con `renderProfe`
(`ingles/profe.js`). Las dos ponen `body.vista-admin`. El diseño RPG de Secundaria vive en `ingles/secundaria.css`
(tokens `--rpg-*` en `:root`, en claro y oscuro) y `estilos/stald.css` (tokens base, `.btn`, `.barra`, `.chip`).
Otros dos agentes trabajan en paralelo: la vista de alumnos y alumnas (`alumno.js`, `ingles.css`) y ocultar grupos.

## Goals / Non-Goals

**Goals:** resumen de un vistazo, tarjetas por grupo, tablas legibles a 360 px, botones de 44 px, claro y oscuro, sin
perder funciones. **Non-Goals:** cambiar el servidor o el contrato; métricas nuevas (p. ej. entregas por revisar);
rediseñar la vista de alumnos y alumnas.

## Decisions

1. **CSS propio y acotado** (`ingles/panel-profe.css`, todo bajo `.vista-admin` o con prefijo `pp-`/`reg-`), cargado
   después de `secundaria.css` para reusar `--rpg-*`. Así no se pisa con el agente de la vista de alumnos (que edita
   `ingles.css`). Alternativa descartada: editar `ingles.css`, con más riesgo de conflictos. Si en `main` aparece un
   CSS común (p. ej. `estilos/ui.css`), se podrá mover ahí después.
2. **Solo datos existentes.** «En riesgo» = `kpis.sinEntregas` ∪ filas con alguna celda `atrasado` del mismo
   `/ingles/resumen`. Se repinta (`pintarPanelProfe`) cuando llega el resumen; mientras, «…». Si el resumen falla, el
   mosaico no sale (el tablero ya muestra el error).
3. **Avance por grupo** del mismo resumen: celdas que ya abrieron (sin `no-aplica` ni `proximamente`) de las filas del
   grupo (`grupoDeNombre`). Con el filtro puesto, solo sale la tarjeta de ese grupo con «👥 Ver todos».
4. **Tablas a tarjetas con CSS**: `td[data-label]` en el mapa de calor y `display: grid/block` abajo de 640 px. El DOM
   y los selectores (`#mapa-calor tr[data-alumno]`, `.ultimas-tabla`) no cambian, así las E2E existentes siguen.
5. **Registro**: se conservan ids, `data-action`, `data-email`, `data-baja`, `.ultimas-lista`, `#bajas-ingles` y
   `select.mover-grupo`; solo cambia el envoltorio (`.reg-fila`) y los campos se envuelven en `<label>`.
6. **«🔍 Ver grupo»** usa el mismo estado que el selector (`state.grupoFiltro`), con un escucha propio en `tablero.js`
   para no tocar `app.js`.

## Risks / Trade-offs

- Sin Postgres, `/ingles/grupos` responde 503: la E2E de diseño intercepta solo ese GET en el navegador con dos grupos
  de ejemplo. Las acciones reales de grupos las cubre la E2E `grupos` (con `--pg`).
- Conflictos de `?v=` en `ingles.html` con los otros agentes: se resuelven al hacer merge de `main`.
