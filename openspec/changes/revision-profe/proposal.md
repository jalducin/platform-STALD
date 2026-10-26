## Why

Pedido del profe (2026-10-25). Se le armó una página local de revisión de la semana de una alumna (tarjetas por día,
estado enviado o sin enviar con su calificación, checklist «qué revisar en su libreta», avisos de audio y de libro de
ortografía; las casillas vivían solo en su navegador). Su respuesta: «más bien sería un área donde pueda ver el avance
del alumno y lo pueda ir calificando». Lo quiere **dentro de la plataforma**, como vista del profe, con lo que revisa
guardado en su cuenta y no en un archivo suelto.

Hoy el profe tiene «📝 Resultados» (mejor calificación por clase) y «📥 Entregas» (misiones con rúbrica), pero nada
para: ver de un vistazo la semana de una alumna (sin abrir / en borrador / enviada), marcar lo que revisó de su libreta,
del audio y del libro de ortografía, ni ponerle su propia calificación a la clase.

## What Changes

- **Pestaña nueva «📋 Revisión»** en la vista del admin de Secundaria (`ingles.html?modo=secundaria`, con el selector
  de alumna que ya existe). Solo admin. Se carga perezosa: la petición sale solo al abrir la pestaña.
- **Por semana** (lunes a domingo) con «◀ Semana anterior / Semana siguiente ▶» y «Esta semana», agrupada por día, una
  tarjeta por clase con el chip de su materia y el estilo RPG (`estilos/ui.css`). Las clases abiertas esa semana que son
  de otro día (repasos y guías) van en «📌 Abiertas esta semana».
- **Cada tarjeta**:
  - Avance en línea: estado (⏳ sin abrir / 💾 en borrador «avanzó N de M» / ✅ enviada), mejor calificación,
    «⏰ fuera de tiempo» si el mejor intento llegó tarde y «🔎 Ver respuestas» (el detalle que ya existe).
  - Revisión del profe, guardada en el servidor: checklist de las tareas de libreta de la clase (de sus tips
    `libreta`), «🎙️ Audio recibido» si la clase pide audio, «📖 Páginas del libro de ortografía revisadas» en Español,
    calificación del profe (0 a 10, de medio en medio punto) y comentario corto (hasta 300 caracteres).
  - Calificación final de la clase: combina el porcentaje en línea con la del profe. Por omisión, promedio simple;
    configurable en un solo lugar (`comun/revision-datos.js`, `FORMULA_FINAL`).
- **Resumen arriba**: clases de la semana, enviadas, revisadas por el profe, promedio de la semana y por materia, y
  pendientes de revisar.
- **Misiones de la semana**: lista de las misiones con paso que vence esa semana, con su estado y su evaluación, y un
  enlace a «📥 Entregas» (la evaluación con rúbrica sigue solo ahí; no se duplica).
- **La alumna ve** en su clase y en su lista «✅ Revisado por el profe: 9 · comentario» cuando ya tiene calificación del
  profe. No ve el checklist, el audio ni el libro.
- **Servidor**: `GET /profe/revision?alumna=<slug>&semana=<AAAA-MM-DD>` y `PUT /profe/revision`; documento
  `revisiones/<slug>/<id>.json` en Postgres (`stald_docs`, prefijo nuevo, sin migración). `GET /secundaria/actividades`
  de la alumna agrega `revision: { calificacion, comentario, revisadoEn }` a sus clases revisadas (sin petición nueva).

## Capabilities

### New Capabilities

- `revision-profe`: revisión de la semana de una alumna por el profe (avance en línea, revisión manual guardada,
  calificación final, resumen, misiones enlazadas) y lo que la alumna ve de esa revisión.

### Modified Capabilities

- Ninguna (las capacidades existentes no cambian de requisito; la alumna solo recibe un campo nuevo en su lista).

## Matriz de acceso

| Quién | `GET /profe/revision` | `PUT /profe/revision` | `revision` en `GET /secundaria/actividades` |
|---|---|---|---|
| Admin (profe) | ✅ cualquier alumna de Secundaria (404 si no existe) | ✅ (valida clase de esa alumna) | En la vista «como la alumna» (`?alumna=`): solo calificación y comentario |
| Alumna de Secundaria | ❌ 403 | ❌ 403 | ✅ solo las suyas, solo `calificacion`, `comentario`, `revisadoEn` |
| Alumno o alumna de Inglés, baja, invitado de Juegos | ❌ 403 | ❌ 403 | Sin acceso a Secundaria (403, como hoy) |
| Sin sesión | 401 (como toda ruta con identidad) | 401 | 401 |

El checklist, el audio y el libro **nunca** salen a la alumna. Se verifica con pruebas unitarias
(`server/revision_test.ts`) y con la E2E `revision-profe` (403 para no admin, la alumna ve calificación y comentario y
no ve el checklist).

## Fuera de alcance (fase 2)

- **Inglés**: la misma vista por grupo o por alumno o alumna en el panel del profe de Inglés. El servidor queda listo
  para reusarse (la clave es por id de actividad y slug), pero el panel de Inglés tiene grupos, presupuesto de 5
  peticiones al abrir y su propia navegación; meterlo aquí agrandaría demasiado el cambio. Se hará en un cambio aparte
  (`revision-profe-ingles`).
- Notificar a la alumna cuando la revisan (aviso tipo «evaluación nueva» de misiones).

## Impact

- Superficies: `ingles.html` (y `secundaria.html`, que la usa), servidor Deno (`server/revision.ts` nuevo,
  `server/main.ts`, `server/actividades.ts`, `server/db.ts`), Postgres (`stald_docs`, ruta nueva `revisiones/`, sin
  migración). No toca `index.html`, `juegos.html`, Notion ni el repo de datos.
- Contrato HTTP: rutas nuevas `GET` y `PUT /profe/revision`; campo nuevo opcional `revision` en los elementos de
  `GET /secundaria/actividades` (alumna). Documentado en `docs/backend-standards.md` y `docs/data-model.md`.
- Privacidad: la calificación y el comentario del profe son datos de la alumna (menor de edad); viven en Postgres con
  RLS sin políticas públicas y solo el servidor los lee. Se agrega a `privacidad.html`.
- Rendimiento: la pestaña no pide nada al abrir el tablero (presupuestos de la E2E `peticiones` sin cambio).
- Acciones externas: ninguna (Deno Deploy y Pages publican con el merge).
