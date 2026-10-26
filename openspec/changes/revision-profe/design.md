## Decisiones

- **Clave del documento: `revisiones/<slug>/<id>.json`.** Por alumna primero (no `revisiones/<id>/<slug>`): la semana
  del profe y la lista de la alumna leen todas sus revisiones con **una** consulta (`leerCarpeta`), en lugar de una por
  clase. Contenido: `{ checks, audio, libro, calificacion, comentario, revisadoEn }`.
  - `checks`: índices (0…n-1) de las tareas de libreta marcadas, en el orden de sus tips `libreta` (sin las de audio
    y libro, que tienen su propia casilla).
  - `audio`, `libro`: booleanos; solo pueden ser `true` si la clase los pide.
  - `calificacion`: `null` o número de 0 a 10 en pasos de 0.5. «Revisada por el profe» = `calificacion !== null`.
  - `comentario`: texto de hasta 300 caracteres (se recorta; sin HTML: se escapa al pintar).
  - `revisadoEn`: ISO del último guardado.
  - Revisión vacía (sin casillas, sin calificación y sin comentario) → se borra el documento.
- **Postgres.** `revisiones/` se agrega a `PREFIJOS_INGLES` (`server/db.ts`): va a `stald_docs` sin migración. Sin la
  base migrada (y fuera de pruebas locales con `DATA_DIR`) el `PUT` responde 503 `sin_base`: nunca se escribe en el repo
  de contenido de GitHub (mismo criterio que las entregas de misiones).
- **Escritura.** Lectura-modificación-escritura con `sha` y 3 reintentos (409 → 503 `conflicto_escritura`). El `PUT`
  manda el estado completo de la tarjeta (no parches): gana el último guardado del profe.
- **Validación del `PUT`.** `alumna` en el registro de Secundaria (404 `alumna_no_encontrada`), `id` de una clase o
  examen de Secundaria para esa alumna (404 `no_encontrado`), `checks` enteros únicos dentro del rango, `calificacion`
  0–10 de medio en medio (400 `calificacion_invalida`), `comentario` texto ≤ 300 (400 `comentario_invalido`), `audio`
  y `libro` solo si la clase los pide (si no, se guardan en `false`).
- **Qué pide cada clase** (`server/revision.ts`, `pideDeClase`): tips `tipo: "libreta"` con texto. Audio = alguna tarea
  de libreta que menciona «audio» o 🎙️. Libro = materia Español o alguna tarea que menciona «libro de ortografía».
  Esas tareas salen del checklist y quedan como su casilla propia.
- **Semana.** `semana` = cualquier fecha AAAA-MM-DD; se normaliza a su lunes. Sin `semana`, la de hoy (hora de la Ciudad
  de México). La respuesta trae `anterior` y `siguiente` para navegar. Clases de la semana: las de Secundaria **de todas
  las semanas subidas y los exámenes sueltos** (también las futuras: el profe planea), para esa alumna (`alumnos`) y con
  su prórroga, cuyo día de clase (`Gamificacion.diaDeClase`, la misma regla del tablero) cae de lunes a domingo. Aparte,
  `abiertas`: las de otro día que están abiertas esa semana (`disponibleDesde ≤ domingo` y `fechaLimite ≥ lunes`).
- **Avance en línea por clase** (datos que ya existen, sin inventar):
  - `resultados/<id>/<slug>.json` → `intentosUsados`, `mejor.porcentaje`, `fueraDeTiempo` del mejor intento.
  - `borradores/<id>/<slug>.json` (cambio `autoguardado-todo`) → `borrador: { respondidas, total, actualizado }`.
  - Estado: `enviada` si hay intentos; si no, `borrador` si hay borrador; si no, `sin-abrir` (con `abre` si aún no abre).
  - Lecturas en paralelo; si una falla, esa clase sale sin ese dato y la respuesta lleva `avisos` (no se cae la vista).
- **Misiones.** No hay ruta nueva: la página ya carga `GET /misiones?alumna=<slug>` para el tablero de la alumna. La
  pestaña filtra las misiones con algún paso que vence esa semana y muestra estado, avance y evaluación con un botón a
  «📥 Entregas». La rúbrica sigue solo en «📥 Entregas».
- **Calificación final y resumen** (`comun/revision-datos.js`, script clásico como `comun/secundaria-datos.js`; lo usan
  la página y `server/revision_test.ts`). Un solo lugar:

  ```js
  FORMULA_FINAL = { pesoEnLinea: 1, pesoProfe: 1 } // promedio simple
  final = redondeo a 0.1 de (pesoEnLinea × enLinea + pesoProfe × profe) / (pesoEnLinea + pesoProfe)
  enLinea = mejor porcentaje / 10 (0 si nunca la envió); profe = calificación del profe
  ```

  Sin calificación del profe no hay final (la tarjeta dice «Final: falta tu revisión» y muestra la en línea). Resumen:
  clases del día (sin «abiertas»), enviadas, revisadas, promedio de la semana (de las finales), promedio por materia y
  pendientes de revisar (enviadas sin calificación del profe).
- **Lo que ve la alumna.** `listarActividades` (ámbito Secundaria, no admin) lee `revisiones/<slug>/` una vez y agrega
  `revision: { calificacion, comentario, revisadoEn }` solo a las clases con calificación. Si la lectura falla, la lista
  sale sin `revision` (se registra). La página pinta «✅ Revisado por el profe: 9 · comentario» en la fila y en la clase.
