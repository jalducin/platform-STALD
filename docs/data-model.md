# Modelo de datos

Fuente canónica de las bases de Notion (hoy solo Secundaria), de los formatos JSON del repo de datos y de las
tablas `stald_*` de Postgres. En Notion, los nombres de
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

## Base "📖 Clases Inglés" (histórica, ya no se lee)

- ID: `3c41c6b4f8b580f888d8d122cbb5c613`.
- Desde la fase 2 de «Inglés sin Notion» (cambio `cierre-tecnico`), el servidor **no la consulta**: la identidad de
  Inglés sale solo del registro (`alumnos.json`) y las tareas y calificaciones salen de las actividades en línea.
  Ya no existe `POST /ingles/data/<id>/completado` (responde 404).
- Antes de apagarla, la fase 1 copió al registro a cada alumno o alumna que tenía correo en ella
  (`origen: "notion"`). La base queda en Notion solo como historial.

## Acceso por correo

- Secundaria: una fila es visible para una alumna si su correo está entre los correos de los usuarios de `Usuario`.
- Para que el correo se resuelva, la persona debe ser **miembro o guest** del workspace de Notion y la
  integración debe tener la capability de leer correos de usuarios.
- El administrador (correo en el secreto `SUPER_ADMIN_EMAIL`) ve todas las filas.
- La lista de alumnas de Secundaria y sus correos **vive solo en Notion**; no se copia al repo.
- Inglés: la identidad es el registro (`alumnos.json`, en Postgres en producción); `GET /ingles/data` devuelve solo
  filas de identidad (`source: "registro"`), sin tareas.

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
- `ingles.json` (nivel A1, español de México, sin nombres de alumnos ni alumnas reales; su forma la valida
  `server/ingles_datos_test.ts`, cambio `juegos-ingles-gramatica`):
  - `vocabulario[]` `{ en, es, emoji, tema }`;
  - `spelling[]` `{ en, es, nivel }`;
  - `verbos[]` `{ frase, opciones (3, sin repetir), correcta, es, tema, regla }` para 🧩 Completa y responde:
    - `frase` lleva `___`; `regla` es la regla corta (máx. 90 caracteres) que se muestra al fallar;
    - `tema`: `to be`, `to be pasado`, `presente simple`, `pasado simple` y `futuro will` (al menos 40 cada uno), y
      `wh`, `posesivos`, `articulos`, `plurales`, `demostrativos` y `adjetivos`;
  - `oraciones[]` `{ en, es, tema }` para 🔀 Ordena la oración: de 3 a 9 palabras y sin punto final; `tema` es uno de
    los de `verbos` o `general`;
  - `preguntas[]` `{ pregunta, opciones (4), correcta, es, tema, regla? }` para "Responde en inglés":
    - `tema` de conversación (`personal`, `familia`, `gustos`, `rutina`, `tiempo-fechas`, `lugares`,
      `cosas-colores`, `comida`, `clima`, `habilidades`, `cortesia`) o de tiempo (los 5 de `verbos`);
    - las de tiempo traen `regla`;
  - `tiempos[]` `{ sujeto, verbo, presente, pasado, resto, es, tema }` para ⏳ Máquina del tiempo (al menos 40):
    - `tema`: `regular` (pasado con -ed), `irregular` o `to be` (`verbo` = `be`; `presente` am / is / are; `pasado`
      was / were);
    - las tres oraciones salen de la plantilla `sujeto presente resto`, `sujeto pasado resto` y
      `sujeto will verbo resto`; por eso `resto` no lleva marcas de tiempo (yesterday, tomorrow, every…).
  - Grupos del selector de tema (`juegos/ingles-gramatica.js`): To be = `to be` + `to be pasado`; Presente = `to be`
    + `presente simple`; Pasado = `to be pasado` + `pasado simple`; Futuro (will) = `futuro will`. Los demás temas
    solo salen con «Todo».
- `espanol.json`:
  - `ortografia[]` y `acentos[]` `{ frase, opciones, correcta, regla?, explicacion }`;
  - `sinonimos[]` y `antonimos[]` `{ palabra, respuesta, distractores }`;
  - `oraciones[]` (texto).
