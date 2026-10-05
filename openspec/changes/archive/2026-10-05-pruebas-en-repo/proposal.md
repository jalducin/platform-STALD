## Why

Las ~200 pruebas unitarias del servidor viven en el repo (`server/*_test.ts`), pero **nadie las corre de forma
automática**: un PR puede romperlas sin que nadie lo note. Las pruebas E2E (Node + Playwright) que cubren el portal,
el inicio de sesión, Inglés y los juegos viven **fuera del repo**, en una carpeta temporal del agente, con rutas
absolutas de una sola máquina. Si esa carpeta se borra, se pierden; y nadie más puede repetirlas.

## What Changes

- **`tests/e2e/`**: copia versionada de las pruebas E2E vigentes (Inglés, inicio de sesión, portal, juegos y salas),
  sin rutas absolutas:
  - configuración por variables de entorno (`BASE`, `API`, `CHROME`, `DATOS`, `DATA`, `SALIDA`) con valores por
    omisión razonables, centralizada en `tests/e2e/lib/entorno.js`;
  - las capturas y salidas van a `tests/e2e/salida/` (ignorada por git);
  - las que usan Postgres de prueba (`stald_test_*`) leen la llave **solo** de variables de entorno;
  - `tests/e2e/package.json` con `playwright` como dependencia de desarrollo.
- **`tests/e2e/correr.sh`** (bash; Git Bash en Windows y Linux): copia los datos desde `--datos <repo privado>`,
  levanta el servidor y los estáticos en puertos configurables, corre los E2E elegidos (o todos), resume
  PASS/FAIL, apaga y limpia. Con `--pg` corre las de Inglés contra las tablas `stald_test_*` y las vacía al final.
- **`tests/fixtures/rows-fixture.json`**: filas simuladas de Notion (solo correos `@example.com`).
- **CI** `.github/workflows/pruebas.yml`: en cada push a `main` y en cada PR corre `deno test -A server/`,
  `deno check server/main.ts` y `deno lint server/`. Las E2E **no** corren en CI porque necesitan el repo privado
  de datos (datos de alumnos y alumnas) y no deben subirse a un runner público.
- **`docs/pruebas.md`**: cómo correr unitarias y E2E, convenciones, sesión de prueba, tablas `stald_test_*` y
  limpieza; una línea en el índice de documentación del README.

## Capabilities

### New Capabilities
- `pruebas`: pruebas automatizadas versionadas (unitarias en CI y E2E reproducibles en local).

## Impact

- Superficies: ninguna página ni el servidor cambian. Se agregan `tests/`, `.github/workflows/pruebas.yml`,
  `docs/pruebas.md`, una línea del README y una entrada de `.gitignore`.
- Privacidad: el repo es público. No se versionan datos del repo privado, correos reales ni llaves. Las pruebas
  solo usan correos `@example.com` y la sesión de prueba (`Bearer prueba:<correo>`) que el servidor acepta
  únicamente con `ROWS_FIXTURE`.
- Acciones externas:
  - (usuario) La primera corrida del workflow se verá en el PR; si GitHub pide aprobar workflows, aprobarla.
  - (usuario, opcional) Marcar el job "Pruebas del servidor" como check requerido en la protección de `main`.
