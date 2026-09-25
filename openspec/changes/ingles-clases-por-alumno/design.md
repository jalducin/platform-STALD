## Context

- "📖 Clases Inglés" (data source `9581c6b4-f8b5-8283-bf7e-878652c0d17e`) tiene 51 filas, todas con
  `Nombre` = Fernando y el mismo guest en `Usuario`. Las páginas tienen contenido rico (tablas, notas).
- El select `Nombre` ya incluye Fernando, Marisol, Angel, Laura y Jesus.
- Los guests no aparecen en `notion-get-users` del MCP, así que el agente no puede resolver sus IDs para `Usuario`.
- La Edge Function v9 solo existe en Supabase. Lee `Fecha de Entrega`, que no existe, y tiene el correo admin fijo en el código.

## Goals / Non-Goals

**Goals:**
- 255 filas (5 × 51) con progreso en blanco, y una vista por alumno.
- Backend versionado, sin correos en la respuesta ni en el repo, con la fecha correcta.
- `ingles.html` útil para el admin (agrupado por alumno) y para cada alumno.

**Non-Goals:**
- Resolver la autenticación débil (correo sin verificar). Se mantiene el riesgo documentado.
- Modelo catálogo + progreso con relaciones. Ver Decisión 1.
- Cambios de datos en la base de Secundaria.

## Decisions

1. **Duplicar filas en vez de catálogo + relación.** Lo pidió el usuario y encaja con el filtro actual
   por `Usuario`. Alternativa: base "Clases" + base "Progreso" con relación. Es más normalizada, pero
   obliga a reescribir backend, vistas y la forma de capturar datos en Notion. Trade-off: editar una clase
   implica editar 5 filas.
2. **Copia de página completa.** Lo decidió el usuario. Mecánica aplicada: `notion-duplicate-page` sobre
   cada una de las 51 páginas de Fernando, 4 veces, y después `update-page` para quitar el sufijo " (1)"
   del título y fijar `Nombre` y `Usuario` vacío. Se descartó recrear las páginas con `create-pages`
   leyendo su contenido: el duplicado del servidor conserva las subpáginas y los bloques no soportados
   por el markdown, y evita reescribir el contenido 204 veces. El contenido se copia tal cual, incluidas
   las notas de práctica escritas para Fernando.
3. **`Calificación` y `Observaciones` vacías en todas las filas.** El usuario confirmó que los valores de
   Fernando venían clonados y no son su avance real.
4. **Vistas en "Vistas Alumnos" filtradas por `Nombre`, no por `Usuario`.** Funcionan ya, sin esperar a los guests.
5. **`SUPER_ADMIN_EMAIL` como secreto de Supabase** (`supabase secrets set`). El repo es público.
6. **`alumno` en la respuesta** para agrupar en el cliente. Viene del select `Nombre`, no de datos de usuario.
7. **Refactor mínimo**: `queryAllNotion` usa `queryDatabase`, y un solo helper `attachUsers` resuelve
   nombres. Se elimina `HTML_PAGE`.

## Risks / Trade-offs

- [Creación masiva a medias en Notion] → crear por alumno (4 lotes de 51) y contar después de cada lote.
  Para deshacer, archivar las filas con `Nombre` ≠ Fernando y `createdTime` posterior al inicio.
- [La copia en markdown pierde bloques no soportados] → comparar la página original y la copia de una
  muestra de 3 clases. Si se detecta pérdida, usar `duplicate-page` para esas clases.
- [Vaciar la calificación de Fernando es destructivo] → antes de vaciar, exportar los valores actuales al
  reporte local de verificación, que no se versiona porque contiene notas del alumno.
- [Las vistas de Notion no son control de acceso] → un guest con acceso a "Vistas Alumnos" puede quitar
  el filtro. Se documenta: compartir con cada alumno solo sus filas o el dashboard.
- [Secreto no configurado al desplegar] → configurar el secreto antes de desplegar. Si falta, la función
  trata a todos como no admin (no abre acceso).

## Migration Plan

1. Secreto → 2. desplegar la función desde el repo → 3. verificar con curl → 4. datos de Notion →
5. vistas → 6. merge a `main` (Pages) → 7. verificar las páginas publicadas.
Rollback de la función: redesplegar el commit anterior del repo. La v9, anterior al repo, no se versionó porque traía el correo admin fijo en el código; su comportamiento equivale al del commit `1eda2f1`, salvo el filtrado de correos y la fecha.

## Open Questions

- ¿Qué correo corresponde a cada alumno? Lo resuelve el usuario al invitar guests en Notion; no se guarda en el repo.
