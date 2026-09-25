## Context

"📖 Clases Inglés" tiene 255 filas (51 por alumno), sin fechas ni calificaciones. No existe un campo de
"fecha de realización"; Secundaria ya usa la última edición como sustituto.

## Goals / Non-Goals

**Goals:** calendario de entregas reproducible; dashboard que priorice lo reciente y lo atrasado; mostrar
fecha y calificación.

**Non-Goals:** automatización de Notion para registrar la fecha real de realización; cambios en `index.html`.

## Decisions

1. **Calendario calculado por script** (`calendario.py` en el scratchpad del agente; la regla queda en el
   spec). Orden: dificultad → índice de la opción de `Módulo` → texto → números del título. Es
   determinista y el mismo para todos los alumnos.
2. **"📋 REGLA" sin fecha**: es una nota, no una actividad. Así quedan 50 entregas (26 sep – 14 nov).
3. **`editadoEn` = `last_edited_time` de la página** como fecha de realización. Alternativa: una propiedad
   "Fecha realizada" llenada por automatización. Es más precisa, pero requiere configurar Notion y no la
   pidieron. Trade-off: editar una fila completada después (p. ej. poner la calificación) mueve su fecha
   de realización.
4. **Clasificación en el cliente** con fechas locales `AAAA-MM-DD`, igual que `index.html`. El servidor
   solo entrega datos.
5. **Scroll interno** por sección (`max-height` + `overflow-y: auto`, encabezados sticky) en lugar de una
   página muy larga. Las secciones de baja prioridad van plegadas con `<details>`.

## Risks / Trade-offs

- [250 actualizaciones en Notion; una puede fallar] → verificar con la API en vivo: 50 fechas distintas por
  alumno y conjuntos (título, fecha) iguales entre alumnos.
- [Zona horaria de `editadoEn`] → se convierte a fecha local en el navegador.

## Migration Plan

Fechas en Notion → función desplegada (solo agrega campos) → `ingles.html` → merge a `main` → verificar en
Pages. Rollback: redesplegar el commit anterior. Las fechas se pueden borrar con el mismo proceso.
