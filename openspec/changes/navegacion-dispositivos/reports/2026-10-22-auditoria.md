# Auditoría de navegación por dispositivo (antes y después)

- Fecha: 2026-10-22
- Cambio: navegacion-dispositivos
- Agente: Claude Code (Opus)
- Cómo: E2E `tests/e2e/e2e-navegacion-dispositivos.js` con `MEDIR=1` contra el código de `main` (9c66706, con el portal
  nuevo) y, después, sin `MEDIR` contra esta rama. Servidor local con copia temporal del repo de datos, `HOY_FIJO`
  2026-10-27, PostgREST falso (`stald_test_*`, nunca `stald_*`), puertos 9001/9002/9003.
- Tamaños: celular 360×740 (toque), tablet 768×1024 y 1024×768 (toque), PC 1280×800 y 1920×1080.
- Personas: alumna de Secundaria (valeria), alumna de Inglés del Grupo 1 (marisol), invitado de Juegos, admin/profe y
  sin sesión (portal, entrada de Juegos, enlaces profundos).

## Tareas: toques, pantalla más lenta, peticiones y estado

Toques = toques o clics de navegación (no cuentan respuestas ni texto). Pantalla más lenta = desde el toque hasta que
la pantalla es usable (servidor local). La clase de Secundaria se envía una vez (celular); en los demás tamaños se abre
su resultado (3 toques). Estado: ✅ sin hallazgos; ⚠️ con hallazgos.

| Tarea | Dispositivo | Toques antes → después | Pantalla más lenta (ms) antes → después | Peticiones | Estado antes → después | Motivo antes |
|---|---|---|---|---:|---|---|
| sec-clase | celular | 4 → 4 | 330 → 393 | 12 | ⚠️ → ✅ | 2 <44px |
| sec-clase | tablet-v | 3 → 3 | 479 → 243 | 9 | ✅ → ✅ | — |
| sec-clase | tablet-h | 3 → 3 | 378 → 439 | 9 | ✅ → ✅ | — |
| sec-clase | pc | 3 → 3 | 330 → 345 | 9 | ✅ → ✅ | — |
| sec-clase | pc-xl | 3 → 3 | 489 → 351 | 9 | ✅ → ✅ | — |
| sec-secciones | celular | 3 → 3 | 982 → 1014 | 4 | ⚠️ → ✅ | atrás about:blank |
| sec-secciones | tablet-v | 3 → 3 | 962 → 1433 | 4 | ⚠️ → ✅ | atrás about:blank |
| sec-secciones | tablet-h | 3 → 3 | 533 → 1025 | 4 | ⚠️ → ✅ | atrás about:blank |
| sec-secciones | pc | 3 → 3 | 971 → 520 | 4 | ⚠️ → ✅ | atrás about:blank |
| sec-secciones | pc-xl | 3 → 3 | 902 → 596 | 4 | ⚠️ → ✅ | atrás about:blank |
| ingles-actividad | celular | 3 → 3 | 339 → 274 | 9 | ⚠️ → ✅ | 6 <44px |
| ingles-actividad | tablet-v | 3 → 3 | 264 → 269 | 9 | ⚠️ → ✅ | 6 <44px |
| ingles-actividad | tablet-h | 3 → 3 | 324 → 310 | 9 | ⚠️ → ✅ | 6 <44px |
| ingles-actividad | pc | 3 → 3 | 320 → 265 | 9 | ✅ → ✅ | — |
| ingles-actividad | pc-xl | 3 → 3 | 263 → 479 | 9 | ✅ → ✅ | — |
| ingles-material | celular | 2 → 2 | 353 → 404 | 3 | ⚠️ → ✅ | 4 <44px |
| ingles-material | tablet-v | 2 → 2 | 353 → 509 | 3 | ⚠️ → ✅ | 4 <44px |
| ingles-material | tablet-h | 2 → 2 | 391 → 839 | 3 | ⚠️ → ✅ | 4 <44px |
| ingles-material | pc | 2 → 2 | 459 → 730 | 3 | ✅ → ✅ | — |
| ingles-material | pc-xl | 2 → 2 | 455 → 561 | 3 | ✅ → ✅ | — |
| juegos-invitado | celular | 6 → 6 | 429 → 409 | 5 | ⚠️ → ✅ | 1 <44px |
| juegos-invitado | tablet-v | 6 → 6 | 143 → 437 | 5 | ⚠️ → ✅ | 2 <44px |
| juegos-invitado | tablet-h | 6 → 6 | 385 → 267 | 5 | ⚠️ → ✅ | 2 <44px |
| juegos-invitado | pc | 6 → 6 | 260 → 387 | 5 | ✅ → ✅ | — |
| juegos-invitado | pc-xl | 6 → 6 | 234 → 373 | 5 | ✅ → ✅ | — |
| profe-grupos | celular | 7 → 7 | 629 → 727 | 19 | ✅ → ✅ | — |
| profe-grupos | tablet-v | 6 → 6 | 618 → 563 | 19 | ⚠️ → ✅ | 4 <44px |
| profe-grupos | tablet-h | 6 → 6 | 541 → 533 | 19 | ⚠️ → ✅ | 4 <44px |
| profe-grupos | pc | 6 → 6 | 600 → 593 | 17 | ✅ → ✅ | — |
| profe-grupos | pc-xl | 6 → 6 | 489 → 559 | 17 | ✅ → ✅ | — |
| profe-secundaria | celular | 3 → 3 | 411 → 365 | 20 | ⚠️ → ✅ | atrás / |
| profe-secundaria | tablet-v | 3 → 3 | 384 → 428 | 20 | ⚠️ → ✅ | atrás / |
| profe-secundaria | tablet-h | 3 → 3 | 474 → 489 | 20 | ⚠️ → ✅ | atrás / |
| profe-secundaria | pc | 3 → 3 | 411 → 652 | 20 | ⚠️ → ✅ | atrás / |
| profe-secundaria | pc-xl | 3 → 3 | 425 → 425 | 20 | ⚠️ → ✅ | atrás / |
| profe-ruta | celular | 3 → 3 | 1147 → 693 | 11 | ✅ → ✅ | — |
| profe-ruta | tablet-v | 2 → 2 | 1553 → 645 | 11 | ⚠️ → ✅ | 1 <44px |
| profe-ruta | tablet-h | 2 → 2 | 730 → 667 | 11 | ⚠️ → ✅ | 1 <44px |
| profe-ruta | pc | 2 → 2 | 611 → 668 | 11 | ✅ → ✅ | — |
| profe-ruta | pc-xl | 2 → 2 | 673 → 660 | 11 | ✅ → ✅ | — |

