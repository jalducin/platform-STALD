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
- **Fase 2** (post-apply, rama `feature/ingles-sin-notion-fase2`):
  - `filasIngles()` = `aplicarAlumnos([], registro)`: la identidad de Inglés sale solo del registro; el servidor
    ya no consulta la base «📖 Clases Inglés» de Notion;
  - `handleAlumnos` recibe `filas: () => Promise.resolve([])`; la lista del admin muestra solo el registro;
  - se retira la importación de la fase 1 en `GET /ingles/alumnos` (ya no hay qué leer) junto con
    `importarNotion`;
  - se retira la ruta para marcar tareas de Notion (`POST /ingles/data/<id>/completado`) y `server/completar.ts`:
    sin filas de Notion de Inglés no hay qué marcar. La URL responde 404 `not_found`, como cualquier ruta
    inexistente (antes, una fila no encontrada respondía 403 `sin_acceso`; con la ruta retirada ya no aplica).
    Los `avance/<alumno>.json` que ya existen se quedan como historial; nadie más los escribe;
  - `GET /ingles/data` sigue: devuelve solo las filas de identidad del registro (`source: "registro"`), que la
    página usa para saber quién entra y si es admin. Ya no trae tareas de Notion;
  - código que queda muerto y se quita: `filasNotion`, `marcasFixture`, `parcheCompletado`,
    `CLASES_INGLES_DB_ID`, `extractInglesRow`, `sinHuerfanas` e `importarNotion`. `loadRows` queda solo para
    Secundaria. El tipo `InglesRow` se conserva (lo usan perfil, Juegos y el resumen); el campo `origen: "notion"`
    del registro también, porque así quedaron guardadas las personas importadas;
  - páginas de Inglés (`ingles/*.js`): dejan de dibujar lo que venía de Notion (botones «Marcar hecha»,
    «📓 Calificaciones de Notion», «⭐ Última actividad calificada en Notion», tareas 📓 en «Para hoy» y en la
    línea de la semana); los bloques del admin salen del registro; los textos dejan de mencionar Notion;
  - Secundaria no cambia: sigue leyendo su base de Notion.
  - Antes de publicar la fase 2, en Postgres se confirma que `alumnos.json` tiene una entrada con correo por cada
    alumno o alumna de Notion que tenía correo (hecho al cerrar 4.2).
- **Pruebas E2E en la fase 2:** las personas de ejemplo (Marisol, Angel, Jesus, Laura y Fernando, `@example.com`)
  dejan de venir de `tests/fixtures/rows-fixture.json` (que pierde la clave `ingles`) y pasan a
  `tests/fixtures/alumnos-ejemplo.json` (`correo → { nombre, alta, origen: "notion" }`). `correr.sh` lo **combina**
  con el `alumnos.json` de la copia de datos antes de arrancar el servidor: agrega solo los correos que falten y
  nunca pisa ni borra las entradas de la copia.

## Pruebas
- Unitarias:
  - `esRutaPg` con prefijos;
  - `PgStore` con y sin `juegos/` activo;
  - errores propagados, sin respaldo;
  - `importarNotion`: agrega solo con correo, no duplica, no pisa, sin `inicio`, con origen `notion`;
  - fase 2: `filasIngles` sin Notion conserva la identidad del registro;
  - fase 2 (integración en `main.ts`): con filas de Inglés en `ROWS_FIXTURE`, el servidor las ignora (la persona
    que solo está ahí no entra; la del registro sí), `GET /ingles/alumnos` no importa nada y
    `POST /ingles/data/<id>/completado` responde 404.
- E2E de la fase 2: suite completa antes (línea base) y después; las pruebas que dependían de tareas de Notion de
  Inglés se actualizan y se documenta cuáles y por qué.
- Migración `--juegos` contra `stald_test_*`: conteos, 3 documentos idénticos, marca, segunda corrida rechazada y
  delta idempotente.
- E2E de juegos en modo Postgres de prueba: juegos, partidas, salas en tiempo real, póker, cartas, ajedrez y
  ajustes de salas.
- Producción:
  - migración de Juegos con cuadre;
  - fase 1 con verificación del registro;
  - fase 2 con verificación de que las personas de Notion siguen entrando (perfil 200 por la transición o con sesión).
