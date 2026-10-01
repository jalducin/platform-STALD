# Modelo de datos (Notion)

Fuente canónica de las bases de Notion y de las propiedades que lee el backend. Los nombres de
propiedad son **literales** (incluyen acentos y espacios). Renombrar una propiedad en Notion rompe el
backend: tratarlo como un cambio OpenSpec.

## Base "📖 Clases" (Secundaria)

- ID: `3831c6b4f8b5817ba701ed689f825cf0`
- Consumida por: `/data` → `secundaria.html`

| Propiedad Notion | Tipo | Campo en `Row` |
|---|---|---|
| `Name` | title | `name` |
| `Matería` (sic, con acento) | select | `materia` |
| `Completado` | checkbox | `completado` |
| `Fecha entrega` | date | `fecha` |
| `Fecha entrega real` | date / last_edited_time | `fechaReal` (AAAA-MM-DD) |
| `Semana` | select | `semana` |
| `Día ` (sic, con espacio final) | select | `dia` |
| `Usuario` | people | resuelto a `userNames` (el correo solo se usa en el servidor para filtrar) |

## Base "📖 Clases Inglés"

- ID: `3c41c6b4f8b580f888d8d122cbb5c613` (data source `9581c6b4-f8b5-8283-bf7e-878652c0d17e`)
- Consumida por: `/ingles/data` → `ingles.html` (`source: "clases_ingles"`). Cada fila trae `id` (id de la
  página), que usa `POST /ingles/data/<id>/completado` para escribir `Completado` desde la página.
- Fuera de alcance: el hub "Ingles Aguilar" (excluido a pedido del usuario).
- **Modelo: una fila por (clase, alumno).** El mismo catálogo de clases se repite para cada alumno.
  Alumnos actuales: Fernando, Marisol, Angel, Laura y Jesus (51 clases cada uno). Una clase nueva se
  agrega una vez por alumno.
- Calendario de entregas: una actividad por día desde 2026-09-26 (hasta 2026-11-14), ordenadas por
  `Dificultad` (A1 → A2 → B1), luego por `Módulo` y por número de lección; el mismo para todos los alumnos.
  "📋 REGLA — Dónde anotar cada tipo de clase" no lleva fecha. Detalle: cambio OpenSpec `ingles-fechas-y-avance`.
- Vistas: "Mis clases" (`Usuario` = me; pestaña de la base y vista en "Vistas Alumnos") para que cada
  alumno vea sus filas, y una vista por alumno filtrada por `Nombre` para el admin. Las vistas no son
  control de acceso: un guest con acceso a la base puede quitar el filtro.

| Propiedad Notion | Tipo | Campo en `InglesRow` |
|---|---|---|
| `Name` | title | `name` |
| `Nombre` | select (alumno) | `alumno` |
| `Módulo` | select | parte de `label` |
| `Tipo` | select | parte de `label` (`"Módulo · Tipo"`) |
| `Completado` | checkbox | `completado` |
| `Fecha Entrega ` (sic, con espacio final) | date | `fecha` |
| `Usuario` | people | resuelto a `userNames` (el correo solo se usa en el servidor para filtrar) |
| `Dificultad` | select (A1–C2) | `dificultad` |
| `Calificación` | text | `calificacion` (null si está vacía) |
| `Observaciones` | text | — (solo en Notion) |
| (página) `last_edited_time` | sistema | `editadoEn`: se usa como fecha de realización |

## Acceso por correo

- Una fila es visible para una alumna si su correo está entre los correos de los usuarios de `Usuario`.
  En Inglés, las filas nuevas se crean con `Usuario` vacío: el admin asigna el guest de cada alumno
  (en la vista del alumno, seleccionar todas las filas y asignar `Usuario` en bloque).
- Para que el correo se resuelva, la persona debe ser **miembro o guest** del workspace de Notion y la
  integración debe tener la capability de leer correos de usuarios.
- El administrador (correo en el secreto `SUPER_ADMIN_EMAIL`) ve todas las filas.
- La lista de alumnas y sus correos **vive solo en Notion**; no se copia al repo.

## Exámenes (JSON, sin base de datos)

> Legado (Supabase v14). En producción, el diagnóstico y los exámenes se sirven desde el repo de datos
> (`contenido/examenes/`, `resultados/<id>/<alumno>.json`). Ver la sección de actividades online.

**Definición** (versionada en `supabase/functions/tareas-estudio-secundaria/examenes/<id>.json`):

