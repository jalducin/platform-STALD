## Why

El profe pidió que la clase del domingo en Inglés sea solo la clase: el Meet y el material del profe. El reto
en vivo era una actividad de repaso más para alumnos y alumnas, encima de las actividades, el examen, el
refuerzo y las tres de Tecnología e IA de la semana.

## What Changes

- Los Meet del domingo ya no traen reto: sin banco, temas ni intentos, y sin la diapositiva «⚡ Reto en vivo».
- Alumnos y alumnas tienen, como actividad del domingo, el **material para leer**: «📖 Material» abre la teoría y
  los tips de la clase, sin preguntas, junto al enlace del Meet.
- El profe conserva su material: «🎬 Presentar» y «📋 Guion» dependen de que el Meet tenga presentación o guion
  (`tieneMaterial`), ya no del reto. «👁 Reto» y «Probar el reto» solo aparecen si hay reto.
- `GET /ingles/actividades/<id>` de un Meet sin reto responde con el material (`material: true`): al profe, con
  guion y presentación; a alumnos y alumnas, desde su fecha, solo teoría y tips.
- Datos: se quita el reto de `meet-2026-10-04` y `meet-2026-10-11`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `actividades-online`: la clase del domingo deja de tener reto en vivo.
- `dashboard-ingles`: el guion y la presentación del profe no dependen del reto.

## Impact

- `server/actividades.ts` (`meta` con `tieneMaterial`; GET del material sin reto).
- `ingles/comun.js`, `ingles/tablero.js` e `ingles/presentacion.js` (botones del profe).
- Repo de datos: `contenido/actividades/meet-*.json`.
- Los resultados del reto del 4 de octubre dejan de mostrarse y de contar, porque el Meet ya no tiene reto.
