## Why

Las actividades son para aprender. Hoy el 2.º intento trae ejercicios nuevos, así que el alumno o alumna
empieza de cero y no se detiene en lo que falló. El usuario pidió (2026-09-30) que en el 2.º intento las
respuestas correctas del 1.º ya vengan llenas y solo se corrijan las que falló, para impulsarlos. El
examen sigue con una sola oportunidad.

## What Changes

- **Intento de corrección** para actividad, refuerzo y reto del Meet:
  - El intento 2 trae **los mismos ejercicios** del intento 1.
  - Las correctas quedan **fijas**: se muestran llenas y de solo lectura, y el servidor las conserva
    aunque el navegador mande otra cosa.
  - Solo se contestan las que se fallaron, y se ve la respuesta anterior de cada una.
  - La calificación es sobre el mismo total. Como las correctas se conservan, el 2.º intento nunca baja.
- **Sin nada que corregir**: si el último intento tuvo 100 %, el elemento queda `completo`.
- **Examen**: sin cambios (1 intento). Si un examen tuviera más intentos, seguirían siendo ejercicios nuevos.
- Reemplaza, solo para actividades, la regla "ejercicios distintos en cada intento" de
  `tareas-online-semanales`. Por alumno o alumna siguen siendo distintos.
- El aviso del validador por banco corto se redacta como "poca variedad entre alumnos y alumnas", porque
  el 2.º intento ya no consume ejercicios nuevos.

## Capabilities

### Modified Capabilities
- `actividades-online`: intento de corrección en actividades; completo al 100 %.
- `dashboard-ingles`: vista de corrección (errores primero con la respuesta anterior; correctas fijas).

## Impact

- **Superficies**:
  - `server/motor.ts` y `server/actividades.ts`.
  - `server/semana.ts`: solo el texto del aviso.
  - `ingles.html`.
- Datos: sin migración. Los resultados guardan en `intentos[].preguntas` los ids del intento 1, y con eso
  se arma la corrección. A hoy nadie tiene 2 intentos, así que no hay intentos 2 "viejos".
- **Acciones externas**: redeploy automático de Deno Deploy y de GitHub Pages al hacer merge (el agente
  verifica).

## Matriz de acceso

- **Alumno o alumna:** en la corrección solo recibe sus propias respuestas anteriores. Las respuestas
  correctas de los ejercicios que falló no se envían antes de que conteste.
- **Admin:** con `?alumno=X&intento=2` ve la corrección de ese alumno o alumna en vista previa, sin guardar.
