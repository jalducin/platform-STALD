## Why

Para preparar las clases hace falta saber en qué nivel real está cada alumno. Hoy el dashboard solo refleja
tareas de Notion. No hay forma de aplicar un examen ni de ver sus resultados, y en la vista admin tampoco se
ve cómo le fue a cada alumno en su última actividad.

## What Changes

- **Examen diagnóstico A1** (`diagnostico-a1`): 33 preguntas de opción múltiple, disponible desde el
  **domingo 2026-09-27** (hora de CDMX) y con un solo intento por alumno. Secciones:
  1. Alfabeto y sonidos: 26 letras, letra vs. sonido y letras que confunden (H J R W Y TH).
  2. Verbo *to be*.
  3. Presente simple.
  4. Verbos comunes.
  5. Días de la semana.
  6. Orden de la oración (S + V + C).
- **Almacenamiento sin base de datos**:
  - La definición del examen (preguntas y respuestas) es un JSON versionado dentro de la Edge Function.
  - Los resultados son archivos JSON en un bucket privado de Supabase Storage (`examenes`), uno por alumno y examen.
- **Backend**: nuevas rutas bajo `/ingles/examenes` para listar, obtener preguntas sin respuestas,
  enviar respuestas (se califican en el servidor) y reiniciar un intento (solo admin).
- **Frontend (`ingles.html`)**:
  - El alumno ve la tarjeta "📝 Exámenes" en su perfil: pendiente, disponible o resuelto con su resultado.
  - Resuelve el examen en la misma página.
  - El admin ve, por alumno, la calificación de la **última actividad hecha** y el **resultado del
    diagnóstico** por sección, y puede previsualizar el examen.

## Capabilities

### New Capabilities
- `examenes-ingles`: definición, disponibilidad, calificación, almacenamiento y consulta de exámenes.

### Modified Capabilities
- `dashboard-ingles`: se agregan la tarjeta de exámenes del alumno y, en la vista admin, la última
  calificación y el resultado del diagnóstico. Hasta que se archiven los cambios previos, esto va como
  requisitos agregados.

## Impact

- Edge Function `tareas-estudio-secundaria`: rutas nuevas y dependencia `@supabase/supabase-js`, que usa
  `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, ya provistas por Supabase.
- Supabase Storage del proyecto `xozsrcnjnugwbrrrwoeb`: bucket privado `examenes`, creado por la función
  si no existe.
- `ingles.html`.
- Sin cambios en Notion.

## Ruta de exámenes (para no perderla)

1. **Diagnóstico A1** (este cambio). Con su resultado, el admin prepara las clases.
2. Exámenes por nivel: A1 de cierre, A2 (diagnóstico y cierre) y B1, cada uno como un JSON nuevo en
   `examenes/` con su propio cambio OpenSpec. Se reutiliza el mismo motor de calificación.
3. Pendiente de decidir: preguntas abiertas o de audio (requieren revisión manual) y reintentos.
