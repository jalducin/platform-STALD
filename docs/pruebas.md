# Pruebas

Cómo correr las pruebas del proyecto, qué cubren y qué cuidar. Cambio de origen: `openspec/changes/pruebas-en-repo`.

| Tipo | Dónde | Quién las corre |
|---|---|---|
| Unitarias del servidor | `server/*_test.ts` | GitHub Actions en cada push a `main` y en cada PR (`.github/workflows/pruebas.yml`), y tú en local |
| E2E (navegador) | `tests/e2e/e2e-*.js` | Solo en local, con `tests/e2e/correr.sh` |

## Unitarias (Deno)

```bash
deno test -A server/          # o: npx -y deno test -A server/
deno check server/main.ts
deno lint server/
```

- No necesitan llaves ni red propia: usan dobles (`server/test_datos.ts`, `server/test_postgrest.ts`).
- 6 pruebas de `server/actividades_test.ts` se **omiten** si no hay `DATA_DIR`; para correrlas, apunta a una
  **copia** del repo privado de datos: `DATA_DIR=<copia> deno test -A server/`. `correr.sh` las corre solo como la
  prueba `actividades-datos` (cambio `pruebas-fecha-fija`), así que no se quedan sin revisar.
- El workflow **Pruebas** corre los tres comandos; si uno falla, el check del PR queda en rojo.

## E2E (Node + Playwright)

### Por qué no corren en CI
Necesitan una copia del **repo privado de datos** (contenido de las semanas, exámenes y resultados de alumnos y
alumnas) y el repo es público: esos datos no deben viajar a un runner. Además levantan dos servidores y Chromium.
Córrelas en local antes de abrir un PR que toque páginas o servidor.

### Preparar (una vez)

```bash
cd tests/e2e
npm install                     # instala playwright (devDependency)
npx playwright install chromium # o exporta CHROME=<ruta a chrome.exe / chromium> para usar uno ya instalado
```

Requisitos: Node, Deno (o `npx -y deno`), Python 3 (sirve los estáticos), curl y bash (Git Bash en Windows).

### Correr

```bash
bash tests/e2e/correr.sh --datos <copia local del repo privado de datos>             # todas
bash tests/e2e/correr.sh --datos <ruta> login portal juegos poker                     # algunas
bash tests/e2e/correr.sh --lista                                                      # pruebas y su fase
bash tests/e2e/correr.sh --datos <ruta> --puerto-api 8817 --puerto-web 8795           # puertos (por omisión)
bash tests/e2e/correr.sh --datos <ruta> --transicion-terminada poker                  # como tras el fin de la transición del login
bash tests/e2e/correr.sh --datos <ruta> --hoy 2026-10-11 ruta-profe                  # otro «hoy» del servidor (o --hoy real)
```

Qué hace `correr.sh`:
1. Valida argumentos y que los puertos estén libres (no mata procesos ajenos).
2. Copia `--datos` a una carpeta temporal, sin `.git`, y borra los `profe.json` de resultados y los resultados del
   examen 2026-10-02 (las pruebas parten de cero). **La carpeta original nunca se modifica.**
3. Levanta el servidor (`server/main.ts`) con `DATA_DIR=<copia>`, `ROWS_FIXTURE=tests/fixtures/rows-fixture.json`,
   `SUPER_ADMIN_EMAIL=admin@example.com`, `PERMITIR_HOY=1` y `HOY_FIJO=2026-10-04` (el día con el que se escribieron
   las E2E, para que no dependan del calendario; `--hoy` lo cambia), sin Notion ni GitHub, y los estáticos con
   `python -m http.server`. `HOY_FIJO` solo tiene efecto con `ROWS_FIXTURE`, nunca en producción.
   `rows-fixture.json` solo trae Secundaria y las cuentas de Supabase Auth: Inglés ya no lee Notion (cambio
   `cierre-tecnico`, fase 2). Antes de arrancar, superpone `tests/fixtures/datos/` (contenido de ejemplo) sobre la
   copia y **combina** `tests/fixtures/alumnos-ejemplo.json` (Marisol, Angel, Jesus, Laura y Fernando,
   `@example.com`) con su `alumnos.json`: agrega solo los correos que falten, sin pisar ni borrar los de la copia.
4. Corre las pruebas por **fase** (ver `--lista`); reinicia datos y servidor cuando la fase cambia.
5. Imprime `PASS`/`FAIL`/`OMIT` por prueba y el total; sale con 1 si alguna falla.
6. Siempre (también con error o Ctrl+C) apaga los servidores, vacía `stald_test_*` si usó `--pg` y borra la copia.

Todo lo que producen (`<prueba>.out`, capturas `.png`, `servidor-*.log`, `resumen.txt`) queda en
`tests/e2e/salida/`, ignorada por git.

### Postgres de prueba (`--pg`)
Las pruebas de Inglés pueden correr contra las tablas `stald_test_*` (mismo esquema que `stald_*`, ver
`supabase/migrations/001_stald_ingles.sql` y [data-model.md](data-model.md)). `grupos` e `ingles-pro` **solo**
corren así; sin `--pg` salen como `OMIT`.

