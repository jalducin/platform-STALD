## Why

El usuario vio (2026-09-30) que los alumnos y alumnas ya resolvieron ejercicios, pero no aparecen como
completados. Hay dos causas:

1. **Tareas de Notion** (p. ej. "A1 Test #3"): solo se completan palomeando "Completado" dentro de Notion.
   Hace falta permiso de edición, y la página no ofrece forma de hacerlo.
2. **Actividades en línea:** solo cuentan como hechas con los 2 intentos o con 100 %. El 2.º intento es
   una corrección **opcional**, así que quien envió el 1.º ya hizo la actividad.

## What Changes

- **Botón "✓ Marcar hecha"** en cada tarea de Notion del tablero de Inglés, y "↩" para desmarcar.
  - El servidor actualiza "Completado" en Notion solo si la fila es de quien lo pide: su correo está en
    "Usuario". El admin puede hacerlo en cualquier fila.
  - Cada marca queda registrada en el JSON de avance del repo privado: `avance/<slug>.json`, con título,
    valor, fecha y quién marcó.
- **Actividades en línea:** con al menos un intento enviado cuentan como **hechas** en el tablero y en
  el avance, con su calificación. El botón "Corregir errores" sigue disponible mientras quede intento.
- Nuevo campo `id` (id de página de Notion) en las filas de `/ingles/data`. No es dato personal.

## Capabilities

### Modified Capabilities
- `notion-data-api`: ruta para marcar o desmarcar "Completado", con control por correo.
- `dashboard-ingles`: botones de marcar y desmarcar; actividades con intento cuentan como hechas.
- `actividades-online`: registro de avance en `avance/<slug>.json`.

## Impact

- **Superficies**:
  - `server/main.ts`, `server/rows.ts` y nuevo `server/completar.ts`.
  - `ingles.html`.
  - Repo de datos (`avance/`).
  - Base de Notion "📖 Clases Inglés" (se escribe la propiedad "Completado").
- `index.html` (Secundaria) queda igual; el usuario no lo pidió.
- **Acciones externas**:
  - La integración de Notion necesita permiso de actualizar contenido. Ya verificado por el agente el
    2026-09-30, con una escritura que no cambió nada.
  - Redeploy de Deno Deploy y Pages al hacer merge.

## Matriz de acceso

| Quién | Puede marcar o desmarcar |
|---|---|
| Alumno o alumna | Solo filas donde su correo está en "Usuario" (403 en cualquier otra) |
| Admin | Cualquier fila |
| Correo desconocido o faltante | Nada (403 / 400) |

El registro en `avance/` usa el slug del alumno o alumna, nunca el correo.