```json
{
  "id": "diagnostico-a1", "titulo": "…", "descripcion": "…", "nivel": "A1",
  "disponibleDesde": "2026-09-26", "fechaLimite": "2026-09-27",
  "secciones": [{ "id": "to-be", "titulo": "Verbo to be",
    "retroalimentacion": { "fortaleza": "…", "en-progreso": "…", "debilidad": "…" } }],
  "preguntas": [{ "id": "be-1", "seccion": "to-be", "enunciado": "I ___ a student.",
    "opciones": ["is", "are", "am", "be"], "correcta": 2, "explicacion": "…" }]
}
```

**Resultado** (Supabase Storage, bucket privado `examenes`, `resultados/<id>/<alumno>.json`): `examen`,
`titulo`, `alumno`, `enviadoEn`, `fueraDeTiempo` (enviado después de `fechaLimite`), `respuestas`, `correctas`, `total`, `porcentaje`, `nivelSugerido`,
`secciones[]` (`correctas`, `total`, `porcentaje`, `estado`, `retroalimentacion`), `fortalezas`,
`enProgreso`, `debilidades` y `revision[]` (`enunciado`, `tuRespuesta`, `correcta`, `explicacion`). Sin correos.

Umbrales por tema: ≥ 80 % fortaleza, 60–79 % en progreso, < 60 % debilidad. Nivel sugerido del diagnóstico
A1: ≥ 80 % "A1 sólido — listo para A2", 50–79 % "A1 en progreso", < 50 % "Iniciando A1".

## Contenido de juegos (repo público, `juegos/datos/`)

Sin datos personales. Se sirve junto a `juegos.html`.
- `ingles.json`:
  - `vocabulario[]` `{ en, es, emoji, tema }`;
  - `spelling[]` `{ en, es, nivel }`;
  - `verbos[]` `{ frase, opciones, correcta, es, tema }`;
  - `oraciones[]` `{ en, es }`;
  - `preguntas[]` `{ pregunta, opciones (4), correcta, es, tema }` para "Responde en inglés" (124, nivel A1).
- `espanol.json`:
  - `ortografia[]` y `acentos[]` `{ frase, opciones, correcta, regla?, explicacion }`;
  - `sinonimos[]` y `antonimos[]` `{ palabra, respuesta, distractores }`;
  - `oraciones[]` (texto).
- `cultura.json`: `categorias[]` `{ id, titulo, emoji }` y `preguntas[]`
  `{ cat, nivel (1–3), pregunta, opciones (4), correcta, dato }`.
- `basta.json`: `{ es, en }`, cada uno con:
  - `categorias[]` `{ id, titulo, emoji }`;
  - `letras[]` que pueden salir;
  - `palabras{ <categoria>: [...] }`, el diccionario para verificar respuestas; se compara sin
    mayúsculas ni acentos, y la ñ cuenta aparte.
- `loteria.json`: `cartas[]` `{ n, es, en, emoji, verso }`.
  - 54 cartas, con versos originales.
  - "El Ajolote", "El Colibrí" y "El Tlacuache" sustituyen a tres cartas tradicionales poco apropiadas
    para menores.

## Actividades semanales (repo privado `platform-STALD-data`)

Fuente canónica del formato. El contenido **incluye las respuestas** y por eso vive en el repo privado.

- `contenido/semanas/<lunes>.json`: `{ id, titulo, elementos: [{ id, tipo, fecha }] }`. Ritmo: martes y
  jueves `actividad`, viernes `examen`, sábado `refuerzo`, domingo `meet`. Una semana se puede subir por
  adelantado: es visible desde su lunes. Reglas de validación: `server/semana.ts`; flujo: skill
  `nueva-semana-ingles`.
- `contenido/actividades/<id>.json` y `contenido/examenes/<id>.json`:
  - Campos generales: `id`, `tipo`, `titulo`, `nivel`, `descripcion`, `disponibleDesde`, `fechaLimite`,
    `intentos` (actividad y refuerzo 2, examen 1), `preguntasPorIntento`.
  - `prorrogas` (opcional): `{ "<slug-alumno>": "AAAA-MM-DD" }`, la fecha límite propia de un alumno o alumna
    (p. ej. quien se integra tarde). No adelanta `disponibleDesde`. El slug es el de `resultados/`, nunca el correo.
  - `temas[]`: con `retroalimentacion` por estado.
  - `teoria[]`: `{ titulo, texto?, tabla?: { columnas, filas }, puntos?, ejemplos?: [{ en, es }] }`.
  - `tips[]`: `{ tipo: "libreta" | "video", texto, url? }`. Los videos son enlaces de **búsqueda** de YouTube.
  - `banco[]`: ejercicios `{ id, tema, tipo: "opcion" | "escribir", enunciado, opciones? + correcta? |
    aceptadas?, explicacion }`.
  - Refuerzo: `bancoDe[]`, `basadoEn` (examen de la semana), `respaldo` (diagnóstico) y `mapeoTemas`.
  - Meet: `meetUrl` y `hora`. Además, para la clase del domingo, `guion` (solo admin), `teoria`, `tips`,
    `banco` (reto en vivo) y `presentacion.diapositivas` (solo admin), con tipos `portada`, `agenda`, `retro`
    (grupal, sin nombres), `teoria` (con `ref` al índice de la teoría), `practica`, `juego`, `reto`,
    `libreta` y `cierre`.
