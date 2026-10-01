## Why

El profe (nivel B1) pidió (2026-10-01) **su propia subpágina** para llegar a **C1 antes de que su grupo llegue
a B1**:
- un **examen directo de todo lo que su grupo ve esta semana**;
- **temas de estudio, ejercicios de práctica y 2 exámenes por semana**;
- el **primer mes bien estructurado**, como complemento de Busuu, y entrenar la mente.

## What Changes

- **Ruta del profe** con el mismo motor de actividades (teoría, banco de ejercicios, intentos con corrección,
  calificación por tema y retroalimentación), en un **ámbito propio** que el grupo nunca ve:
  - contenido en `contenido/profe/` del repo privado: `plan.json`, `semanas/`, `actividades/` y `examenes/`;
  - resultados en `resultados/<id>/profe.json`;
  - ruta `/ingles/profe/actividades[/<id>]`, **solo admin** (403 para el resto), que atiende al admin como
    el alumno "Profe" y guarda sus intentos.
- **Subpágina** `ingles.html?modo=profe` ("🎓 Mi ruta B1 → C1"), con enlaces desde la vista de admin de Inglés
  y desde el portal (solo admin). Muestra:
  - el plan del mes;
  - la semana actual con sus 4 elementos;
  - el tablero con todo lo hecho y los resultados por tema.
- **Contenido del mes 1** (B1+ → B2):
  - **Semana 0** (ya):
    - *Examen directo: lo que ve tu grupo esta semana*, con los 9 temas de la semana 1 a nivel de quien enseña;
    - *Diagnóstico B1 → B2*, el punto de partida;
  - **Semanas 1–4** (5 oct – 1 nov): lunes actividad A, miércoles examen A, jueves actividad B y sábado
    examen B. La semana 4 cierra con el **examen mensual**;
  - en `plan.json`: objetivo de cada semana, meta de Busuu, rutina diaria y calentamiento de Mente ágil.
- **Validador:** `validar_semana.ts --profe` (patrón lun/mié/jue/sáb, ámbito `contenido/profe`).
- **Altas:** el nombre "Profe" queda reservado, así que no se puede dar de alta un alumno con ese nombre.

## Capabilities

### Modified Capabilities
- `ingles`: ruta de estudio del profe.

## Impact

- **Código:**
  - `server/actividades.ts` (ámbito);
  - `server/semana.ts` y `server/validar_semana.ts` (ámbito profe);
  - `server/main.ts` (ruta) y `server/alumnos.ts` (nombre reservado);
  - `ingles.html` e `index.html`.
- **Repo de datos:** `contenido/profe/` y `herramientas/profe-mes-1/`.
- **Acciones externas:** redeploy al hacer merge, subir el contenido al repo de datos y verificar en producción.

## Matriz de acceso

- Solo el admin ve y resuelve la ruta del profe. Alumnos y alumnas reciben 403 y nunca la ven en su lista.
- La vista de admin del grupo no cambia.
