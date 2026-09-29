## Why

Se integra una alumna nueva, Sofy, a las clases de Inglés. Debe presentar el diagnóstico A1 que el grupo
resolvió el fin de semana pasado (fecha límite 2026-09-27), con fecha de entrega **mañana, 2026-09-29**.
Hoy la fecha límite es la misma para todos. Sofy vería el 27 y su entrega quedaría "fuera de tiempo".

## What Changes

- **Prórroga por alumno o alumna**: un elemento puede traer `prorrogas: { "<slug-alumno>": "AAAA-MM-DD" }`.
  Para ese alumno o alumna, la fecha límite es la de la prórroga:
  - en la lista;
  - en el detalle;
  - en el cálculo de `fueraDeTiempo`.
  Los demás no cambian.
- `validateItem` revisa que cada prórroga sea una fecha válida y no anterior a `disponibleDesde`.
- **Alta de Sofy** (datos, no código):
  - Fila en Notion "📖 Clases Inglés": `Nombre` = Sofy, `Usuario` = su usuario de Notion (ya es invitada
    del workspace), "📋 A1 Test #1 — Verbo TO BE + Pronombres", entrega 2026-09-29.
  - En el repo de datos: `diagnostico-a1.prorrogas.sofy = "2026-09-29"`.

## Capabilities

### Modified Capabilities
- `actividades-online`: fecha límite por alumno o alumna.
- `notion-data-api`: el título de la fila no depende del nombre de su propiedad. Es un bug hallado al
  verificar el alta: todas las filas de Inglés salían "(sin título)".

## Impact

- **Superficies**:
  - `server/motor.ts` y `server/actividades.ts`.
  - Repo privado de datos (`diagnostico-a1.json`).
  - Base de Notion "📖 Clases Inglés": 1 fila nueva.
- Sin cambios en `index.html` ni en `ingles.html`: ya muestran la `fechaLimite` que les manda el servidor.
- **Acciones externas**:
  - Crear la fila de Notion (agente, con la API).
  - Redeploy de Deno Deploy al hacer merge (automático; el agente verifica).
  - **Usuario:** si quiere que Sofy vea Notion, compartirle la página de Inglés y crear su vista en
    "Vistas Alumnos". Para la web no hace falta.

## Matriz de acceso

- **Sofy:** ve solo sus filas y sus resultados. La prórroga no revela datos de nadie más.
- **Demás alumnos y alumnas:** sin cambios; no ven las prórrogas.
- **Admin:** ve la fecha base. El correo de Sofy vive solo en Notion, no en el repo.
