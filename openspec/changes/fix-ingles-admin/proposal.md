## Why

El 2026-10-22 el profe reportó dos fallas en `ingles.html` como admin en producción (celular, Grupo 1, pestaña
Resumen):

1. **«No se pudo cargar el resumen (upstream_error).»** `GET /ingles/resumen` respondió 500. Ese código sale del
   `catch` genérico de `server/main.ts` (`atender`): cualquier excepción dentro de la ruta. El resumen **no** consulta
   Notion (la base de Secundaria se borró el 2026-10-21): solo lee el contenido, el registro `alumnos.json`, los grupos
   y una carpeta de resultados por columna en Postgres. Cada lectura de PostgREST lleva `AbortSignal.timeout(5000)`
   (`server/db.ts`), y el resumen lanza las 5 lecturas `path=like.resultados/<id>/*` en paralelo, más grupos e
   inscripciones, justo cuando el panel abre una docena de peticiones más. **Una sola** lectura lenta o caída
   tumbaba todo el resumen (`server/resumen.ts`, `Promise.all` sin manejo de errores). El 500 no decía el motivo, así
   que la captura no permitía diagnosticar.
2. **«No veo el botón de ocultar grupo.»** #235 puso «👁️ Ocultar del panel» solo en la sección «👥 Grupos». El rediseño
   #239 agregó tarjetas por grupo en el Resumen («🔍 Ver grupo», «🎥 Meet»), que es donde el profe lo busca, pero sin
   el botón. Además las tarjetas se pintan dentro del resumen: si el resumen falla, no hay tarjetas.

## What Changes

- **Resumen que no se cae** (`server/resumen.ts`):
  - Cada columna lee sus resultados con un reintento. Si aun así falla, esa columna se deja fuera (no cuenta en los
    indicadores) y la respuesta trae `avisos: ["resultados_incompletos"]`.
  - Si fallan los grupos (`grupoDe`, `ocultoAdmin`, `grupoInfo`), el resumen sale sin filtrar por grupo y con
    `avisos: ["grupos_no_disponibles"]`.
  - La respuesta siempre trae `avisos` (arreglo; vacío si todo se leyó).
  - Sigue sin depender de Notion (prueba de regresión con `NOTION_TOKEN` puesto y Notion fallando).
- **Diagnóstico** (`server/main.ts`): el 500 `upstream_error` trae `detalle` (el mensaje, ≤ 200 caracteres) solo si
  quien pide es el admin; el registro anota la ruta.
- **Botón en la tarjeta** (`ingles/tablero.js`): cada tarjeta de grupo del Resumen trae «👁️ Ocultar del panel» junto
  a «🔍 Ver grupo» y «🎥 Meet». Con el interruptor «Mostrar grupos ocultos (N)», el grupo oculto aparece con
  «🙈 oculto del panel» y «👁️ Mostrar en el panel». Es la misma acción que en «👥 Grupos».
- **Tarjetas sin esperar al resumen**: salen también mientras carga y si falla (con «—» en el avance).
- **Aviso con «🔄 Reintentar»**: si el resumen falla, el aviso muestra el motivo (`detalle`) y un botón para
  reintentar. Si llega con `avisos`, se muestran en texto claro.
- **E2E `ingles-admin`** (fase `ingles`, con o sin `--pg`): falla ante cualquier error de consola, error JS, recurso
  que no carga o 5xx de la API al cargar el admin y cada pestaña (y la ruta del profe); con grupos, prueba ocultar y
  mostrar desde la tarjeta y restaura la bandera.
- `e2e-ocultar-grupos` acota sus selectores a `#grupos-admin` (ahora el botón también está en las tarjetas).

## Impact

- Código: `server/resumen.ts`, `server/main.ts`, `ingles/tablero.js` (`?v=7` en `ingles.html`).
- Pruebas: `server/resumen_resiliente_main_test.ts` (nueva), `tests/e2e/e2e-ingles-admin.js` (nueva),
  `tests/e2e/e2e-ocultar-grupos.js`, `tests/e2e/correr.sh`.
- Sin cambios de esquema ni de datos. No toca `juegos/`.