```bash
export SUPABASE_URL=https://<proyecto>.supabase.co
export SUPABASE_SERVICE_KEY=$(supabase projects api-keys --project-ref <proyecto> -o json | python -c "import json,sys;print([x['api_key'] for x in json.load(sys.stdin) if x['name']=='service_role'][0])")
bash tests/e2e/correr.sh --datos <ruta> --pg
```

- La llave vive **solo** en el entorno del proceso; nunca en archivos ni en el repo.
- `correr.sh --pg` fuerza `STALD_TABLAS=stald_test_` y se niega si recibe otro prefijo: **nunca** toca `stald_*`.
- `stald_test_*` es **compartida** por todo el que pruebe contra ese proyecto: no corras dos baterías `--pg` a la
  vez. Si al empezar las tablas ya tienen filas, `correr.sh` se detiene sin tocarlas (otra corrida podría estar
  en curso); si sabes que son restos de una corrida cortada, repite con `--pg-vaciar`.
- Antes de cada fase de Inglés vacía `stald_test_*`, migra la copia con `herramientas/migrar-ingles.ts` y crea
  `grupo-1`. Al terminar las vacía e imprime cuántas filas quedan (debe ser 0).
- Limpieza a mano, si una corrida se cortó de golpe (p. ej. se cerró la terminal): borra las filas de
  `stald_test_inscripciones`, `stald_test_grupos` y `stald_test_docs`, en ese orden.

### Convenciones de las pruebas
- Un archivo por prueba (`e2e-<nombre>.js`), Node + `playwright` (sin `@playwright/test`). Cada línea de
  resultado empieza con `PASS` o `FAIL`; el proceso sale con 0 solo si no hay `FAIL`.
- La primera línea es `require('./lib/entorno')`: pone `BASE`, `API`, `DATOS` (por omisión `juegos/datos`) y la
  carpeta `SALIDA`, y se cambia a ella (las capturas usan rutas relativas). Nada de rutas absolutas ni puertos fijos.
- `DATA` (la copia de datos) la pasa `correr.sh`; las pruebas de Inglés leen de ahí actividades y exámenes.
- `tests/fixtures/datos/` se superpone a la copia: exámenes de Secundaria exclusivos de `valeria@example.com`
  (`sec-e2e` para `examen-secundaria` y `sec-e2e-guardado` para `autoguardado`). Cada prueba usa el suyo para no
  gastarle las oportunidades a otra en la misma fase. También trae una clase por Meet anterior (`meet-2026-09-27`,
  semana `2026-09-21`, exclusiva de `nadie-e2e`) para la prueba `presentar`; solo la ve el admin.
- Relojes acortados solo en pruebas: `window.__TIEMPO_JUEGOS` (juegos) y `window.__REENVIO_SEGUNDOS` (espera del
  botón «Reenviarme el enlace»), con `addInitScript`.
- Solo correos `@example.com`. El usuario admin de prueba es `admin@example.com`. Nada de datos reales.
- Para correr una prueba suelta sin `correr.sh`, levanta tú los servidores y exporta `BASE`, `API`, `DATA` y,
  si quieres, `CHROME`: `cd tests/e2e && node e2e-poker.js`.

### Sesión de prueba
Desde `plataforma-login`, el servidor exige sesión. Con `ROWS_FIXTURE` (y solo entonces) acepta el verificador
falso `Authorization: Bearer prueba:<correo>`:
- En el navegador, `abrirPagina` de `lib/navegador.js` guarda `localStorage.stald_sesion_prueba = { email, token:
  'prueba:' + email }` (y, si se pide, las claves viejas `stald_email` / `ingles_email`) antes de cargar la página.
- En las llamadas directas de Node, `lib/entorno.js` agrega el encabezado a toda petición a `API` con `?email=`.
- Las de login (`login`, `login-despues`) manejan el token a mano porque prueban justo eso (p. ej. cuándo se rechaza `?email=`
  sin token); llaman a `sinSesionEnFetch()`.

### Agregar una prueba
1. Crea `tests/e2e/e2e-<nombre>.js` con `require('./lib/entorno')` en la primera línea.
2. Abre las páginas con el ayudante `lib/navegador.js` (cambio `e2e-ayudantes`), no con un `newContext` +
   `addInitScript` propio. Sus opciones (`email`, `viejo`, `ingles`, `tiempo`, `init`, `viewport`, `contexto`, `out`,
   `etiqueta`, `dialogos`, `ruta`, `esperar`) están documentadas en el encabezado del archivo:

   ```js
   const { abrirPagina, urlDe } = require('./lib/navegador');
   const p = await abrirPagina(b, { email: 'marisol@example.com', tiempo: 0.4, out, ruta: '/juegos.html', esperar: '[data-juego]' });
   // Sin `ruta`, la página queda en blanco: agrega rutas o escuchas y luego `await p.goto(urlDe('/ingles.html#semana'))`.
   ```

3. Agrégala a `ORDEN` en `correr.sh` (y a `fase_de` si no es de fase `base`).
4. Córrela con `correr.sh` y documenta el resultado en el reporte del cambio.
