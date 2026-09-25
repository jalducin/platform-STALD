## Why

Las 255 clases de Inglés no tienen fecha de entrega, así que el dashboard no puede decir qué va atrasado ni
qué toca hoy. La vista web tampoco muestra la calificación ni separa lo recién realizado de lo pendiente.

## What Changes

- **Datos (Notion)**: asignar `Fecha Entrega ` a cada actividad, una por día desde el 2026-09-26, ordenadas
  por `Dificultad` (A1 → A2 → B1), luego por módulo y número de lección. El mismo calendario para los 5
  alumnos. "📋 REGLA — Dónde anotar cada tipo de clase" queda sin fecha porque no es una actividad.
- **Backend**: `/ingles/data` agrega `calificacion`, `dificultad` y `editadoEn` (última edición de la
  página; se usa como fecha de realización).
- **Frontend (`ingles.html`)**: secciones en este orden:
  1. ✅ Realizadas en los últimos 3 días.
  2. ⏰ Atrasadas.
  3. 📌 Hoy.
  4. 📅 Próximas.
  5. Realizadas anteriores y sin fecha, plegadas.

  Cada fila muestra la fecha de entrega y la calificación. Las listas largas usan scroll interno y hay
  contadores arriba. En la vista admin el mismo esquema se aplica dentro de cada alumno.

## Capabilities

### New Capabilities
- `calendario-entregas-ingles`: regla para calcular las fechas de entrega de Inglés.

### Modified Capabilities
- `dashboard-ingles`: forma de la fila (campos nuevos) y organización de la vista por estado.
  Aún no está en `openspec/specs/` porque el cambio `ingles-clases-por-alumno` no se ha archivado; aquí
  se agregan requisitos nuevos.

## Impact

- Superficies: base "📖 Clases Inglés" (250 filas actualizadas), Edge Function, `ingles.html`.
- Contrato HTTP de `/ingles/data`: solo agrega campos, así que es compatible.
- Acciones externas del agente: actualizar fechas en Notion, desplegar la función, publicar en Pages
  (merge a `main`, con autorización del usuario).
