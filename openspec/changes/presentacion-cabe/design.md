## Contexto

La diapositiva es un 16:9 con `container-type: inline-size`, y todas sus medidas iban en `cqw`, es decir,
proporcionales al ancho. Por eso cabía la misma cantidad de contenido en cualquier pantalla, y lo que no cabía quedaba
oculto (`overflow: hidden`).

## Decisiones

1. **Una sola escala por diapositiva (`--escala`), con medidas en `em`.** El cuerpo define
   `font-size: calc(clamp(14px, 2.25cqw, 46px) * var(--escala))`; tablas, tarjetas, diagramas y espacios van en `em`.
   Al bajar la escala se reduce todo junto. El encabezado no se escala, para que el título siempre se lea.
2. **Escala mínima legible:** `max(0.7, 14 px / letra base)`. En el celular la base ya es de 14 px, así que no se
   reduce. Se descartó bajar más porque en un proyector, por debajo del 70 %, el texto ya no se lee de lejos.
3. **Scroll por partes en lugar de paginar el HTML.** Partir el contenido en varias diapositivas obligaría a cortar
   tablas y diagramas por filas y cambiaría el conteo «x / y» que el profe sigue con su guion. En su lugar, el cuerpo
   queda con scroll y → avanza una parte (85 % del alto) antes de cambiar de diapositiva. Se presenta igual que una
   paginación («parte 1/3, 2/3, 3/3») sin tocar el contenido ni el conteo.
4. **Tema propio de la presentación** en `.deck[data-tema]`, porque el profe proyecta. Por omisión sigue la página
   (`data-theme` o `prefers-color-scheme`), y la elección se recuerda con `localStorage`, envuelto en try/catch.
5. **CSS aparte** (`ingles/presentacion.css`) para no mezclar el modo presentación con el resto de `ingles.css`, que
   otros cambios editan en paralelo.

## Riesgos

- `color-mix()` y `dvh` requieren navegadores de 2023 en adelante. El profe usa Chrome.
- En el celular, una tabla muy ancha se desplaza de lado dentro de su tarjeta: se ve completa, no se corta.
