## Decisiones

### 1. Estructura

```
tests/
  fixtures/rows-fixture.json   filas simuladas de Notion (solo @example.com)
  e2e/
    package.json               playwright (devDependency)
    correr.sh                  orquestador
    lib/entorno.js             configuración común (variables, carpeta de salida, sesión de prueba en fetch)
    e2e-*.js                   una prueba por archivo (sin el prefijo en el nombre corto: correr.sh poker)
    salida/                    capturas, .out y resumen (ignorada por git)
```

### 2. Qué pruebas se copian
- De la versión integrada más reciente (Sprint 2 + 3, con sesión de prueba): alta de alumnos, inicio en lunes,
  segunda oportunidad, pronunciación, grupo del profe, ruta del profe, diseño del profe, grupos, Inglés pro,
  login, login después de la transición, portal, juegos, partidas y enlace de sala.
- De la batería de juegos: conquián (estrés), clásicos, fusión, sudoku, dragon run, puntos por tipo, basta por
  rondas, lotería en sala, UNA en sala, UNA (robo), póker, cartas españolas, ajedrez, ajustes de salas, ritmo y
  avatar con foto.
- Se descartan: depuración (`dbg-*`), producción (`prod-*`, `e2e-prod`), versiones viejas de Inglés reemplazadas
  por la nueva página y las que tienen correos reales.

### 3. `lib/entorno.js` (cada prueba lo carga en su primera línea)
- Valores por omisión: `BASE=http://127.0.0.1:8795`, `API=http://127.0.0.1:8817`,
  `DATOS=<repo>/juegos/datos`, `SALIDA=tests/e2e/salida`. `CHROME` es opcional: sin él Playwright usa su
  Chromium (`npx playwright install chromium`).
- Crea `SALIDA` y hace `chdir` a ella: las capturas con ruta relativa caen ahí sin tocar cada `screenshot()`.
- Instala la sesión de prueba en `fetch` de Node: toda llamada a `API` con `?email=` lleva
  `Authorization: Bearer prueba:<correo>`. Antes cada archivo tenía esta línea copiada con el puerto 8787 fijo
  (código repetido); ahora vive en un solo lugar y sigue el `API` configurado.
- Las pruebas de juegos que solo guardaban `stald_email` ahora guardan también `stald_sesion_prueba`, para que
  sigan pasando después del 2026-10-12 (fin de la transición). Las de login no se tocan: prueban a propósito el
  correo viejo sin sesión.

### 4. `correr.sh`
- Opciones: `--datos <ruta>` (obligatoria), `--pg`, `--puerto-api` (8817), `--puerto-web` (8795), `--lista`, y
  nombres de pruebas (sin `e2e-` ni `.js`); sin nombres corre todas.
- Cada prueba tiene una **fase** que define cómo preparar datos y servidor:
  - `base`: copia limpia de datos; servidor normal;
  - `grupos` (solo `--pg`): la semana 2026-09-28 se asigna a `grupo-1`;
  - `pro` (solo `--pg`): copia y migración limpias;
  - `despues`: servidor con `LOGIN_TRANSICION_HASTA=2026-01-01`.
  Las pruebas corren agrupadas por fase; `grupos` y `pro` siempre reinician datos y servidor.
- Preparar datos: copia `--datos` a una carpeta temporal (`mktemp -d`), sin `.git`; borra los `profe.json` de
  resultados y los resultados del examen 2026-10-02 (las pruebas parten de cero). La carpeta original nunca se
  modifica.
- Servidor: `deno run -A server/main.ts` (o `npx -y deno` si no hay `deno`) con `DATA_DIR`,
  `ROWS_FIXTURE=tests/fixtures/rows-fixture.json`, `SUPER_ADMIN_EMAIL=admin@example.com`, `PERMITIR_HOY=1`. Sin
  `--pg` se vacían `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/`SUPABASE_PUBLISHABLE_KEY` para que nunca toque una base
  real. Estáticos: `python -m http.server --directory <repo>`.
- `--pg`: exige `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` en el entorno, fuerza `STALD_TABLAS=stald_test_` y se
  niega si alguien pasó otro prefijo. Como `stald_test_*` es compartida (otras ramas o agentes pueden estar
  probando contra ella), si al empezar tiene filas se detiene sin tocarla, salvo con `--pg-vaciar`. Antes de cada fase vacía `stald_test_*`, migra con
  `herramientas/migrar-ingles.ts` y crea `grupo-1`. Un `trap` en `EXIT`/`INT`/`TERM` apaga servidores, vacía
  las tablas y borra la copia de datos.
- Apagar: mata los PID lanzados y, por si `npx` dejó un proceso hijo, lo que escuche en los dos puertos
  (`netstat` + `taskkill` en Windows; `kill` en Linux).
- Resultado por prueba: `PASS` si el proceso sale con 0 y no hay líneas `FAIL`/`ERROR`. El script sale con 1 si
  alguna falla.

### 5. CI (`.github/workflows/pruebas.yml`)
- `on: push: branches [main]` y `pull_request`; `permissions: contents: read`; `concurrency` por rama con
  cancelación.
- `actions/checkout@v4` + `denoland/setup-deno@v2` (`v2.x`, igual que `vigilancia.yml`), y tres pasos: test,
  check y lint. Sin secretos: las pruebas unitarias usan dobles (`test_datos.ts`, `test_postgrest.ts`).
- Las E2E no corren en CI: requieren la copia del repo privado de datos (datos de alumnos y alumnas), que no debe
  viajar a un runner, y Chromium + dos servidores. Se corren en local antes de cada PR que toque páginas o
  servidor.

### 6. Fixture
`rows-fixture.json` tiene 6 correos, todos `@example.com`, nombres de pila de prueba ya presentes en las pruebas
del repo y `url` falsas: se versiona en `tests/fixtures/`.

## Alternativas descartadas
- **E2E con `@playwright/test`**: obligaría a reescribir ~30 pruebas; se conserva el formato actual (`PASS`/`FAIL`
  por línea) y se deja la migración para después si hace falta.
- **Datos sintéticos para correr E2E en CI**: las pruebas dependen del contenido real de semanas y exámenes;
  construir un repo de datos falso completo es un cambio aparte.
