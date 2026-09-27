## Context

- El frontend es estático (GitHub Pages) y no puede escribir archivos. El backend es una Edge Function de
  Supabase con acceso a `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
- El usuario no quiere usar una base de datos para los exámenes y pidió JSON.
- La identidad sigue siendo "el correo que escribes": es el mismo riesgo documentado en `backend-standards.md`.

## Goals / Non-Goals

**Goals:** aplicar el diagnóstico A1 el 27 de septiembre; resultados visibles para el alumno y el admin; un
motor reutilizable para los exámenes de cada nivel.

**Non-Goals:** preguntas abiertas o de audio, reintentos del alumno, escribir resultados en Notion,
autenticación fuerte.

## Decisions

1. **Definición en el repo, dentro del bundle de la función**
   (`supabase/functions/tareas-estudio-secundaria/examenes/diagnostico-a1.json`). Queda versionada en SDD y
   la página no la descarga, así que las respuestas no llegan al navegador.
   - Alternativa descartada: el JSON público en Pages, porque las respuestas se verían en devtools.
   - Riesgo aceptado: el repo es público y alguien que lo busque en GitHub puede ver las respuestas. Para un
     diagnóstico es aceptable.
2. **Resultados en Supabase Storage** (bucket privado `examenes`, `resultados/<id>/<slug-alumno>.json`).
   Son archivos JSON, sin tablas.
   - Alternativa: una base de Notion "Resultados". Descartada por ahora: requiere un token con permiso de
     escritura y el usuario pidió JSON.
   - La función crea el bucket si no existe.
3. **Motor puro** (`examenes.ts`): `publicQuestions`, `gradeExam`, `examStatus`, `mxToday`. Se prueba con
   `deno test` sin red.
4. **Alumno = `Nombre` de sus filas.** Se identifica por el correo, igual que el tablero. El nombre de
   archivo es el slug del alumno (sin acentos, en minúsculas) y no lleva correo.
5. **Admin**: vista previa y envío sin guardar (`guardado: false`). Puede reiniciar un intento con DELETE
   (por ejemplo, si un alumno tuvo un problema técnico).
6. **Fecha en hora de CDMX** (`America/Mexico_City`) calculada en el servidor, para que el cambio de día no
   dependa del navegador.
7. **CORS**: se agregan `POST`, `DELETE` y `Access-Control-Allow-Headers: content-type`.

## Risks / Trade-offs

- [Suplantación por correo: alguien resuelve por otro] → un intento por alumno; el admin puede reiniciarlo.
- [Dos envíos simultáneos] → se escribe con `upsert: false`; el segundo recibe un conflicto y responde 409.
- [Respuestas visibles en el repo público] → aceptado para un diagnóstico; los exámenes de cierre pueden
  mover la clave a un secreto o a Storage.

## Migration Plan

Desplegar la función (v13), verificar con curl (404/403/409 y vista previa del admin), publicar
`ingles.html` (merge a `main`) antes del domingo 27. Rollback: redesplegar el commit anterior; los
resultados en Storage no se tocan.