- `cultura.json` (sección «🧠 Cultura y Conocimiento», cambio `cultura-conocimiento`; su forma la valida
  `server/cultura_datos_test.ts`):
  - `categorias[]` `{ id, titulo, emoji }`: `historia-mexico`, `cultura-mexico`, `historia-mundial`, `geografia`,
    `capitales`, `banderas`, `ciencias`, `naturaleza`, `cuerpo-humano`, `arte`, `matematicas`, `tecnologia`, `ia` y
    `deportes`;
  - `preguntas[]` `{ cat, nivel (1–3), pregunta, opciones (4, sin repetir), correcta (0–3), dato }` para 🏃 Maratón de
    cultura: al menos 768 en total, 50 por categoría y 10 por nivel; `dato` es breve (máx. 160 caracteres), verificable
    y se muestra al responder; sin preguntas repetidas;
  - `linea` para 📜 Línea del tiempo:
    - `temas[]` `{ id, titulo, emoji }`: `historia-mexico`, `historia-universal`, `inventos` y `ciencia` (iguales a
      `TEMAS_LINEA` de `server/salas.ts` sin `todos`);
    - `sets[]` `{ tema, titulo, sucesos[] }`: al menos 5 sets por tema, cada uno con 6 a 8 sucesos
      `{ txt (máx. 80), anio (entero; negativo = antes de Cristo), dato (máx. 140) }`, sin años repetidos dentro del
      set (así cualquier selección tiene un solo orden correcto).
- `basta.json`: `{ es, en }`, cada uno con:
  - `categorias[]` `{ id, titulo, emoji }`;
  - `letras[]` que pueden salir;
  - `palabras{ <categoria>: [...] }`, el diccionario para verificar respuestas; se compara sin
    mayúsculas ni acentos, y la ñ cuenta aparte; de aquí salen también los ejemplos y las respuestas de los bots;
  - `soloAceptar{ <categoria>: [...] }` (opcional): palabras de España que valen como respuesta pero nunca se
    muestran (cambio `basta-mexicano`).
  - Además, en la raíz, `extras[]` `{ id, titulo, emoji, palabras[] }`: las 10 categorías divertidas que se pueden
    sumar (cambio `basta-divertida-una-robo`). `palabras` es un banco pequeño que sirve de diccionario y de respuestas
    de los bots. Los ids deben ser iguales a `EXTRAS_BASTA` de `server/salas.ts` (lo revisa `server/basta_una_test.ts`).
- `loteria.json`: `cartas[]` `{ n, es, en, emoji, verso }`.
  - 54 cartas, con versos originales.
  - "El Ajolote", "El Colibrí" y "El Tlacuache" sustituyen a tres cartas tradicionales poco apropiadas
    para menores.

## Inglés en Postgres (Supabase, cambio `ingles-grupos`)

- El proyecto Supabase *Portafolio* es compartido con el portafolio. Todas las tablas de Inglés llevan el prefijo
  `stald_` en `public` y tienen RLS sin políticas, así que solo la llave de servicio (Deno) las lee.
  - Las tablas `stald_test_*` son para pruebas E2E.
  - Definición: `supabase/migrations/001_stald_ingles.sql`.
- `stald_docs(path, data jsonb, version, actualizado)`: documentos 1 a 1 con el repo de datos.
  - Rutas: `alumnos.json`, `resultados/<item>/<slug>.json` y `avance/<slug>.json`.
  - `version` es el `sha` de la concurrencia optimista.
  - La fila `meta/migrado` activa `PgStore`.
- `stald_grupos(id, nombre, nivel, horario, meet_url, color, activo, orden)`. El grupo inicial es `grupo-1`
  («Grupo 1»).
- `stald_inscripciones(alumno, grupo_id, desde, hasta)`:
  - `alumno` es el slug del nombre, la misma llave que `resultados/`;
  - solo puede haber una inscripción vigente (`hasta` null) por persona;
  - quien no tiene inscripción cuenta en el primer grupo activo.
- El contenido sigue en el repo: actividades, exámenes, semanas y ruta del profe. Una semana puede declarar
  `"grupos": ["<id>"]`; si no lo declara, aplica a todos.
- La migración se hace con `herramientas/migrar-ingles.ts`, con las opciones `--prueba`, `--delta`, `--forzar` y
  `--juegos`. El repo de datos conserva la etiqueta `antes-de-postgres`.
- **Juegos en Postgres** (cambio `cierre-tecnico`):
  - `juegos/**` (salas, partidas por semana, perfiles, fotos e invitados) vive en `stald_docs` desde la marca
    `meta/migrado-juegos`;
  - ya no gasta del límite de la API de GitHub;
  - **no hay respaldo**: si Postgres falla, la ruta responde 503 en lugar de leer una copia vieja.
