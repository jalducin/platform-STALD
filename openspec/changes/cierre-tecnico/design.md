## Decisiones

### 1. Prefijos activos en `PgStore`
- Firma nueva: `new PgStore(db, base, prefijos)`.
  - `prefijos` es la lista de rutas o prefijos que viven en Postgres.
  - Inglés: `alumnos.json`, `resultados/` y `avance/`.
  - Juegos: `juegos/`.
- `main.ts` lee las dos marcas cada 60 s y arma la lista:
  - `meta/migrado` → Inglés;
  - `meta/migrado-juegos` → `juegos/`.
- Sin ninguna marca se usa el almacén base, que es GitHub.
- `esRutaPg(path, prefijos)` pasa a ser una función pura y probada.

### 2. Sin respaldo
- `PgStore.get`, `list` y `put` propagan los errores de Postgres. Las rutas responden 503 con el manejo de errores
  que ya existe; la página muestra «intenta de nuevo».
- Se quita el sha `gh:`.

### 3. Migración de Juegos
- `migrar-ingles.ts --juegos`:
  - recorre `juegos/**/*.json`;
  - usa los mismos modos `--prueba`, normal (copia y marca `meta/migrado-juegos`) y `--delta`;
  - en `--delta` de Juegos solo inserta lo que falta, porque las salas cambian sin versión comparable.
- Se corre en un momento sin partidas activas y antes se comprueba que no haya salas vigentes; las salas vencen a
  las 3 h.

### 4. Inglés sin Notion
- `importarNotion(registro, filasNotion, ahora)` es una función pura:
  - por cada fila de Notion con `alumno` y correo en `userEmails`, si el correo no está en el registro, lo agrega
    como `{ nombre, alta: ahora, origen: "notion" }`;
  - nunca pisa ni borra.
- **Fase 1:**
  - `GET /ingles/alumnos` (admin) lee Notion, calcula la importación y, si hay algo nuevo, escribe el registro;
  - la respuesta incluye `importados: n`;
  - Inglés sigue leyendo Notion.
- **Fase 2:**
  - `filasIngles()` = `aplicarAlumnos([], registro)`, sin Notion;
  - `handleAlumnos` recibe `filas: () => []`;
  - la ruta de marcar clases de Notion (`/ingles/data/<id>/completado`) queda sin filas de Inglés y responde
    404 como siempre que no encuentra la fila;
  - Secundaria no cambia.
  - Antes de publicar la fase 2, en Postgres se confirma que `alumnos.json` tiene una entrada con correo por cada
    alumno o alumna de Notion que tenía correo.

## Pruebas
- Unitarias:
  - `esRutaPg` con prefijos;
  - `PgStore` con y sin `juegos/` activo;
  - errores propagados, sin respaldo;
  - `importarNotion`: agrega solo con correo, no duplica, no pisa, sin `inicio`, con origen `notion`;
  - fase 2: `filasIngles` sin Notion conserva la identidad del registro.
- Migración `--juegos` contra `stald_test_*`: conteos, 3 documentos idénticos, marca, segunda corrida rechazada y
  delta idempotente.
- E2E de juegos en modo Postgres de prueba: juegos, partidas, salas en tiempo real, póker, cartas, ajedrez y
  ajustes de salas.
- Producción:
  - migración de Juegos con cuadre;
  - fase 1 con verificación del registro;
  - fase 2 con verificación de que las personas de Notion siguen entrando (perfil 200 por la transición o con sesión).
