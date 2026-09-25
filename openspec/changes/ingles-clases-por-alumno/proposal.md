## Why

La base "📖 Clases Inglés" solo tiene las 51 clases de Fernando, clonadas de otro lado con calificaciones
que no reflejan su avance real. Los otros 4 alumnos (Marisol, Angel, Laura, Jesus) no tienen clases, no
existe una vista por alumno en Notion y el dashboard `ingles.html` no puede mostrarles nada. Además la
función lee `Fecha de Entrega`, pero la propiedad real se llama `Fecha Entrega ` (con espacio final), así
que la fecha siempre sale vacía.

## What Changes

- **Datos (Notion)**: replicar las 51 clases (página completa) para Marisol, Angel, Laura y Jesus
  (204 filas nuevas), con `Nombre` = alumno, `Completado` = No, `Usuario` vacío y `Calificación` y
  `Observaciones` vacías.
- **Datos (Notion)**: dejar vacías `Calificación` y `Observaciones` en las 51 filas de Fernando.
- **Notion**: crear en la página "Vistas Alumnos" una vista filtrada por `Nombre` para cada uno de los 5 alumnos.
- **Backend**: versionar la Edge Function en el repo. Leer `Fecha Entrega `. Exponer `alumno` (campo
  `Nombre`). Dejar de devolver `userEmails` (privacidad). Mover el correo admin a la variable de entorno
  `SUPER_ADMIN_EMAIL`. Unificar la paginación duplicada y quitar el `HTML_PAGE` obsoleto.
  **BREAKING**: la raíz de la función ya no sirve HTML y responde 404.
- **Frontend**: `ingles.html` agrupa por alumno en vista admin y muestra la fecha de entrega. Se versiona
  el login de `index.html`, que ya estaba en la copia local y coincide con el backend desplegado.
- **Publicación**: merge a `main` para que GitHub Pages sirva las páginas corregidas.

## Capabilities

### New Capabilities
- `dashboard-ingles`: qué ve cada alumno y qué ve el admin en `ingles.html`, y qué devuelve `/ingles/data`.
- `clases-ingles-por-alumno`: estructura de datos en Notion (una fila por clase y alumno) y vistas por alumno.

### Modified Capabilities
<!-- No hay specs previos en openspec/specs/ -->

## Impact

- Superficies: `ingles.html`, `index.html`, Edge Function `tareas-estudio-secundaria`, base "📖 Clases
  Inglés", página "Vistas Alumnos".
- Contrato HTTP de `/ingles/data`: se agrega `alumno` y se elimina `userEmails`. `/data` también deja de
  devolver `userEmails`, y el frontend no lo usa.
- Acciones externas:
  - **Agente**: crear filas y vistas en Notion, configurar el secreto `SUPER_ADMIN_EMAIL`, desplegar la
    función, hacer merge a `main` y actualizar los links viejos de las páginas de Notion documentadas.
  - **Usuario**: invitar a cada alumno como guest y asignar `Usuario` en sus filas. Sin esto, el alumno
    no ve nada en el dashboard; el admin sí.