- **Identidad de Inglés:** `alumnos.json` es la única fuente (fase 2 de `cierre-tecnico`). Puede traer
  `origen: "notion"` en las personas que la fase 1 importó de Notion; hoy es solo informativo.

## Actividades semanales (repo privado `platform-STALD-data`)

Fuente canónica del formato. El contenido **incluye las respuestas** y por eso vive en el repo privado.

- `contenido/semanas/<lunes>.json`: `{ id, titulo, elementos: [{ id, tipo, fecha }] }`. Ritmo: martes y
  jueves `actividad`, viernes `examen`, sábado `refuerzo`, domingo `meet`. Una semana se puede subir por
  adelantado: es visible desde el **domingo anterior**, y lo que se abre el lunes se puede adelantar ese domingo
  (cambio `semana-desde-domingo`). Reglas de validación: `server/semana.ts`; flujo: skill
  `nueva-semana-ingles`.
- `contenido/actividades/<id>.json` y `contenido/examenes/<id>.json`:
  - Campos generales: `id`, `tipo`, `titulo`, `nivel`, `descripcion`, `disponibleDesde`, `fechaLimite`,
    `intentos` (actividad y refuerzo 2, examen 1), `preguntasPorIntento`.
  - `segundaOportunidad` (opcional, exámenes con `intentos: 2`): fecha AAAA-MM-DD posterior a `fechaLimite` en la que
    abre el 2.º intento con una selección nueva de preguntas; entre ambos el estado es `en-espera` y cuenta la mejor
    (cambio `examen-segunda-oportunidad`). La ruta del profe no espera.
  - `prorrogas` (opcional): `{ "<slug-alumno>": "AAAA-MM-DD" }`, la fecha límite propia de un alumno o alumna
    (p. ej. quien se integra tarde). No adelanta `disponibleDesde`. El slug es el de `resultados/`, nunca el correo.
  - `alumnos` (opcional): `["<slug>", …]`. Solo esas personas ven y abren el elemento (examen exclusivo, cambio
    `examen-secundaria`). Las demás no lo ven en su lista y reciben 404 al abrirlo. Sin el campo, lo ve todo el
    ámbito.
  - `porSecciones` (opcional, `true`): las preguntas salen agrupadas por tema en el orden de `temas`, con un
    encabezado por sección, y se barajan solo dentro de cada sección (cambio `examen-por-secciones`).
  - `temas[]`: con `retroalimentacion` por estado.
  - `teoria[]`: `{ titulo, texto?, tabla?: { columnas, filas }, puntos?, ejemplos?: [{ en, es }] }`.
  - `tips[]`: `{ tipo: "libreta" | "video", texto, url? }`. Los videos son enlaces de **búsqueda** de YouTube.
  - `banco[]`: ejercicios `{ id, tema, tipo: "opcion" | "escribir" | "pronunciar" | "ordenar" | "emparejar",
    enunciado, opciones? + correcta? | aceptadas? | frase? | palabras? + distractores? | pares?, audio?, explicacion }`.
    - `audio` (opcional, cualquier tipo): texto que la página lee en voz alta (en-US, 🔊 normal y 🐢 lento). Es
      público; úsalo en práctica (pares mínimos), no donde revele la respuesta de un examen.
    - `pronunciar`: `frase` (pública) que se dice en voz alta; la respuesta es lo reconocido o `auto:ok` /
      `auto:repetir` (cambio `pronunciacion`).
    - `ordenar` (armar la oración tocando fichas, cambio `ejercicios-ordenar-emparejar`): `palabras` (≥ 2, en el
      orden correcto), `distractores?` (fichas que sobran) y `aceptadas?` (otros órdenes válidos). Las fichas no se
      repiten entre `palabras` y `distractores`. La página recibe solo `fichas` barajadas. La respuesta es el texto
      de las fichas unidas por espacios. Con `audio`, sirve de dictado de escucha:
      `{ "id": "o1", "tema": "futuro", "tipo": "ordenar", "enunciado": "Ordena: Yo voy a viajar mañana",
      "palabras": ["I", "will", "travel", "tomorrow"], "distractores": ["going"], "aceptadas": ["Tomorrow I will
      travel"], "explicacion": "…" }`.
    - `emparejar` (unir pares): `pares` (3 a 6 pares `[izquierda, derecha]`, sin textos repetidos en cada lado). La
      página recibe `izquierda` en orden y `derecha` barajada. La respuesta es un arreglo con la opción de la derecha
      elegida para cada elemento de la izquierda (`""` si falta). Es correcta solo si coinciden todos:
      `{ "id": "m1", "tema": "demostrativos", "tipo": "emparejar", "enunciado": "Une cada palabra con su
      significado", "pares": [["this", "este / esta"], ["these", "estos / estas"], ["that", "ese / esa / aquel"],
      ["those", "esos / esas"]], "explicacion": "…" }`.
  - Refuerzo: `bancoDe[]`, `basadoEn` (examen de la semana), `respaldo` (diagnóstico) y `mapeoTemas`.
  - Meet: `meetUrl` y `hora`. Además, para la clase del domingo, el material del profe: `guion` (solo admin),
    `teoria`, `tips` y `presentacion.diapositivas` (solo admin), con tipos `portada`, `agenda`, `retro`
    (grupal, sin nombres), `teoria` (con `ref` al índice de la teoría), `practica`, `juego`, `libreta` y `cierre`.
    Desde el cambio `meet-sin-reto` el Meet **no lleva `banco` ni reto**: alumnos y alumnas solo ven el enlace.
    (El motor aún acepta `banco` y la diapositiva `reto` en Meet viejos.)
