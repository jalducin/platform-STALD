## Por qué
El profe pidió: «En los juegos de baraja española mejorar el diseño de las cartas». Hoy, en Brisca y Conquián, cada
carta es un rectángulo con un emoji y un número: no se reconoce como baraja española, el dorso es un rayado plano, la
mano de Conquián (8 o 9 cartas) se parte en dos renglones en el celular y no hay ninguna animación al jugar.

## Qué cambia
- La carta española se dibuja como una carta real: marco con esquinas redondeadas y fondo crema, color por palo
  (oros dorado, copas rojo, espadas azul, bastos verde), número en las dos esquinas, el palo dibujado en SVG (moneda,
  copa, espada y basto), los puntos del 1 al 7 acomodados como en la baraja y, en sota, caballo y rey, una figura
  estilizada con su nombre.
- Dorso con patrón elegante (enrejado y medallón) en el mazo y en las cartas de los rivales; el mazo se ve como una
  pila con su contador.
- Estados: jugable (resalta al pasar o tocar), seleccionada (sube), triunfo (marca discreta en las cartas del palo de
  triunfo en Brisca) y deshabilitada. Tamaños: mano, mesa y miniatura.
- La mano no se desborda: fila en abanico con superposición que se ajusta al ancho (390 px con 9 cartas).
- Animación sutil cuando una carta llega a la mesa; sin animación con `prefers-reduced-motion`.
- Accesible: cada carta lleva `role="img"` y `aria-label` con su nombre («Caballo de copas»).

## Superficies
- `juegos.html` (estilos `.es-*`, `esCarta` y el marcado de `briscaHtml` / `conquianHtml`).
- Pruebas E2E: `tests/e2e/e2e-cartas-espanolas.js`.
- Sin cambios en `juegos/cartas.js` (motor y reglas), servidor, datos, Postgres, Realtime ni Auth.

## Acciones externas
- Ninguna. Publicación con el merge a `main` (GitHub Pages) y archivo del cambio: integrador.