- `juegos/semanas/<lunes>/<id-jugador>.json`: partidas de la semana.
  - `{ id, nombre, tipo, partidas: [{ juego, puntos, aciertos, total, segundos, en }], mejores, total }`.
  - Sin correos. Guarda las últimas 300 partidas.
- `juegos/salas/<código>/sala.json` `{ codigo, juego, opciones, seed, host, creada, inicio, bots }` y
  `juegos/salas/<código>/<id-jugador>.json` `{ id, nombre, tipo, unido, respuestas, palabras?, basta?, rondasBasta? }`.
  - En Basta por rondas (`opciones.rondas`: 5, 10 o 12), `rondasBasta{ <ronda>: { palabras, basta? } }`.
    Las letras (sin repetir) y el calendario de rondas salen de la semilla y de las horas de `basta`.
  - Partidas multijugador. Cada jugador escribe solo su archivo y no hay correos.
  - Las salas vencen a las 3 h y se pueden borrar sin afectar el ranking.
  - Al terminar, el archivo de cada jugador guarda `final`, y el del host, además, `podio`.
  - En ¡Una!, `jugadas[]` `{ n, accion, carta, color, t }` (hasta 600) y `unas[]` `{ paso, t }`, el botón
    UNA con su hora. El mazo y el reparto salen de la
    semilla.
  - En Lotería, `loteria` guarda la hora del primer grito. Las tablas y el orden de las cartas salen de
    la semilla.
- `juegos/salas-semana/<lunes>.json`: `{ salas: [{ codigo, juego, host, creada }] }`, índice para el
  resumen del admin.
- `juegos/perfiles/<id-jugador>.json`: `{ emoji, color, foto? }`, el avatar elegido. `foto` es el
  token de la foto, si subió una.
- `juegos/fotos/<token>.json`: `{ id, nombre, imagen, en }`, foto de avatar 128×128 JPEG (data URL), subida
  con permiso de mamá, papá o tutor. Sin correos.
- `juegos/fotos/indice.json`: `{ "<id-jugador>": { nombre, token, en } }`, fotos activas para la
  moderación del admin.
- `juegos/invitados.json`: `{ "<correo>": { nombre, registradoEn, ultimaVisita, visitas } }`.
  - Son los únicos correos que guarda el repo de datos. El invitado aceptó el aviso al registrarse.
  - Solo el admin los ve (`/juegos/invitados`).
- `alumnos.json`: `{ "<correo>": { nombre, alta } }`, alumnos y alumnas dados de alta desde `ingles.html`
  (cambio `alta-alumnos`). Se suman a los de Notion. Solo el admin ve los correos.
- `avance/<slug-alumno>.json`: avance fuera de las actividades en línea.
  - `{ alumno, notion: { <pageId>: { titulo, completado, en, por } }, historial: [...] }`.
  - `por` es `alumno` o `admin`. `historial` guarda como máximo las 200 entradas más recientes. Sin correos.
- `resultados/<id>/<slug-alumno>.json`: `{ id, titulo, alumno, intentos: [{ n, enviadoEn, fueraDeTiempo,
  preguntas, respuestas, calificacion }], mejor }`. Cuenta el **mejor** intento. Sin correos.

Selección de ejercicios: determinista por `id|slug|intento` y repartida por tema. Así toca la misma clase
para todos, pero con ejercicios distintos para cada alumno o alumna.

**Intento de corrección** (actividad, refuerzo y reto del Meet): el intento 2 trae los **mismos**
ejercicios del intento 1 (`intentos[].preguntas`). Las correctas quedan fijas y solo se contestan las
falladas; si el último intento tiene 100 %, el elemento queda completo. El examen tiene 1 intento; si
tuviera más, cada uno sería una selección nueva.