- `juegos/semanas/<lunes>/<id-jugador>.json`: partidas de la semana. Cada partida puede llevar `modo: "sala"` y `sala`
  (multijugador); sin `modo` es individual. `totalIndividual` y `totalPartidas` suman **todas** las partidas de su
  tipo y `total` es la suma de ambos (cambio `puntos-por-tipo`); `mejores` guarda el récord por juego.
  - `{ id, nombre, tipo, partidas: [{ juego, puntos, aciertos, total, segundos, en }], mejores, total }`.
  - Sin correos. Guarda hasta 1,000 partidas (los totales salen del historial).
- `juegos/salas/<código>/sala.json` `{ codigo, juego, opciones, seed, host, creada, inicio, bots, canal? }` (en las
  carreras de Arcade, `opciones.mapa` = nivel o pista; el archivo de cada jugador lleva `carrera: { ms, monedas, t }`) y
  `juegos/salas/<código>/<id-jugador>.json` `{ id, nombre, tipo, unido, respuestas, palabras?, basta?, rondasBasta?, v? }`.
  Juegos para salas grandes (`juegos-salas-grandes`): `sala.opciones.figura` (Bingo: `linea`|`esquinas`|`lleno`),
  `sala.opciones.gana` (Memorama: `tiempo`|`errores`) y `sala.secreto` (Dibuja: hex de 24, se crea al empezar; de él sale
  la palabra de cada turno y nunca se envía). Por jugador: `bingo?: { t, n }`, `bingoFalsos?`, `dibujo?: { turno,
  trazos: [{ c, g, p }], t }` (solo quien dibuja), `aciertos?: { "<turno>": { t, pts } }`, `intentos?: [{ turno,
  texto? | casi: true, t }]` (últimos 20) y `resultado?: { ms, fin, errores?, pares?, encontradas?, t }`. Sin correos.
  - `canal`: topic secreto de Supabase Realtime; nunca sale en las respuestas. `v`: versión del jugador, sube en
    cada guardado (cambio `salas-realtime`).
  - En Basta por rondas (`opciones.rondas`: 5, 10 o 12), `rondasBasta{ <ronda>: { palabras, basta? } }`.
    `opciones.extra` (opcional) = ids de las categorías divertidas separados por coma, p. ej. `"pokemon,antojito"`;
    sus palabras van en `palabras` con el id como clave (cambio `basta-divertida-una-robo`).
    Las letras (sin repetir) y el calendario de rondas salen de la semilla y de las horas de `basta`.
  - Partidas multijugador. Cada jugador escribe solo su archivo y no hay correos.
  - Las salas vencen a las 3 h y se pueden borrar sin afectar el ranking.
  - Al terminar, el archivo de cada jugador guarda `final`, y el del host, además, `podio`.
  - En ¡Una!, `jugadas[]` `{ n, accion, carta, color, t }` (hasta 600) y `unas[]` `{ paso, t }`, el botón
    UNA con su hora. El mazo y el reparto salen de la
    semilla.
  - En póker (cambio `poker`), `jugadas[]` `{ n, accion, monto?, t }`, con `accion` de
    `retirarse | pasar | igualar | subir | todo`. `opciones.equipos: "1"` divide la mesa en A/B. La mano `k`
    sale de la semilla (`poker-mano-k`).
  - En Ajedrez, `jugadas[]` `{ n, accion: "mover" | "rendirse", de?, a?, promo?, t }` y `opciones.reloj`
    (minutos por jugador, cambio `ajedrez`).
  - En Futbolito, `jugadas[]` `{ n, accion: "tiro" | "rendirse", pos?, angulo?, fuerza?, barra?, t }` (`barra` 0…7 y
    `opciones.formato` `1v1` | `2v2`; el archivo del jugador puede llevar `equipo` 0 | 1, la preferencia pedida en la
    sala de espera; cambio `futbolito-equipos-controles`); en Billar,
    `{ n, accion: "tiro" | "rendirse", angulo?, fuerza?, efecto?, t }` (cambio `futbolito-billar`). El triángulo del
    billar sale de la semilla (`billar-triangulo`); los tiros de bots y los automáticos, de `bot|<paso>` y `auto|<paso>`.
  - En Fútbol Estelar en línea (`futbol`, cambio `futbol-en-linea`; mesa 1 vs 1 sin bots) el archivo del jugador
    puede llevar `tactica` `{ formacion: "4-4-2" | "4-3-3" | "3-5-2" | "5-3-2", linea, ancho, mentalidad, presion }`
    (enteros 0–100, elegida en la sala de espera) y `futbol` `{ goles: [anfitrión, invitado], ms, corte?, t }`, el
    primer resultado que vio (solo uno por persona). El partido no se guarda: viaja por el canal en vivo de la sala
    (`juegos/en-vivo.js`) sin datos personales (solo ids de asiento y números del partido).
  - En Karts y Axo (`karts` y `plataformas`, cambio `personaje-en-salas`) el archivo del jugador puede llevar
    `personaje`, uno de los ids de `Personajes.LISTA` (`juegos/personajes.js`, fuente única), elegido en la sala de
    espera. Sin datos personales.
  - En Golf (cambio `golf`), `jugadas[]` `{ n, accion: "tiro" | "rendirse", angulo?, fuerza?, t }`. Los 3 hoyos de la
    sala salen de la semilla (`golf-hoyos`) y los tiros automáticos por tiempo, de `auto|<paso>`.
  - En Brisca, `jugadas[]` `{ n, accion: "jugar", carta, t }`. En Conquián, `jugadas[]` `{ n, accion, carta?, con?, a?, t }`.
  - Clásicos rápidos (cambio `clasicos-rapidos`), `jugadas[]`: Gato `{ n, accion: "marcar", casilla, t }`, Conecta 4
    `{ n, accion: "soltar", col, t }`, Piedra-papel-tijera `{ n: ronda, accion: "elegir" | "pasar", eleccion?, t }`,
    Ahorcado `{ n, accion: "letra" | "pasar", letra?, t }` (con `opciones.modo` `compite` | `coop`) y Serpientes
    `{ n, accion: "tirar", t }`. Las palabras del Ahorcado y el dado salen de la semilla.
    El mazo sale de la semilla (`brisca-mazo` y `conquian-mazo`), según el cambio `cartas-espanolas`.
  - Juegos de tablero (cambio `juegos-tablero`):
    - en Damas, `jugadas[]` `{ n, accion: "mover" | "rendirse", ruta?, t }` (`ruta`: casillas oscuras 0–31);
    - en Dominó, `jugadas[]` `{ n, accion: "jugar", ficha, lado, t }`; el reparto sale de la semilla (`|domino`);
    - en Parchís, `jugadas[]` `{ n, accion: "mover", ficha, t }`; el dado del tiro `k` sale de la semilla (`|dado|k`);
    - en Batalla naval, `flota` (5 barcos con sus casillas 0–99) y `flotaT` (hora en que se acomodó), y `jugadas[]`
      `{ n, accion: "disparar" | "rendirse" | "reclamar", c?, r?, barco?, t }`. El resultado `r` lo pone el
      servidor. **`flota` es privada:** solo la recibe su dueño mientras se juega (ver `vistaJugadores` en
      `server/tablero.ts`).
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
- `juegos/progreso/<juego>/<id-jugador>.json` (cambio `juegos-plataformas-karts`): `{ v, datos, actualizado }`, avance
  individual de los juegos de Arcade, sin correos; `v` sube en cada guardado (escritura condicional). `datos`, con
  forma exacta y ≤ 4096 bytes:
  - `plataformas`: `{ mundo 1–12, nivel 1–3, vidas 0–99, monedas 0–99, poder "base"|"grande"|"fuego",
    completados ["m-n"] (≤ 36, sin repetir), mejores { "m-n": segundos 1–999 }, enCurso: null | { nivel "m-n",
    checkpoint } }`. `mundo`/`nivel` es el nivel más lejano desbloqueado; `enCurso`, el nivel a medias (y si tocó la
    bandera).
  - `karts`: `{ copas { <copa>: { lugar 1–8, puntos 0–60 } }, records { <pista>: ms 10000–900000 },
    piezas ["chasis-ligero"|"llantas-todoterreno"|"pintura-dorada"], equipo { chasis "estandar"|"ligero",
    llantas "estandar"|"todoterreno", color }, copaEnCurso: null | { copa, carrera 0–3, puntos [8 × 0–60], dif 80–110 } }`.
    Una pieza equipada debe estar en `piezas` (el color `dorado` pide `pintura-dorada`). `puntos` sigue el orden de
    los corredores (0 = el jugador). Cambio `karts-pistas-grandes`: forma versionada con dos llaves más,
    `pistasV: 2` (versión de los trazados, `KartsPistas.VERSION_PISTAS`) y `recordsV1 { <pista>: ms }` (récords
    archivados de las pistas chicas, se muestran como «pista chica»); `records` son los de las pistas grandes. El
    servidor acepta también la forma anterior de 5 llaves (pestañas viejas); al abrirla, el juego la migra y la guarda.
  - `dragon-run` (cambio `dragon-run-misiones`): `{ totales { metros 0–10000000, monedas 0–1000000, esquivados
    0–10000000, carreras 0–1000000, castillos 0–1000000, dobles 0–10000000 }, mejorRacha 0–999, dias { ultimo:
    null | "AAAA-MM-DD", racha 0–3660, mejor 0–3660 }, diaria: null | { fecha "AAAA-MM-DD", avance [3 × 0–100000] },
    cumplidas 0–100000, premios [ids sin repetir], equipo { color, estela } }`.
    - `totales` acumula todas las carreras; `mejorRacha` es el máximo de obstáculos esquivados seguidos en una carrera
      (un golpe la reinicia); `dias` cuenta días seguidos jugando (`racha ≤ mejor`; sin `ultimo`, `racha` 0).
    - `diaria.avance[i]` es el avance de la misión `i` del día `fecha`; las 3 misiones no se guardan: salen de
      `misionesDelDia(fecha, id-jugador)` en `juegos/dragon-misiones.js` (deterministas). `cumplidas` cuenta misiones
      diarias cumplidas en total.
    - `premios` ⊂ `color-azul|morado|rojo|rosa|dorado|noche`, `estela-estrellas|burbujas|hojas|arcoiris` (cosméticos,
      sin valor); `equipo.color` ∈ `verde` + colores y `equipo.estela` ∈ `fuego` + estelas, y lo equipado debe estar
      en `premios` (salvo `verde` y `fuego`). Fechas reales; llaves exactas.
  - `golf` (cambio `golf`): `{ mejores { "1"…"9": golpes 1–20 }, estrellas { "1"…"9": 0–3 }, recorridos 0–100000,
    mejorRecorrido: null | 9–200 }`. Llaves de hoyo `"1"`…`"9"` (las que falten = hoyo sin terminar); `mejores` es el
    menor número de golpes con la pelota adentro (una recogida no cuenta), `estrellas` la mejor marca (3 bajo par, 2
    en par, 1 terminado), `recorridos` los recorridos de 9 hoyos terminados y `mejorRecorrido` su menor total.
  - `futbol` (cambio `futbol-estelar`): `{ stats { partidos, ganados, empatados, perdidos, gf, gc, copas (0–1000000) },
    clasif: null | { semana "AAAA-Www", mejor 0–1000, jugados }, tactica { formacion "4-4-2"|"4-3-3"|"3-5-2"|"5-3-2",
    linea, ancho, mentalidad, presion (0–100) }, carrera: null | { semilla 1–2147483647, club { nombre, corto (3
    mayúsculas), escudo { forma, c1, c2, simbolo }, uniforme { c1, c2, patron }, estadio }, temporada 1–99,
    divisiones [[8],[8],[8]] (0–23 del universo y 24 = tu club, sin repetir), jornada 0–14, resultados [[gf, gc]]
    (uno por jornada jugada, 0–20), dinero 0–9999999, plantilla [[id, ajuste −20…20, carta | null]] (14–20, ids
    `u<club>-<n>` del universo o `g<n>` generados, sin repetir), cartas [sin repetir], ojeador [hasta 3 `g<n>`],
    ojeadas 0–9999, copa null | { ronda 0–3, viva }, palmares { ascensos, ligas, copas } } }`. Nombre del club y del
    estadio: 2–24 letras, números, espacio y `.'-` (los escribe la persona; se escapan al pintarlos); colores `#rrggbb`.
    La tabla no se guarda: se reconstruye con la semilla y tus resultados (`FutbolLiga.tablaDivision`).
