# Pruebas

Cómo correr las pruebas del proyecto, qué cubren y qué cuidar. Cambio de origen: `openspec/changes/pruebas-en-repo`.

| Tipo | Dónde | Quién las corre |
|---|---|---|
| Unitarias del servidor | `server/*_test.ts` | GitHub Actions en cada push a `main` y en cada PR (`.github/workflows/pruebas.yml`), y tú en local |
| E2E (navegador) | `tests/e2e/e2e-*.js` | Solo en local, con `tests/e2e/correr.sh` |
| Análisis de calidad (reglas tipo SonarQube) | `tests/calidad/` | En local, con `npm run calidad` (ver [Análisis de calidad](#análisis-de-calidad)) |

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
  semana `2026-09-21`, exclusiva de `nadie-e2e`) para la prueba `presentar`; solo la ve el admin. Y la actividad
  `fichas-e2e` (ordenar y emparejar), en la misma semana, con fecha 2026-10-04 y exclusiva de `fernando`, para
  `ordenar-emparejar`: aparece en su «Para ponerte al día».
- Reloj acortado solo en pruebas: `window.__TIEMPO_JUEGOS` (juegos), con `addInitScript`.
- Con el verificador falso local, cualquier contraseña no vacía abre la sesión; «clase» o «sensei» cuentan como la
  inicial y piden cambiarla (cambio `acceso-con-contrasena`).
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
   const p = await abrirPagina(b, { email: 'marisol@example.com', tiempo: 0.4, out, ruta: '/juegos.html', esperar: '[data-menu]' });
   // Sin `ruta`, la página queda en blanco: agrega rutas o escuchas y luego `await p.goto(urlDe('/ingles.html#semana'))`.
   ```

   El menú de `juegos.html` abre en las categorías (cambio `juegos-categorias`): espera `[data-menu]` (existe en las
   dos vistas) y usa los ayudantes de `lib/menu.js` en lugar de tocar `[data-juego="…"]` directo:
   `abrirJuego(p, id, { tap })` (abre la categoría del juego si hace falta y toca su tarjeta), `abrirCategoria`,
   `irACategorias`, `idsDe(p, cat)`, `textoTarjeta(p, id)` y `recorrerMenu(p)`. Para comparar el menú con su catálogo
   usa `contarMenu(p)` (cambio `organizar-codigo`): entra a cada categoría y devuelve `ids`, `tarjetas`, `juegos`
   (`JUEGOS.length`), `secciones` (tarjetas de categoría), `categorias` (`CATEGORIAS.length`), `porCategoria` y
   `completo` (cada categoría pinta exactamente sus juegos y la suma es todo el catálogo). No repitas
   `p.evaluate(() => JUEGOS.length)`. Los botones `.result [data-juego]` («Jugar otra vez») no cambian.
3. Agrégala a `ORDEN` en `correr.sh` (y a `fase_de` si no es de fase `base`).
4. Córrela con `correr.sh` y documenta el resultado en el reporte del cambio.

## Análisis de calidad

Mide desde la terminal los mismos avisos que SonarQube for IDE (SonarLint) muestra en el panel «Problemas» de VS Code,
para saber si suben o bajan sin abrir cada archivo. Cambio de origen: `openspec/changes/calidad-sonar` (decisiones y
conteos antes/después en su `design.md` y su reporte).

```bash
cd tests/calidad
npm install                                      # una vez: ESLint, Stylelint y sus plugins (solo aquí, no en la raíz)
npm run calidad                                  # avisos por regla de Sonar y por archivo
node calidad.mjs --detalle --regla S3358         # cada aviso de una regla (archivo:línea y mensaje)
node calidad.mjs --detalle --contexto 2 --archivo juegos/golf.html   # con el código alrededor, solo ese archivo
node calidad.mjs --json salida.json              # resultado completo en JSON (para comparar antes y después)
```

- **Qué revisa:** el JS del navegador (`juegos/`, `juegos/app/`, `ingles/`, `comun/` y los `<script>` de los HTML de la
  raíz y de `juegos/`), el CSS (`estilos/`, archivos `.css` y `<style>`) y `server/*.ts`. No revisa `tests/`,
  `supabase/` ni `herramientas/`.
- **Cómo:** `eslint.config.mjs` activa solo las reglas equivalentes de `eslint-plugin-sonarjs` (el mismo código que usa
  SonarLint) y `eslint-plugin-unicorn`, con su clave de Sonar al lado (`S3358`, `S3776`, `S2681`, `S2245`, …). Stylelint
  cubre `css:S4666` (selectores duplicados) y `css:S1874` (valores obsoletos), y `calidad.mjs` agrega dos revisiones
  propias: contraste WCAG AA de reglas con `color` y fondo literales (`css:S7924`) y roles ARIA que tienen elemento
  nativo (`Web:S6819`, p. ej. `role="group"` → `<fieldset>`).
- **`NOSONAR`:** igual que SonarLint, un aviso en una línea con `// NOSONAR: <motivo>` no cuenta; se lista aparte como
  «revisados con NOSONAR», por regla. Úsalo solo con el motivo escrito, p. ej. `// NOSONAR: azar de juego, no
  criptográfico` en `Math.random()` (S2245) o en la aritmética entera de 32 bits de los generadores con semilla
  (S7767).
- **No es una compuerta:** sale con 0 aunque haya avisos y no corre en CI. Córrelo antes de un PR que toque mucho código
  y no subas los conteos sin motivo.
- **Diferencias con SonarLint:** VS Code solo analiza los archivos abiertos (y también las copias de los worktrees de
  `.claude/`); este análisis recorre todo el código vivo y nada más. Las revisiones propias de contraste y roles son
  aproximadas: no resuelven variables CSS (`var(--x)`) ni roles dentro de cadenas de JS.
