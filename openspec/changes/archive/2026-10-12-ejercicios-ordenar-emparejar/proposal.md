## Why

El profe quiere actividades de Inglés más didácticas, al estilo de Busuu o Duolingo, sin usar IA (por costo).
Hoy el motor solo tiene ejercicios de opción múltiple (`opcion`), respuesta escrita (`escribir`) y pronunciación
(`pronunciar`). Faltan dos dinámicas muy comunes en esas apps: **armar la oración tocando fichas** y **unir pares**.

## What Changes

- **Motor (cualquier ámbito: Inglés, Ruta del profe y Secundaria):**
  - tipo nuevo `ordenar`: `palabras` (en el orden correcto), `distractores` opcionales y `aceptadas` opcionales
    (otros órdenes válidos). La página recibe `fichas` = `palabras` + `distractores` **barajadas en el servidor**
    de forma determinista por alumno o alumna e intento; nunca el orden correcto. La respuesta es el texto de las
    fichas unidas por espacios y se califica con la normalización existente (`normalizeText`);
  - tipo nuevo `emparejar`: `pares` (3 a 6). La página recibe `izquierda` (en orden) y `derecha` (barajada en el
    servidor). La respuesta es un arreglo con la opción de `derecha` elegida para cada elemento de `izquierda`;
    es correcta solo si coinciden todos los pares;
  - saneo, texto de la respuesta y de la correcta (revisión, guion o retro y resumen del admin), validación del
    contenido (`validateItem`, que usa también `server/validar_semana.ts`), intento de corrección y borrador en
    el servidor funcionan con los dos tipos;
  - el `audio` opcional (🔊 / 🐢) también aplica: un `ordenar` con `audio` sirve como dictado de escucha.
- **Página (`ingles.html`, `ingles/reproductor.js`):**
  - `ordenar`: fichas como botones; al tocar una pasa a la línea de respuesta y al tocarla ahí regresa; botón
    «Borrar»;
  - `emparejar`: se toca un elemento de la izquierda y luego uno de la derecha; los pares quedan marcados con color
    y número, y se pueden deshacer;
  - ambos accesibles con teclado y lector de pantalla, cómodos en un celular de 390 px, con autoguardado local y
    en la cuenta, modo paso y vista previa del admin.

## Capabilities

### Modified Capabilities
- `actividades-online`: tipos de ejercicio `ordenar` y `emparejar`.

## Impact

- **Superficies:** `ingles.html` (reproductor de Inglés, Ruta del profe y Secundaria) y servidor Deno
  (`server/motor.ts`, `server/actividades.ts`). No toca `index.html`, `juegos.html`, `secundaria.html`,
  Postgres/Realtime/Auth de Supabase ni Notion.
- **Contrato HTTP:** `GET /ingles/actividades/<id>` (y sus equivalentes del profe y de Secundaria) agrega
  `fichas` a los ejercicios `ordenar` e `izquierda` / `derecha` a los `emparejar`; nunca `palabras`,
  `distractores`, `aceptadas` ni `pares`. Los demás tipos no cambian. La única página consumidora es `ingles.html`.
- **Repo de datos:** formato nuevo opcional en los bancos; el contenido existente no cambia.
- **Privacidad / matriz de acceso:** sin datos personales nuevos. Las respuestas siguen guardándose como hoy
  (resultado y borrador por alumno o alumna); quién ve qué no cambia.
- **Acciones externas:** redeploy de Deno Deploy y publicación en Pages con el merge a `main` (integrador);
  cargar contenido con los tipos nuevos en el repo de datos (profe, con la skill `nueva-semana-ingles`).