- `juegos/nicks.json`: `{ "<id-jugador>": "<nick>" }`, sin correos (cambio `nick-jugadores`). El nick reemplaza al
  nombre en Juegos (chip, ranking y partidas); el admin ve ambos en «🛡️ Admin › Jugadores».
- `juegos/invitados.json`: `{ "<correo>": { nombre, registradoEn, ultimaVisita, visitas } }`.
  - Son los únicos correos que guarda el repo de datos. El invitado aceptó el aviso al registrarse.
  - Solo el admin los ve (`/juegos/invitados` y `/juegos/jugadores`, que suma alumnos, alumnas y registros
    pendientes de las cuentas de acceso), en la pestaña «🛡️ Admin» de `juegos.html`.
- `contenido/profe/`: ruta de estudio del profe (cambio `ruta-profe`), mismo formato que `contenido/`:
  - `plan.json`: `{ titulo, subtitulo, nivelActual, meta, horizonte, horasSemana, reparto[], rutinaDiaria[], reglas[],
    semanas[{ id, n, titulo, objetivo, temas[], busuu, extra, elementos[{ id, tipo, titulo, fecha }] }] }`;
  - `semanas/<lunes>.json`, `actividades/profe-act-<fecha>.json` y `examenes/profe-examen-<fecha>.json`;
  - resultados en `resultados/<id>/profe.json` (alumno "Profe"), también para los elementos del grupo que resuelve
    antes que ellos; esos archivos se excluyen de todas las vistas de resultados del grupo.
