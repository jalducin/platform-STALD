# Estándares de frontend (páginas estáticas)

Aplica a `index.html` (portal), `ingles.html`, `secundaria.html` y cualquier página nueva que se publique con GitHub Pages.

## 1. Forma de las páginas

- Cada página es **un solo archivo HTML autocontenido** en la raíz del repo: CSS en `<style>`, JS en
  `<script>`. Sin build, sin frameworks y sin dependencias de CDN salvo que un cambio lo justifique en su `design.md`.
- Una página = una ruta del backend. La URL del backend va en una constante al inicio del script
  (`DATA_URL_BASE`); no repetirla en varios lugares.
- `index.html` es el **portal** (lo que Pages sirve en `/`):
  - pide el correo, consulta `/perfil` y muestra una tarjeta por espacio;
  - el tablero de Secundaria vive en `secundaria.html` desde el cambio `portal-acceso`.
- Cada página de espacio lleva "← Inicio" al portal y "🎮 Juegos"; ambos conservan `?api=` para probar contra un servidor local.
- **Excepción (`juegos.html`):**
  - El contenido de los juegos se carga de `juegos/datos/*.json` en el mismo sitio (vocabulario, trivia,
    etc.). Crece con el tiempo y se edita sin tocar el código.
  - No lleva datos personales ni respuestas de evaluaciones.
  - Los relojes aceptan `window.__TIEMPO_JUEGOS` (solo en pruebas E2E) para acelerarlos.

## 2. Seguridad en el DOM

- Todo texto que venga de Notion se inserta con `escapeHtml()` o con `textContent`. Nunca concatenar
  datos crudos en `innerHTML`.
- Los enlaces externos llevan `target="_blank" rel="noopener"`.
- `localStorage` solo guarda el correo de sesión: `stald_email` (portal), `ingles_email` y
  `secundaria_email`.
  - El portal escribe las de los espacios a los que el correo tiene acceso, así que las páginas entran
    solas.
  - "Cerrar sesión" en cualquier página borra las tres.
  - Además del correo, se permiten preferencias de interfaz sin datos personales, como
    `juegos_pref = { musica, volumen }` (música de fondo de `juegos.html`).
  - No guardar filas ni otros datos personales.
- La página **no decide permisos**: muestra lo que devuelve el backend. Ocultar algo en el cliente no
  cuenta como control de acceso.

## 3. Estados obligatorios de UI

Cada página debe manejar y mostrar de forma explícita:

1. Sin sesión → formulario de correo.
2. Cargando.
3. Correo sin filas asignadas → mensaje claro y vuelta al login.
4. Error de red o backend (4xx/5xx) → mensaje con el error, sin romper la página.
5. Datos vacíos pero válidos (p. ej. "no hay tareas pendientes").
6. Vista de administrador (etiqueta "Admin" + a quién pertenece cada fila).

## 4. Diseño y accesibilidad

- Diseño primero para móvil (ancho máximo 720px, gutter de 16px, `safe-area-inset`).
- Colores en variables CSS en `:root`, con variante `prefers-color-scheme: dark`.
- Inputs con `<label for>`; los botones son `<button>`, no `div`.
- Fechas en `es-MX` y comparadas como `AAAA-MM-DD` en hora local.
- Tarjetas de resumen que filtran (`ingles.html`): cada tarjeta es un `<button data-action="filtrar" data-grupo aria-pressed>`
  y cada sección del tablero lleva `data-grupo`. El filtro se aplica en el DOM al `.board` más cercano (en
  admin, por alumno o alumna), no se guarda y se quita con la misma tarjeta o con "Ver todo".
- Vista de admin de `ingles.html`: tarjeta "📊 Últimas calificaciones" (`#ultimas`), con las 5 más recientes
  por alumno o alumna. Junta las de en línea (mejor intento, fecha del último envío) y las de Notion
  (fecha de edición). El color va por nivel: ≥ 80, 60–79 y < 60; una calificación de Notion ≤ 10 se
  escala × 10.
- Vista de admin de `ingles.html`: tarjeta "🎮 Juegos de la semana" (`#juegos-admin`), con el ranking
  completo y las partidas con su podio, desde `/juegos/admin/resumen`. En el bloque de cada alumno o alumna
  va su línea de juegos.
- `juegos.html`:
  - **avatar:** personaje y color de las listas que envía `/juegos/yo`, o foto propia (`avatar-foto`): se recorta y reduce a 128×128 JPEG en el navegador, exige la casilla de permiso de mamá, papá o tutor y, si la foto ya no existe, se muestra el personaje (`onerror`);
  - **Sudoku** (`sudoku-niveles`): el tablero se genera en el navegador con solución única (`generarSudoku`,
    `contarSoluciones`); niveles Fácil 40, Medio 32, Difícil 27 y Experto ~24 pistas; 3 vidas; puntos con
    `puntosSudoku` (base por nivel + rapidez − errores);
  - **música de fondo:** generada con WebAudio (Alegre, Relajante, Fiesta); empieza solo tras un gesto y
    baja mientras suena una voz.
- `juegos.html?sala=<código>`: entra (o registra al invitado) y se une solo. La sala de espera muestra el
  enlace, "📤 Compartir" y un QR (qrcodejs de cdnjs, cargado solo en esa pantalla).

## 5. Código compartido

`secundaria.html` e `ingles.html` (y el portal) repiten lógica de login, `escapeHtml` y estilos. Mientras sean archivos separados,
**un cambio en la lógica común debe aplicarse a ambos en el mismo cambio** y la tarea de verificación
debe cubrir ambas páginas. Extraer a un `shared.js` solo mediante un cambio OpenSpec propio.

## 6. Verificación

- Local: servir la raíz (`npx serve .`) y recorrer los estados del §3.
- Publicada: tras el merge, abrir la URL de Pages (ver `openspec/project.md`) y repetir login admin y
  login de alumna. Pages tarda de 1 a 2 minutos en publicar.
