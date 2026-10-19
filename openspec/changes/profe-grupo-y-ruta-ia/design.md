## Contexto

`listarActividades` (`server/actividades.ts`) arma la lista del profe con su ámbito (`AMBITO_PROFE`) más lo del grupo
(`itemsDelGrupo` + `paraProfe`). La semana sale de `visibleItems(store, hoy, ámbito)`; desde
`profe-semanas-del-grupo` cae a la del grupo solo si el ámbito del profe no tiene semanas. `ingles/profe.js` pinta
«Esta semana» con `renderWeekCard(act)` (`ingles/comun.js`), que filtra `act.items` por `act.semana.ids` y agrega
«⏩ Adelanta» (`semanaSiguiente`) y «📌 Para ponerte al día».

## Decisiones

1. **Dos pares de semanas, sin anidar.** `semana`/`semanaSiguiente` = grupo (siempre, en la ruta del profe);
   `semanaPropia`/`semanaSiguientePropia` = ruta propia, solo si existen. Se eligen campos hermanos (no un objeto
   nuevo) para no tocar `renderWeekCard` ni los demás consumidores de `semana`; sin ruta propia la respuesta queda
   igual que hoy.
2. **La vista reutiliza `renderWeekCard` dos veces.** Se le pasa un `act` acotado: el del grupo con solo los
   elementos `grupo: true`, y el propio con `semana = semanaPropia` y solo los elementos sin `grupo`. Así «Para
   ponerte al día» no mezcla ambos. `renderWeekCard` recibe un prefijo opcional para los ids (`adelanta`, `al-dia`)
   y no duplicar ids en la página.
3. **Títulos desde el plan.** `plan.titulo` da nombre a la página (`#titulo`, `document.title`) y al bloque propio;
   sin plan se usa el genérico. Los campos del plan de Inglés (`busuu`, `extra`, `nivelActual`, `meta`,
   `horasSemana`, `reparto`, `rutinaDiaria`, `reglas`, `subtitulo`, `horizonte`) pasan a ser opcionales en la vista.
4. **Plan del mes:** la semana abierta es `semanaPropia` (si no, `semana`), porque el plan describe la ruta propia.
5. **Relación con `profe-semanas-del-grupo` (sin archivar):** este delta reescribe completos los requisitos «Ruta de
   estudio del profe» y «Vista del profe ordenada por urgencia» (MODIFIED con el texto final). Archivar
   `profe-semanas-del-grupo` antes que este; el resultado final es el de este cambio.

## Riesgos

- Las E2E dependen de los datos: se vuelven adaptativas (con o sin `plan`) y se corren con una copia con ruta propia
  de prueba y otra sin ella.
