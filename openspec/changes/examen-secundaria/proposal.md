## Por qué
El profe quiere aplicar en la plataforma el **examen mensual de Secundaria** de una alumna. El examen cubre sus
materias de septiembre y suma el verbo to be y lo visto en Inglés. Tiene dos oportunidades y se queda la mejor
calificación. Hoy Secundaria solo muestra las tareas de Notion; no tiene exámenes.

## Qué cambia
- Ámbito nuevo `contenido/secundaria/` en el motor de actividades, igual que la ruta del profe.
- Ruta `/secundaria/actividades[/<id>]`:
  - la identidad sale de las filas de Secundaria: el primer nombre de la persona;
  - el admin ve los resultados.
- Campo opcional `alumnos` (slugs) en un elemento: solo esas personas lo ven y lo abren. Sirve para un examen
  exclusivo.
- Página `ingles.html?modo=secundaria` con la lista de exámenes, el reproductor y el resultado. Para el admin,
  resultados por persona y por materia.
- Enlace «📝 Exámenes» en `secundaria.html`.
- Contenido (privado): examen mensual de septiembre con 2 intentos y la mejor calificación. Las preguntas
  abiertas se convierten a opción múltiple o a respuesta corta exacta, porque se califican solas.

## Impacto
- Servidor: `server/motor.ts` (`alumnos`), `server/actividades.ts` (ámbito, filtro y `handleSecundaria`) y
  `server/main.ts` (ruta).
- Frontend: `ingles/comun.js`, `ingles/app.js`, `ingles/secundaria.js` (nuevo), `ingles.html` y `secundaria.html`.
- Datos: solo en el repo privado. El repo público no lleva nombres.