En todas las filas, antes y después: 0 errores de consola, 0 scroll horizontal y forma visible de volver (enlace a
Inicio, barra inferior o «← Volver»). Las peticiones no cambian (profe-secundaria +1 por la navegación real del
selector de alumna).

## Hallazgos (antes)

1. **Atrás en Secundaria** (alumna y profe, todos los tamaños): las pestañas usaban `replaceState`; «Atrás» salía de
   Secundaria (o al portal) en vez de regresar a la pestaña anterior.
2. **Objetivos < 44 px**: «← Inicio» y «🎮 Juegos» de Inglés 49×32 y 64×32; «Abrir en YouTube ↗» 294×35 (celular) y
   114×16 (tablet); botón del alumno en el mapa de calor 43×44; casilla del aviso de Juegos 682×24 en tablet; «✕» de los
   juegos 34×44; `.btn.sm` de 36 px en tablets de 720 px o más.
3. **Tapado**: en 768×1024, «Siguiente misión» quedaba debajo de la barra fija del examen (`.exam-bar`).
4. **Ancho en PC**: contenedor de Inglés (alumna) y Secundaria 760 px y de Juegos 720 px, también en 1920 px (40 % y
   38 %); las 7 pestañas de Secundaria en dos filas a 1280 px.
5. **Entregas sin Postgres** (lo encontró la suite): «📥 Entregas» se quedaba con el esqueleto si la bandeja llegó
   antes (la pidió «📥 Por revisar» del panel).

| Página | Tamaño | Contenedor antes → después |
|---|---|---|
| Inglés (alumna) | 1280 / 1920 | 760 → 1100 px (menú a un lado) |
| Secundaria (alumna) | 1280 / 1920 | 760 → 1100 px (pestañas en una fila) |
| Juegos (hub) | 1280 / 1920 | 720 → 1080 px (5 columnas de categorías, 4 de juegos) |
| Panel del profe / Mi ruta | 1280 / 1920 | 1248 / 1280 px (sin cambio) |

Teclado (PC): Tab llega a la tarjeta de Secundaria del portal con foco visible en cada parada, Enter abre, las flechas
cambian de pestaña sin agregar historial y las 12 primeras paradas de Inglés tienen foco visible. Enlaces profundos
(`?modo=secundaria`, `secundaria.html#horario` y `#misiones`, `?modo=profe`, `ingles.html#material`,
`juegos.html?registro=1`, `?modo=secundaria` sin sesión que pide entrar, `index.html?juegos=1`): todos abren.

## Producción (solo lectura, sin sesión; https://jalducin.github.io/platform-STALD/)

| Página | 360 px: FCP / load | 1280 px: FCP / load | Recursos |
|---|---|---|---|
| `/` | 608 / 548 ms | 132 / 115 ms | 11, todos 200 |
| `ingles.html` | 844 / 823 ms | 156 / 132 ms | 31, todos 200 |
| `juegos.html` | 448 / 578 ms | 180 / 288 ms | 51, todos 200 |
| `secundaria.html` | 204 / 871 ms | 248 / 855 ms | 34, todos 200 (puente a `ingles.html?modo=secundaria`) |
| `privacidad.html` | 288 / 266 ms | 136 / 116 ms | 4, todos 200 |
| `consentimiento.html` | 164 / 154 ms | 124 / 113 ms | 4, todos 200 |
| `juegos.html?registro=1` | 220 / 249 ms | 276 / 294 ms | 51, todos 200 |

Todos los recursos propios llegan con `Cache-Control: max-age=600` (fijo de GitHub Pages; los `?v=` evitan servir
versiones viejas). Sin errores de consola ni scroll horizontal. Las cifras de 360 px incluyen la primera conexión.

## Capturas

Fuera del repo (las del panel del profe muestran nombres de la copia de datos): carpeta de la sesión
`scratchpad/nav/antes/` (línea base) y `scratchpad/nav/final/` (después), `nav-<tarea>-<tamaño>.png` y
`nav-ancho-*.png`.