- **Página.** `ingles/secundaria-revision.js` (nuevo): pestaña `revision` (`#revision`, «📋 Revisión», corto «Revisión»,
  solo admin; en celular vive en «☰ Más»). Carga perezosa en `irPestanaSec` (primera vez que se abre, o al llegar con
  `#revision`). Cada tarjeta es un `<form>`; «💾 Guardar revisión» manda el `PUT` y repinta solo esa tarjeta y el
  resumen. Las casillas se guardan solas al marcarlas (sin perder lo escrito en la calificación o el comentario).
- **Rendimiento.** Ninguna petición al abrir el tablero; la semana es 1 petición; cambiar de semana, 1; guardar, 1.

## Contrato (fuente para la página y la E2E)

Documento `revisiones/<slug>/<id>.json` (ojo: alumna primero):

```json
{ "checks": [0, 2], "audio": false, "libro": true, "calificacion": 9, "comentario": "Muy buena letra", "revisadoEn": "2026-10-28T18:00:00.000Z" }
```

`GET /profe/revision?alumna=<slug>&semana=<AAAA-MM-DD>` (solo admin; `semana` opcional, cualquier día; `hoy` solo
con `PERMITIR_HOY=1`) → 200:

```json
{
  "alumna": { "slug": "valeria", "nombre": "Valeria Gómez" },
  "hoy": "2026-10-04",
  "semana": { "lunes": "2026-10-26", "domingo": "2026-11-01", "anterior": "2026-10-19", "siguiente": "2026-11-02", "dias": ["2026-10-26", "…7 fechas"] },
  "clases": [ {
    "id": "sec-…", "tipo": "actividad", "titulo": "📘 Español · …", "materia": "Español", "dia": "2026-10-26",
    "disponibleDesde": "…", "fechaLimite": "…", "preguntas": 4, "intentosMax": 2, "intentosUsados": 1,
    "mejor": { "porcentaje": 75 } , "fueraDeTiempo": true,
    "estado": "sin-abrir | borrador | enviada", "abre": "AAAA-MM-DD (solo si sin-abrir y aún no abre)",
    "borrador": { "respondidas": 3, "total": 4, "actualizado": "ISO" },
    "pide": { "libreta": ["texto de cada tarea (índice = checks)"], "audio": true, "libro": false },
    "revision": { "checks": [], "audio": false, "libro": false, "calificacion": null, "comentario": "", "revisadoEn": "ISO" }
  } ],
  "abiertas": [ "mismas claves que clases" ],
  "avisos": ["borradores | resultados | revisiones (solo si una lectura falló)"]
}
```

`mejor`, `fueraDeTiempo`, `borrador` y `revision` pueden ser `null`. `clases` y `abiertas` van ordenadas por `dia` e
`id`. Errores: 403 `solo_admin`, 404 `alumna_no_encontrada`, 400 `semana_invalida`, 405 `metodo_no_permitido`.

`PUT /profe/revision` con `{ "alumna": "<slug>", "id": "<id>", "checks": [0], "audio": false, "libro": true,
"calificacion": 9 | null, "comentario": "…" }` (estado completo de la tarjeta) → 200
`{ "guardado": true, "revision": { …documento… } }` o, si quedó vacía, `{ "guardado": true, "vacia": true,
"revision": null }`. Errores: 400 `json_invalido`, `calificacion_invalida`, `comentario_invalido`, `checks_invalidos`;
404 `alumna_no_encontrada`, `no_encontrado` (clase inexistente o de otra alumna); 403 `solo_admin`; 503 `sin_base`,
`conflicto_escritura`. `audio`/`libro` llegan `false` si la clase no los pide.

`GET /secundaria/actividades` (alumna o vista del admin con `?alumna=`): cada elemento calificado por el profe trae
`"revision": { "calificacion": 9, "comentario": "…", "revisadoEn": "ISO" }`; los demás no traen la clave.

Página: `comun/revision-datos.js` expone `RevisionDatos.{ FORMULA_FINAL, MAX_COMENTARIO, calificacionValida,
enviada, calificacionProfe, enLineaDe, finalDe(clase), resumenSemana(clases) → { clases, enviadas, revisadas,
pendientes, promedio, porMateria: [{ clave, nombre, clases, revisadas, promedio }] }, misionesDeSemana(misiones, lunes) }`.
Las clases que reciben son las de `GET /profe/revision` (`intentosUsados`, `mejor`, `revision`).

## Alternativas descartadas

- `revisiones/<id>/<slug>.json` (como `resultados/`): obliga a una lectura por clase para la semana y para la alumna.
- Calcular la final en el servidor: la alumna no la ve y el profe la necesita en vivo al teclear; una fórmula en un
  script compartido evita duplicarla.
- Una sola ruta que devuelva también las misiones: ya llegan con `GET /misiones?alumna=`, sería pedir dos veces.
- Inglés en este mismo cambio: ver «Fuera de alcance (fase 2)» en `proposal.md`.

## Pruebas

- Unitarias (`server/revision_test.ts`): semana normalizada y navegación; clases por día y abiertas; estado sin abrir /
  borrador (N de M) / enviada con fuera de tiempo; qué pide cada clase; guardar y leer; validaciones 400; 404 de alumna o
  clase; matriz 403; revisión vacía se borra; la alumna recibe solo calificación y comentario; fórmula y resumen
  (`comun/revision-datos.js`); prefijo en Postgres.
- E2E `revision-profe` (celular, tablet y PC; claro y oscuro): abrir la pestaña (perezosa), navegar semanas, marcar
  checklist, calificar, comentar, guardar, recargar y ver que persiste; resumen; enlace a «📥 Entregas»; la alumna ve
  «✅ Revisado por el profe» y no el checklist; 403 para no admin; restaura el estado.
