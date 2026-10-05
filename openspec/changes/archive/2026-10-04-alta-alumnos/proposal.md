## Why

El usuario pidió (2026-09-30) poder **crear alumnos y alumnas nuevos en las clases de Inglés con su
correo y nombre** desde la página. Hoy el acceso sale de Notion (campo "Nombre" + persona), y la API de
Notion no puede invitar personas: cada alta requería trabajo manual.

## What Changes

- Tarjeta de admin **"👥 Alumnos y alumnas"** en `ingles.html`:
  - formulario **Nombre + correo → Dar de alta**;
  - lista de quienes tienen acceso, con su origen (Notion o alta en la página);
  - **Quitar** solo para los dados de alta en la página (sus resultados se conservan).
- **Servidor** (`server/alumnos.ts`):
  - registro en el repo privado `alumnos.json` → `{ "<correo>": { nombre, alta } }`;
  - `GET /ingles/alumnos`, `POST /ingles/alumnos` `{ nombre, email }` y `POST /ingles/alumnos/quitar`
    `{ email }`, solo admin;
  - las filas de Inglés suman el registro: el correo se liga a las filas de Notion con ese "Nombre" (así
    sirven tareas creadas en Notion sin cuenta de la persona) o, si no tiene, a una **fila de identidad**
    (`source: "registro"`, sin tarea).
- Con eso, quien se da de alta entra con su correo a **Inglés** (actividades y exámenes de la semana), al
  **portal** y a **Juegos** como alumno o alumna, y aparece en la vista de admin.

## Capabilities

### Modified Capabilities
- `ingles`: alta de alumnos y alumnas desde la página.

## Impact

- `server/alumnos.ts` (nuevo), `server/main.ts`, `server/rows.ts` (tipo `source`), `ingles.html`.
- Repo de datos: `alumnos.json` (correos solo en el repo privado; solo el admin los ve).
- Acciones externas: redeploy al hacer merge; verificación en producción y borrado del alta de prueba.

## Matriz de acceso

- Solo el admin lista, da de alta y quita.
- Los correos del registro no salen a nadie más: cada quien ve solo sus filas.
- Los de Notion se cambian en Notion (Quitar → 404).
