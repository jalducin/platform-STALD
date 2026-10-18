## Why

El profe pidió (2026-10-17): «que revise las actividades del profesor camino a C1, dejar las mismas de los alumnos»,
y confirmó: «las de C1 bórralas». Ninguna de las 23 tareas de la ruta B1 → C1 tenía intentos suyos; lo que sí resolvió
fueron las actividades del grupo. Desde ahora resuelve **las mismas actividades que sus alumnos y alumnas**.

Al borrar `contenido/profe/` (repo de datos), la vista del profe seguía listando lo del grupo, pero quedaba sin
«Esta semana» (la semana salía de sus propias semanas) y con textos de la ruta C1 («Mi ruta B1 → C1», «Plan del mes»).

## What Changes

- **Datos (repo privado):** se elimina `contenido/profe/` (plan, semanas, actividades, exámenes y pronunciación) y
  `herramientas/profe-mes-1/`. Se conservan los resultados del profe (`resultados/<id>/profe.json`).
- **Servidor:** si el profe no tiene semanas propias, `semana` y `semanaSiguiente` de `/ingles/profe/actividades`
  son las del grupo. Si un día vuelve a tener ruta propia, manda la suya (sin cambio de contrato).
- **Frontend:** `ingles.html?modo=profe` y el portal dicen «Mi ruta de Inglés»; sin `plan` no se muestran la
  pestaña «Plan del mes» ni la barra «Ruta del mes».
- **Pruebas E2E:** `e2e-ruta-profe` y `e2e-profe-diseno` prueban la vista sin ruta propia; `e2e-pronunciacion` se
  omite si los datos no tienen actividad de pronunciación (`correr.sh` reconoce el estado OMIT).

## Capabilities

### Modified Capabilities
- `ingles`: ruta del profe sin ruta propia → semanas del grupo; vista sin plan.

## Impact

- Superficies: servidor Deno (`server/actividades.ts`), `ingles.html` (`ingles/comun.js`, `ingles/profe.js`),
  `index.html` (portal), repo de datos.
- Matriz de acceso: sin cambios. Solo el admin abre `/ingles/profe/actividades`; sus intentos siguen fuera de las
  vistas del grupo; alumnos y alumnas no ven nada del profe.
- Acciones externas: redeploy automático al hacer merge (agente); verificación en producción solo lectura (agente).

## Cómo revertir

- Ruta C1: `git revert <commit «profe: elimina la ruta B1 → C1»>` en el repo de datos (vuelven plan, semanas y
  generador). El servidor vuelve a usar las semanas propias sin tocar código.
- Código: revertir el PR de este cambio.
