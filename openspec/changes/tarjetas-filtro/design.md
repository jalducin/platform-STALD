## Decisiones

### 1. Filtro en el DOM, por tablero
- `renderBoard` envuelve cada tablero en `<div class="board">`.
- Cada sección lleva `data-grupo`: `recent`, `overdue`, `today`, `upcoming`, `older` o `nodate`.
- Cada tarjeta es un `<button class="stat …" data-action="filtrar" data-grupo="…" aria-pressed>`.
- Un manejador aplica el filtro al tablero más cercano (`closest('.board')`). Oculta con `hidden` las
  secciones de otro grupo, marca la tarjeta activa y muestra "Ver todo".
- No se vuelve a renderizar ni se piden datos; así en admin cada alumno o alumna filtra por separado.

### 2. Accesibilidad
- Las tarjetas son `<button>`: funcionan con teclado y tienen `aria-pressed`.
- El texto del botón mantiene número y etiqueta.

### 3. Sin persistencia
El filtro vive en el DOM. Un render nuevo (recarga, "Volver") lo quita. Así nadie ve un tablero filtrado
sin saberlo.
