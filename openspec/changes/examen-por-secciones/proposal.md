## Por qué
El profe quiere que el examen mensual de Secundaria tenga 100 reactivos y que aparezca **separado por secciones
(materias)**. Hoy el motor mezcla las preguntas de todos los temas.

## Qué cambia
- Campo opcional `porSecciones: true` en un elemento:
  - las preguntas salen agrupadas por tema, en el orden de `temas`;
  - dentro de cada sección van barajadas por intento;
  - el reproductor ya pone un encabezado al cambiar de tema y, en celular, la etiqueta de materia en cada pregunta.
- Contenido privado: el examen de septiembre pasa a 100 reactivos con `porSecciones`.

## Impacto
- `server/motor.ts` (`selectQuestions`) y `server/secundaria_test.ts`.
- Spec `examenes-secundaria`: requisito nuevo.
