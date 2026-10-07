## Contexto
Solo interfaz. `esCarta(id, extra)` en `juegos.html` arma el HTML de una carta y lo usan `briscaHtml` y
`conquianHtml`, compartidos por el modo individual y la sala. El motor (`juegos/cartas.js`) no cambia.

## Decisiones

### Dibujo con SVG en línea (sprite)
- Un `<svg>` oculto al inicio del `<body>` define un `<symbol>` por palo (`es-s0`..`es-s3`: moneda, copa, espada y
  basto) y por figura (`es-f10` sota, `es-f11` caballo, `es-f12` rey). Cada carta los usa con `<use href="#…">`:
  el HTML de cada carta queda corto y el dibujo vive en un solo lugar. Sin imágenes ni dependencias externas.
- Los palos llevan sus colores fijos (la cara de la carta siempre es crema, también en modo oscuro). Las figuras usan
  `currentColor` (el color del palo).
- Alternativa descartada: imágenes PNG/SVG de una baraja: dependencia externa, peso y licencia.

### Anatomía de la carta
- `span.es-carta.es-p<palo>` con `role="img"` y `aria-label` = `Cartas.nombreEsp(id)` (la prueba de estrés lee ese
  `aria-label`). Dentro: dos esquinas `.es-esq` (número y palo chico; la de abajo girada 180°) y el centro
  `.es-centro`:
  - 1 (as): un palo grande;
  - 2 a 7: los puntos acomodados como en la baraja (posiciones fijas en `ES_PIPS`);
  - 10, 11 y 12 (`.es-fig`): panel con la figura, el palo que «sostiene» y su nombre (SOTA, CABALLO, REY).
- Todo se mide en `em` sobre `font-size: calc(var(--w) * .2)`; el tamaño se cambia con `--w`:
  mano 64 px (78 px desde 640 px), mesa 60 px (70 px), miniatura `.chica` 34 px. Proporción 2:3.
- En miniatura solo quedan la esquina superior y un palo (o la figura) al centro.

### Dorso y mazo
- `.es-carta.oculta`: fondo vino con enrejado de gradientes, filete dorado interior y medallón al centro.
- `.es-mazo`: pila de dorsos (sombras escalonadas) con el contador; en Brisca, el triunfo va girado debajo
  (`.es-carta.triunfo`, como en la mesa real). Las cartas ocultas de los rivales se agrupan en `.es-dorsos`, encimadas.

### Mano en abanico
- `.es-mano` es una fila sin saltos. Cada `.es-btn` se encima con `margin-left: min(6px, (100% - n·w) / (n - 1))`:
  el porcentaje se resuelve contra el ancho de la mano, así que la superposición aparece solo cuando no caben.
  La mano lleva 14 px de margen lateral y, con más de 5 cartas, el giro es de 1.6° por carta, para que las cartas de
  los extremos no salgan de la pantalla (9 cartas a 360 px quedan entre 16 y 344 px).
- La regla genérica `.sel` de la página (los selects, `width: 100%`) se anula en `.es-btn.sel`.
  El giro del abanico (`rotate`) y el arco (`translate`) se calculan en `esManoHtml` y van en variables CSS; al
  pasar, enfocar o seleccionar, la carta sube y queda encima (`z-index`).
- Se usan las propiedades individuales `rotate` y `translate` para que el abanico y la elevación no se pisen.

### Estados
- Jugable (`.es-btn.jugable`): filete dorado; sube al pasar o con foco (`:focus-visible`).
- Seleccionada (`.es-btn.sel`): sube más y lleva anillo morado (`--accent-2`).
- Deshabilitada (`[data-no]`): ligeramente apagada, cursor normal.
- Triunfo: en Brisca, las cartas del palo de triunfo en la mano llevan una estrella dorada discreta (`.es-triunfo`);
  es solo visual, no cambia reglas.

### Animación al jugar
- `esNuevas(zona, ids)` recuerda qué cartas se pintaron la última vez en la mesa (`baza` en Brisca, `oferta` en
  Conquián) y marca con `.entra` solo las que llegaron. Así el sondeo de la sala (que vuelve a pintar) no repite la
  animación. `@keyframes es-entra` (280 ms) sube y aparece la carta.
- `@media (prefers-reduced-motion: reduce)` quita la animación y las transiciones de las cartas.

## Riesgos
- Selectores de pruebas: se conservan `.es-carta`, `.es-btn`, `.jugable`, `.sel`, `.chica`, `.oculta`, `.triunfo`,
  `.es-mano`, `.es-baza figure`, `.es-juego`, `data-br-carta`, `data-cq-carta`, `data-cq-oferta`, `data-cq-juego`
  y el `aria-label` con el nombre.
- Sin `?v=` nuevo: `juegos/cartas.js` no cambia.

## Pruebas
- E2E `cartas-espanolas`: nombre accesible, número en las dos esquinas, palo dibujado (`svg use`), figura con nombre,
  dorso en el mazo y en los rivales, y la mano sin desbordar a 390 px (Brisca y Conquián).
- Regresión: `conquian-estres`, `clasicos`, `ritmo`, `juegos` y `juegos-recarga`; unitarias y lint del servidor.