- `contenido/secundaria/`: exámenes de Secundaria (cambio `examen-secundaria`), mismo formato que `contenido/`:
  - `semanas/<lunes>.json` y `examenes/<id>.json`;
  - se ven en `ingles.html?modo=secundaria` (enlace «📝 Exámenes» de `secundaria.html`) y el servidor los atiende
    en `/secundaria/actividades`;
  - la identidad es el primer nombre de la persona en las filas de Secundaria; su slug es el de `alumnos` y
    `resultados/`;
  - resultados en `resultados/<id>/<slug>.json`, en Postgres igual que Inglés; con `intentos: 2` y sin
    `segundaOportunidad`, el 2.º intento abre de inmediato y cuenta la mejor;
  - generador del examen mensual: `herramientas/secundaria-<AAAA-MM>/`.
- `alumnos.json`: `{ "<correo>": { nombre, alta, inicio?, origen? } }`, el registro de alumnos y alumnas de Inglés:
  altas desde `ingles.html` (cambio `alta-alumnos`) y personas importadas de Notion (`origen: "notion"`, cambio
  `cierre-tecnico`). Es la única fuente de identidad de Inglés. Solo el admin ve los correos.
  - `inicio` (`AAAA-MM-DD`): el lunes siguiente al alta (cambio `inicio-lunes-alumnos`). Las actividades que
    vencen antes no aparecen. Las personas importadas de Notion no llevan `inicio` (ya llevaban el curso).
- `borradores/<id>/<slug-alumno>.json`: `{ intento, respuestas, actualizado }`, el avance del intento abierto de
  Inglés, la ruta del profe o Secundaria. Vive en Postgres, como `resultados/`, y se borra al enviar el intento
  (cambio `borrador-en-servidor`). Sin correos.
- `avance/<slug-alumno>.json`: historial de las marcas de tareas de Notion de Inglés. Desde la fase 2 de
  `cierre-tecnico` nadie lo escribe; se conserva como historial.
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
