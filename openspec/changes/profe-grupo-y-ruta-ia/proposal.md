## Why

El profe pidió (2026-10-18): «arma clases para 4 semanas para mí en donde pusiste mis clases de inglés que hago las
mismas que los alumnos y más». En el repo de datos se arma (en paralelo) una ruta propia de 4 semanas de IA/Claude
Code en `contenido/profe/` (lunes 2026-10-19, 2026-10-26, 2026-11-02 y 2026-11-09, con `plan.json`).

Hoy, si el profe tiene semanas propias, `semana`/`semanaSiguiente` de `/ingles/profe/actividades` son las suyas y
«Esta semana» deja de mostrar las actividades del grupo (cambio `profe-semanas-del-grupo`: «con ruta propia, manda la
suya»). Además, la vista dice «Mi ruta de Inglés» aunque el plan sea de IA.

## What Changes

- **Servidor:** en `/ingles/profe/actividades`, `semana` y `semanaSiguiente` son **siempre las del grupo**; si el
  profe tiene ruta propia, la respuesta agrega `semanaPropia` y `semanaSiguientePropia` (misma forma
  `{ id, titulo, ids }`). Sin ruta propia la respuesta es idéntica a la de hoy.
- **Frontend (`ingles.html?modo=profe`):** «Esta semana» muestra dos bloques que no se ocultan entre sí:
  «👥 Inglés con el grupo» y «🎓 Mis clases · <título del plan>». El título de la página usa `plan.titulo` si
  existe (si no, el genérico «Mi ruta de Inglés»). La etiqueta de los elementos propios pasa de «🎓 Ruta» a
  «🎓 Mis clases». El Plan del mes tolera planes sin Busuu ni niveles (campos opcionales).
- **Portal (`index.html`):** la tarjeta del profe dice «Mi ruta» (sin «de Inglés»).
- **Pruebas:** `server/profe_test.ts` con semanas del grupo + semanas propias; E2E `e2e-ruta-profe` y
  `e2e-profe-diseno` cubren la vista con y sin ruta propia.

## Capabilities

### Modified Capabilities
- `ingles`: ruta del profe con las semanas del grupo y, aparte, las de su ruta propia; vista con los dos bloques.

## Impact

- Superficies: servidor Deno (`server/actividades.ts`), `ingles.html` (`ingles/comun.js`, `ingles/profe.js`),
  `index.html` (portal). El contenido de la ruta de IA (repo de datos) lo carga otro paso; este cambio es solo código.
- Contrato HTTP: aditivo (`semanaPropia`, `semanaSiguientePropia`); cambia el significado de `semana` en la ruta del
  profe con ruta propia (antes la propia, ahora la del grupo). Única consumidora: `ingles/profe.js`.
- Matriz de acceso: sin cambios. Solo el admin abre `/ingles/profe/*`; alumnos y alumnas reciben 403 y nunca ven
  elementos del profe (ni en su lista ni por id); los resultados del profe (`profe.json`) siguen fuera de las vistas
  del grupo.
- Acciones externas: redeploy automático al hacer merge (agente); verificación en producción solo lectura (agente).

## Cómo revertir

Revertir el PR de este cambio: la ruta del profe vuelve a mandar su semana propia en `semana`.
