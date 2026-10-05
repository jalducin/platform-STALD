## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-clases-por-alumno`

## 1. Backend versionado

- [x] 1.1 Traer la v9 desplegada a `supabase/functions/tareas-estudio-secundaria/` como base del refactor (sin el correo admin; no se versionó la v9 literal)
- [x] 1.2 Leer `SUPER_ADMIN_EMAIL` desde env; si falta, nadie es admin
- [x] 1.3 Extraer `Fecha Entrega ` y `Nombre` → `fecha`, `alumno` en `InglesRow`
- [x] 1.4 Quitar `userIds`/`userEmails` de las respuestas de `/data` e `/ingles/data`
- [x] 1.5 Unificar la paginación (`queryDatabase`) y la resolución de usuarios; eliminar `HTML_PAGE`; 404 JSON en rutas desconocidas
- [x] 1.6 Configurar el secreto `SUPER_ADMIN_EMAIL` en el proyecto `xozsrcnjnugwbrrrwoeb`
- [x] 1.7 Desplegar la función desde el archivo del repo y anotar la versión

## 2. Frontend

- [x] 2.1 `ingles.html`: agrupar por `alumno` en la vista admin con el conteo completadas/total; lista única con pendientes primero para el alumno; mostrar `fecha` formateada
- [x] 2.2 `index.html`: versionar el login por correo, que ya coincide con el backend desplegado

## 3. Datos en Notion

- [x] 3.1 Respaldar los valores actuales de `Calificación`/`Observaciones` de Fernando en el scratchpad del agente (fuera del repo: son datos del alumno)
- [x] 3.2 Vaciar `Calificación` y `Observaciones` en las 51 filas de Fernando
- [x] 3.3 Duplicar en el servidor las 51 páginas de Fernando por cada alumno (`duplicate-page`, conserva contenido y subpáginas)
- [x] 3.4 Ajustar cada duplicado (título sin " (1)", `Nombre` = alumno, `Usuario` vacío) para Marisol, Angel, Laura y Jesus; contar después de cada lote
- [x] 3.5 Crear en "Vistas Alumnos" una vista por alumno (5), filtrada por `Nombre` y ordenada con pendientes primero

- [x] 3.6 Crear la vista "Mis clases" (`Usuario` = me) como pestaña de la base y como vista enlazada en "Vistas Alumnos"; verificar que el filtro quedó guardado como "me"

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Revisar pruebas existentes: no hay suite; agregar `supabase/functions/tareas-estudio-secundaria/index_test.ts` con `deno test` para la extracción de filas y el filtrado por correo (si Deno está disponible)
- [x] 4.2 Estado antes/después en Notion: conteos por `Nombre` (esperado 51 × 5 = 255), 0 filas con `Calificación`/`Observaciones`, conjuntos de `Name` iguales
- [x] 4.3 Crear el reporte `openspec/changes/ingles-clases-por-alumno/reports/2026-09-25-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 curl: `/ingles/data` sin email → 400; correo inexistente → `rows: []`; admin → 255 filas, `alumno` y `fecha` presentes, sin `userEmails`
- [x] 5.2 curl: `/data` admin → 200 sin `userEmails`; raíz → 404
- [x] 5.3 Servir `ingles.html` e `index.html` localmente y recorrer los estados: login, correo sin filas, admin agrupado
- [x] 5.4 Tras el merge a `main`, verificar las URLs publicadas en GitHub Pages

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md`: propiedades reales de "📖 Clases Inglés" (`Fecha Entrega `, `Nombre`, etc.) y el modelo de una fila por alumno
- [x] 6.2 `docs/backend-standards.md`: la función ya está versionada; variable `SUPER_ADMIN_EMAIL`; contrato actualizado
- [x] 6.3 Actualizar en Notion los links viejos (`/tareas-estudio-secundaria/`) → `/platform-STALD/`
- [x] 6.4 Commit, push y merge a `main`
