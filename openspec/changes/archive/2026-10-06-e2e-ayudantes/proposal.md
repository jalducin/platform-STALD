## Por qué
Deuda técnica en las pruebas E2E: más de 30 archivos de `tests/e2e/` repiten casi la misma función para abrir una
página con la sesión de prueba (`pagina(...)`, `jugador(...)`, `contexto(...)`, `nuevaPagina(...)`, `dia(...)` o el
mismo bloque en línea). Cada copia crea un contexto de 390×844, inyecta `localStorage.stald_sesion_prueba =
{ email, token: 'prueba:' + email }` (a veces también `stald_email` / `ingles_email` y `window.__TIEMPO_JUEGOS`),
registra `pageerror` y `dialog` y navega con `?api=`. Cuando cambia la sesión de prueba hay que tocar todas las
copias, y cada prueba nueva copia la variante que tenga más a la mano.

## Qué cambia
- Ayudante nuevo `tests/e2e/lib/navegador.js` con una API pequeña:
  - `abrirPagina(b, { email, viejo, ingles, tiempo, init, viewport, contexto, out, etiqueta, dialogos, ruta, esperar })`
    devuelve la página lista (su contexto es `p.context()`).
  - `urlDe(ruta)` arma la URL de una página estática con `?api=` (respeta query y `#hash`).
- Las pruebas que repiten la apertura la usan. Se cambia **solo la forma**: cada prueba conserva lo que prueba y el
  mismo número de pasos `PASS`.
- `docs/pruebas.md` («Agregar una prueba» y «Sesión de prueba») explica el ayudante.

Fuera de alcance:
- `e2e-grupos.js` y `e2e-ingles-pro.js`: solo corren con `--pg` (Postgres de prueba de Supabase), que este cambio no
  usa; se quedan como están hasta poder verificarlas.
- `e2e-portal.js`, `e2e-actividades-datos.js` y `e2e-login-despues.js`: no inyectan la sesión de prueba.

## Superficies
- Solo `tests/e2e/` y `docs/pruebas.md`. No toca `server/`, ni páginas (`index.html`, `ingles.html`, `juegos.html`,
  `secundaria.html`), ni Postgres/Realtime/Auth de Supabase, ni el repo de datos, ni Notion.
- Datos de alumnos y alumnas: ninguno. Las pruebas siguen usando solo correos `@example.com` y la copia temporal de
  datos que arma `correr.sh`; la matriz de acceso no cambia.

## Acciones externas
Ninguna.
