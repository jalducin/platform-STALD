## Why

Este es el Sprint 5, de cierre técnico. Atiende tres deudas que aún pueden causar fallas o confusión:

1. **Juegos todavía guarda todo en GitHub**: salas, partidas, ranking, perfiles, fotos e invitados. Cada jugada
   gasta del límite de la API de GitHub; eso ya causó una caída. Inglés ya está en Postgres desde
   `ingles-grupos`.
2. **El respaldo de lectura a GitHub en `PgStore`** se pensó solo para la transición de `ingles-grupos`, que ya pasó.
   Hoy oculta fallas y puede mostrar datos viejos.
3. **Inglés todavía lee Notion**, aunque el profe ya no lo usa para Inglés. Así apareció el alumno «Sin nombre
   asignado». Pero los correos de alumnos y alumnas como Marisol, Angel o Sofy **solo existen en Notion**. Si se
   apaga sin más, pierden el acceso.

## What Changes

- **Juegos en Postgres**:
  - `PgStore` atiende una lista de prefijos activos. `juegos/` se activa con la marca `meta/migrado-juegos`.
  - `herramientas/migrar-ingles.ts --juegos` copia `juegos/**` 1 a 1, verifica y escribe la marca.
  - El corte es automático, igual que en Inglés.
- **Sin respaldo de GitHub**:
  - si Postgres falla, `PgStore` reporta el error (503) en lugar de leer una copia vieja;
  - el repo de datos conserva la etiqueta `antes-de-postgres` y sigue con el contenido.
- **Inglés sin Notion, en dos fases**:
  1. **Importar.** Al consultar la lista de alumnos y alumnas, el admin copia al registro (`alumnos.json` en
     Postgres) a cada persona de Notion que tenga correo. Se guarda con `origen: "notion"` y sin `inicio`, porque
     ya llevaba el curso. Es idempotente y no pisa altas existentes.
  2. **Apagar.** Inglés deja de leer la base «Clases Inglés» de Notion. La identidad sale solo del registro.
     Secundaria sigue usando Notion.
  - Se publica la fase 1; se verifica en la base que el registro tenga a todas las personas con correo; después se
    publica la fase 2.

## Capabilities

### Modified Capabilities
- `plataforma`: almacenamiento de Juegos y origen de la identidad en Inglés.

## Impact

- `server/db.ts`, `server/main.ts`, `server/alumnos.ts`, `herramientas/migrar-ingles.ts` y pruebas.
- Documentación: `docs/data-model.md`, `docs/backend-standards.md` y `README.md`.
- Migración en producción de `juegos/**`, unos 120 archivos (350 KB), con cuadre y respaldo.
