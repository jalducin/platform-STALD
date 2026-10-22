## Contexto

Inglés, Secundaria y la ruta del profe viven en `ingles.html` (modos `?modo=secundaria` y `?modo=profe`); Juegos en
`juegos.html`; el portal en `index.html`. Inglés navega por hash (`#semana`, `#material`, …) con historial; dentro de
una actividad agrega `#ver/<id>`. Secundaria pinta sus pestañas dentro de `#content` y guardaba la pestaña en el hash
con `replaceState`.

## Decisiones

1. **Historial en Secundaria.** `irPestanaSec(id, enfocar, historial)` con `historial` = `'agregar'` (toque o clic;
   `pushState` solo si la pestaña cambia), `'reemplazar'` (flechas, por omisión) o `'nada'`. El `hashchange` de
   `app.js`, en modo Secundaria y fuera de una clase, llama `irPestanaSec(tabDeHash(hash), false, 'nada')`. Al salir
   de una clase con «Atrás» (`#ver/…`) sigue el camino de siempre (`render`). Alternativa descartada: `popstate` propio
   en `secundaria.js` (dos escuchas para el mismo evento).
2. **Ancho en PC sin estirar el texto.** Inglés (alumnos y alumnas) adopta a ≥ 1100 px el mismo esquema del panel del
   profe: menú lateral fijo (`position: sticky`) y contenido de hasta ~856 px. Secundaria no tiene menú (sus pestañas
   viven en `#content`), así que solo crece a 1100 px: las pestañas caben en una fila y las tarjetas respiran. Juegos
   crece solo cuando la página muestra el hub (`.wrap:has(#menu-juegos)` o `:has(#tab-body)`); en un juego la columna
   no cambia (no se toca el diseño de los juegos ni sus canvas). Sin `:has` (navegadores viejos) queda como antes.
3. **44 px también en tablet.** `.btn.sm` medía 44 px solo bajo 720 px; con `@media (pointer: coarse)` vale en
   cualquier pantalla táctil, sin agrandar los botones con mouse.
4. **`scroll-padding-bottom`.** La barra inferior (celular) y la barra fija del examen tapaban lo que el navegador
   desplazaba al borde. 96 px cubren ambas (56 px + margen).
5. **E2E por tarea y tamaño.** Un medidor por página cuenta solo toques de navegación (no las respuestas ni lo que se
   escribe), mide el tiempo de cada pantalla desde el toque hasta su selector, cuenta peticiones al API, errores de
   consola/JS, scroll horizontal, objetivos < 44 px visibles (con toque; exime enlaces dentro de un párrafo, como WCAG
   2.5.8) y, antes de cada toque, si el centro del elemento lo tapa otro (`elementFromPoint`). Al final revisa las
   formas de volver y el «atrás». Topes de toques = lo medido en el peor tamaño de la auditoría. La clase de
   Secundaria solo se envía una vez (hay 2 por día en el fixture); en los demás tamaños se abre su resultado.

## Riesgos

- Layout ancho: revisado con capturas en 1024, 1280 y 1920 px; en celular y tablet no cambia nada (media queries ≥ 1100
  y ≥ 1200 px).
- Historial: más entradas en Secundaria; «Atrás» desde una clase sigue regresando a la pestaña donde estaba.
