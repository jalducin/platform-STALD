# Estándares de frontend (páginas estáticas)

Aplica a `index.html`, `ingles.html` y cualquier página nueva que se publique con GitHub Pages.

## 1. Forma de las páginas

- Cada página es **un solo archivo HTML autocontenido** en la raíz del repo: CSS en `<style>`, JS en
  `<script>`. Sin build, sin frameworks y sin dependencias de CDN salvo que un cambio lo justifique en su `design.md`.
- Una página = una ruta del backend. La URL del backend va en una constante al inicio del script
  (`DATA_URL_BASE`); no repetirla en varios lugares.
- `index.html` es el dashboard de Secundaria y es lo que Pages sirve en `/`. No renombrarlo.

## 2. Seguridad en el DOM

- Todo texto que venga de Notion se inserta con `escapeHtml()` o con `textContent`. Nunca concatenar
  datos crudos en `innerHTML`.
- Los enlaces externos llevan `target="_blank" rel="noopener"`.
- `localStorage` solo guarda el correo de sesión (clave por página, p. ej. `secundaria_email`). No guardar
  filas ni otros datos personales.
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

## 5. Código compartido

`index.html` e `ingles.html` repiten lógica de login, `escapeHtml` y estilos. Mientras sean dos archivos,
**un cambio en la lógica común debe aplicarse a ambos en el mismo cambio** y la tarea de verificación
debe cubrir ambas páginas. Extraer a un `shared.js` solo mediante un cambio OpenSpec propio.

## 6. Verificación

- Local: servir la raíz (`npx serve .`) y recorrer los estados del §3.
- Publicada: tras el merge, abrir la URL de Pages (ver `openspec/project.md`) y repetir login admin y
  login de alumna. Pages tarda de 1 a 2 minutos en publicar.
