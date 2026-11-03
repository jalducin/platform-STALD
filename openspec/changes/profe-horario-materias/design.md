## Context

La ruta del profe (`ingles.html?modo=profe`) se arma en el cliente con lo que devuelve `/ingles/profe/actividades`:
`plan` (tal cual `contenido/profe/plan.json`) e `items` (sus elementos y los del grupo con `grupo: true`). `meta()` del
servidor ya incluye `materia` y `nivel` de cada elemento.

## Decisiones

- **Sin cambios de servidor.** Toda la lógica es de presentación y vive en un módulo puro y testeable,
  `comun/profe-horario-datos.js` (patrón de `comun/gamificacion.js` y `comun/secundaria-datos.js`: script clásico que
  expone `globalThis.ProfeHorario`, importado por `server/profe_horario_test.ts`).
- **Materia:** `item.materia` → `elemento.materia` (plan) → respaldo por prefijo/nivel/título. Lo del grupo:
  `item.materia` → `plan.materiaDelGrupo` → respaldo. Una materia desconocida se muestra con su nombre y color neutro.
- **Fecha de cada tarea:** la del plan (`elemento.fecha`, ritmo sugerido); lo del grupo, su `fechaLimite` de profe.
- **Estados:** hecha = misma regla que la ruta RPG (`estaHecha`); adelantada = hecha con `ultimoEnvio` antes de su
  fecha; vencida = sin hacer y su fecha < hoy; pendiente = el resto. «hoy» es `act.hoy` del servidor.
- **Clases en vivo (meets):** `tipo: "meet"` o prefijo `meet-` (del elemento del plan o de su actividad). El profe
  las imparte, no las resuelve: estado `proxima` (fecha ≥ hoy) o `impartida` (fecha < hoy), nunca `vencida`, y fuera
  de todo conteo de tareas (`contables`). Se muestran con su `hora` y su `meetUrl` en lugar del botón «Abrir».
- **Días de oficina:** solo `plan.diasOficina` (fechas). Alternativa descartada: martes y jueves fijos, porque la regla
  cambió el 9 de noviembre a lunes y martes. Sin el campo, no hay sello ni «máx. 2».
- **Progreso:** hechas siempre calculadas; total y cierre del resumen `plan.materias` (`elementos`/`total`,
  `fin`/`cierre`), aceptando arreglo u objeto; el total es `max(resumen, tareas existentes)` para que la barra nunca
  pase de 100 %.
- **Filtro y semana:** el filtro se guarda en `localStorage` (`profe_materia`, en `try/catch`); la semana a la vista
  vive solo en memoria. Al cambiar se redibujan solo los dos paneles y se devuelve el foco al control tocado.
- **Diseño:** tokens `--ph-c`/`--ph-s`/`--ph-g` por materia en claro y oscuro (texto ≥ 4.5:1 sobre su fondo, la
  E2E lo mide), container queries para las columnas (el panel cambia de ancho con la barra lateral del admin),
  microanimaciones (entrada de tarjetas, hover) apagadas con `prefers-reduced-motion`.
- **Orden en la pestaña:** filtro → navegación → semana → reglas → progreso, para que en celular la semana no quede
  debajo de seis barras.

## Riesgos

- Lo del grupo de semanas pasadas que el profe no resolvió aparece como «vencida» (es su estado real).
- Si el resumen `plan.materias` cuenta lo del grupo distinto que el servidor, el total usa el mayor de los dos.
