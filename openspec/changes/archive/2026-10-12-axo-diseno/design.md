## Contexto

- `juegos/plataformas.html` dibuja en un canvas de `LW × 240` px lógicos (15 filas de 16 px) escalado por `K`
  (entero, ≈ escala × `devicePixelRatio`). Hoy pinta los tiles en una capa de 1× del ancho del nivel y la amplía
  pixelada; el fondo es un degradado más dos franjas de «colinas» por columnas de 4 px.
- Las reglas (física, enemigos, jefe, puntos, progreso, sala) no cambian. Las pruebas E2E usan los ids del DOM
  (`#ov-mapa`, `[data-nivel]`, `.hecho`, `#mapa-num`, `#mapa-stats`, `[data-continuar]`, `#h-bots`, `#mandos`…) y
  los ganchos `window.__plat`.
- Otro agente trabaja en paralelo en `juegos/karts.html`; `juegos/arcade.js` no se toca.

## Decisiones

### 1. Arte vectorial dibujado a la resolución real
- Todo se dibuja con trazos de canvas (elipses, curvas, degradados) en coordenadas lógicas con `setTransform(K…)`,
  así se ve nítido en cualquier pantalla. El CSS deja de forzar `image-rendering: pixelated`.
- Alternativa descartada: sprites PNG o SVG externos (peso, carga en red y más archivos que mantener).

### 2. Pre-dibujo fuera de pantalla (rendimiento)
- **Tiles:** ya no hay una capa del ancho del nivel. Cada combinación de tile (tipo, mundo, castillo, lados
  expuestos y variante) se dibuja una vez en un canvas de `16·K` px y se reutiliza con `drawImage` en cada cuadro
  solo para las columnas visibles (~150 llamadas por cuadro). Los cambios del nivel (cajas usadas, plataformas que
  caen, el muro del jefe) solo cambian el `grid`; no hay que repintar nada.
- **Fondo:** el cielo (degradado, sol, auroras, resplandor) es un canvas de pantalla; cada capa de paralaje es una
  franja horizontal que se repite (periodo fijo) y se dibuja dos o tres veces por cuadro. Las capas grandes se
  pre-dibujan a `min(K, 4)` para acotar memoria en celulares de `dpr` 3.
- Las cachés se invalidan al cambiar `K`, el ancho o el mundo.

### 3. Celular vertical: cielo arriba y subsuelo abajo
- El área visible del nivel sigue siendo `LW × 240` (no cambia la jugabilidad). Si la pantalla es más alta, el canvas
  crece a `VH` px lógicos (hasta 1.9 × 240) y el nivel se dibuja desplazado `OY`: arriba se ve más cielo (donde va el
  HUD) y abajo el subsuelo o el abismo de cada hoyo. Así el HUD queda fuera del área del nivel en 390×844.

### 4. Axo
- Función `pintarAxo(ctx, pose)` independiente del estado, usada por el juego y para el retrato del título y del
  mapa (`canvas.toDataURL`), así no hay dos dibujos distintos.
- Poses: reposo (respira), caminar (balanceo y patas), saltar (estirado), caer (brazos abiertos), aterrizar
  (aplastado breve), daño (ojos cerrados), victoria (brazos arriba) y perder (ojos en X).
- Variantes: base rosa; champiñón = escala 1.6 anclada a los pies (alto 21 px como la caja de colisión); fuego =
  cuerpo coral, branquias doradas y una flamita en la cola.
- Invulnerable: opacidad entre 0.55 y 0.8 a 4 Hz (suave, sin parpadeo); con movimiento reducido, 0.6 fija.

### 5. Efectos y partículas
- Arreglo `efectos` separado de `particulas` (que usa la lógica para monedas de caja, rocas y chispas del jefe):
  polvo al aterrizar o derrapar, destello al tomar monedas, confeti en la meta. Ambiente por mundo en espacio de
  pantalla con tope fijo (≤ 40). Con `prefers-reduced-motion` no se crean y la chispa del jefe baja a 0.

### 6. Mapa de mundos
- Se conservan los botones del DOM (accesibles, y los selectores de las E2E) y se colocan sobre una escena SVG en
  línea generada por mundo (`viewBox 320×180`): cielo, capas de fondo, camino punteado (sólido en lo ya superado),
  nodos y castillo. Los mundos «Próximamente» se ven en gris con un candado grande.
- Tira de 12 mundos (`#mapa-mundos`) con ✔ si el mundo está completo, el actual resaltado y 🔒 en los que faltan;
  tocar uno cambia la vista. Axo (retrato del canvas) aparece sobre el nodo que sigue.
- `#mandos` se oculta fuera del nivel para que el mapa tenga más espacio en celular.

### 7. HUD y botones
- Fichas con fondo oscuro translúcido y bordes redondeados (mismos ids y textos). Botones táctiles con íconos SVG
  en línea, anillo y estado presionado; el de saltar es el más grande.

## Riesgos y mitigación
- **Memoria en celular:** cachés a `min(K, 4)` y franjas de altura acotada; tiles de 16·K px.
- **Costuras entre tiles:** la cámara se redondea al píxel lógico y los tiles se dibujan a escala 1:1 de su caché.
- **Regresión de reglas:** solo se agregan ganchos de dibujo (aterrizaje, moneda tomada); las E2E de plataformas,
  juegos y dragon-run deben seguir pasando.
