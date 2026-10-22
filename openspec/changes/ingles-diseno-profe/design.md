## Context

`ingles.html` pinta la vista del admin con `renderAdmin` (`ingles/tablero.js`) y la ruta del profe con `renderProfe`
(`ingles/profe.js`). Las dos ponen `body.vista-admin`. El diseño RPG de Secundaria vive en `ingles/secundaria.css`
(tokens `--rpg-*` en `:root`, en claro y oscuro) y `estilos/stald.css` (tokens base, `.btn`, `.barra`, `.chip`).
Otros dos agentes trabajan en paralelo: la vista de alumnos y alumnas (`alumno.js`, `ingles.css`) y ocultar grupos.

## Goals / Non-Goals

**Goals:** resumen de un vistazo, tarjetas por grupo, tablas legibles a 360 px, botones de 44 px, claro y oscuro, sin
perder funciones. **Non-Goals:** cambiar el servidor o el contrato; métricas que el servidor no entrega;
rediseñar la vista de alumnos y alumnas.

## Decisions

1. **CSS propio y acotado** (`ingles/panel-profe.css`, todo bajo `.vista-admin` o con prefijo `pp-`/`reg-`), cargado
   después de `estilos/ui.css` (CSS común del diseño RPG, cambio `juegos-diseno-rpg`) para reusar `--rpg-*`,
   `.rpg-etiqueta`, `.rpg-num` y `.rpg-xp-barra`. Así no se pisa con el agente de la vista de alumnos (que edita
   `ingles.css`). Alternativa descartada: editar `ingles.css`, con más riesgo de conflictos.
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

7. **«📥 Por revisar»** reusa la bandeja de entregas (`cargarBandejaSec`, `/profe/entregas`, cambio
   `rpg-fase2-misiones`): se pide una vez al cargar el resumen y el mosaico solo sale si carga bien (`pendientes`).
8. **Alcance del encabezado**: con un grupo elegido cuenta solo ese grupo (sin «Grupos activos»); sin grupo, deja fuera
   a los ocultos del panel (`ocultoEnPanel`, `gruposDelPanel`) salvo con «Mostrar grupos ocultos».

### Ruta del profe con la experiencia RPG

9. **Reglas aditivas en `comun/gamificacion.js`** (sin tocar las de Secundaria ni las de Inglés; las fijan
   `gamificacion_regresion_test.ts` y las demás pruebas):
   - `MUNDOS_RUTA_PROFE`: 7 mundos por semana del plan (`semanas`) y 2 por patrón del título (`patron`: Minto y
     «Clase: Skills…»), que ganan sobre la semana. Propuesta del coordinador, documentada en frontend-standards;
   - `mundoDeClaseRuta(el, n)`, `mapaRuta(plan, items, hoy)` (estados `completado`, `en-curso`, `abierto`; nunca
     `bloqueado`), `mundoActualRuta(mapa)`;
   - `xpRuta(items)` = `xpTotal(items, { aTiempo: true })`: misma fórmula de siempre, con todo a tiempo porque las
     fechas son ritmo sugerido;
   - `insigniasDe({ …, mapa })`: si viene `mapa`, «Mundo completado» sale de él (antes: de las materias de Secundaria).
   Alternativa descartada: generalizar `mapaMundos`/`mapaRpg` con un parámetro de catálogo; esas funciones están
   atadas a `MATERIAS` y a fechas de calendario, y cambiarlas arriesgaba Secundaria.
10. **Tablero** en `ingles/profe-rpg.js` (solo dibuja): reusa `barraRpg` de `secundaria-inicio.js` y las clases CSS de
   Secundaria (`rpg-mision`, `sec-tarjeta`, `sec-materia`, `sec-secuencia`, `rpg-xp-barra`). Rango en masculino
   (`GENERO_PROFE = 'm'`), la forma con la que la plataforma nombra al profe.
11. **Clase por pasos**: `claseEnPasos()` (reproductor) incluye `MODO_PROFE`; `secundaria-clase.js` pone «⚔️ Misión»,
   el mundo de la clase (`mundoDeClaseProfe`) y, al enviar, la recompensa de su ruta (`recompensaProfe`, con
   `htmlRecompensa` compartido). Lo del grupo (`grupo: true`) se abre igual por pasos, sin mundo.
12. **Sin «atrasada»** en la ruta: el contador «Atrasadas» pasa a «Para hoy» y el tercero a «Mundos» (x/9); los estados
   de las clases son «Ritmo de hoy», «Abierta», «En curso» o «Hecha». «🔥 Pendiente ahora» muestra 5 y pliega el resto
   (con 25 pendientes empujaba todo hacia abajo).

## Risks / Trade-offs

- Sin Postgres, `/ingles/grupos` responde 503: la E2E de diseño intercepta solo ese GET en el navegador con dos grupos
  de ejemplo. Las acciones reales de grupos las cubre la E2E `grupos` (con `--pg`).
- Conflictos de `?v=` en `ingles.html` con los otros agentes: se resuelven al hacer merge de `main`.
