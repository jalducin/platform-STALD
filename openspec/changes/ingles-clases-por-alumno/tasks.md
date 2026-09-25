## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/ingles-clases-por-alumno`

## 1. Backend versionado

- [ ] 1.1 Guardar la v9 desplegada tal cual en `supabase/functions/tareas-estudio-secundaria/index.ts`, sin el correo admin (sustituido por la lectura de env), y hacer commit como línea base
- [ ] 1.2 Leer `SUPER_ADMIN_EMAIL` desde env; si falta, nadie es admin
- [ ] 1.3 Extraer `Fecha Entrega ` y `Nombre` → `fecha`, `alumno` en `InglesRow`
- [ ] 1.4 Quitar `userIds`/`userEmails` de las respuestas de `/data` e `/ingles/data`
- [ ] 1.5 Unificar la paginación (`queryDatabase`) y la resolución de usuarios; eliminar `HTML_PAGE`; 404 JSON en rutas desconocidas
- [ ] 1.6 Configurar el secreto `SUPER_ADMIN_EMAIL` en el proyecto `xozsrcnjnugwbrrrwoeb`
- [ ] 1.7 Desplegar la función desde el archivo del repo y anotar la versión

## 2. Frontend

- [ ] 2.1 `ingles.html`: agrupar por `alumno` en la vista admin con el conteo completadas/total; lista única con pendientes primero para el alumno; mostrar `fecha` formateada
- [ ] 2.2 `index.html`: versionar el login por correo, que ya coincide con el backend desplegado

## 3. Datos en Notion

- [ ] 3.1 Respaldar los valores actuales de `Calificación`/`Observaciones` de Fernando en el scratchpad del agente (fuera del repo: son datos del alumno)
- [ ] 3.2 Vaciar `Calificación` y `Observaciones` en las 51 filas de Fernando
- [ ] 3.3 Leer el contenido de las 51 páginas de Fernando
- [ ] 3.4 Crear 51 filas por alumno (Marisol, Angel, Laura, Jesus) con contenido y propiedades; `Usuario` vacío; contar después de cada lote
- [ ] 3.5 Crear en "Vistas Alumnos" una vista por alumno (5), filtrada por `Nombre` y ordenada con pendientes primero

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 Revisar pruebas existentes: no hay suite; agregar `supabase/functions/tareas-estudio-secundaria/index_test.ts` con `deno test` para la extracción de filas y el filtrado por correo (si Deno está disponible)
- [ ] 4.2 Estado antes/después en Notion: conteos por `Nombre` (esperado 51 × 5 = 255), 0 filas con `Calificación`/`Observaciones`, conjuntos de `Name` iguales
- [ ] 4.3 Crear el reporte `openspec/changes/ingles-clases-por-alumno/reports/2026-09-25-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 curl: `/ingles/data` sin email → 400; correo inexistente → `rows: []`; admin → 255 filas, `alumno` y `fecha` presentes, sin `userEmails`
- [ ] 5.2 curl: `/data` admin → 200 sin `userEmails`; raíz → 404
- [ ] 5.3 Servir `ingles.html` e `index.html` localmente y recorrer los estados: login, correo sin filas, admin agrupado
- [ ] 5.4 Tras el merge a `main`, verificar las URLs publicadas en GitHub Pages

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/data-model.md`: propiedades reales de "📖 Clases Inglés" (`Fecha Entrega `, `Nombre`, etc.) y el modelo de una fila por alumno
- [ ] 6.2 `docs/backend-standards.md`: la función ya está versionada; variable `SUPER_ADMIN_EMAIL`; contrato actualizado
- [ ] 6.3 Actualizar en Notion los links viejos (`/tareas-estudio-secundaria/`) → `/platform-STALD/`
- [ ] 6.4 Commit, push y merge a `main`
