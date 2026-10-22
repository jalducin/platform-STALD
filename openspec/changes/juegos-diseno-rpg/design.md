## Contexto

Juegos tiene su propio sistema de tokens (`juegos/app/juegos.css`, acento rosa y morado) y una clase `.btn` que
usan cientos de pantallas y salas. Secundaria usa `estilos/stald.css` (tokens base) e `ingles/secundaria.css`
(tokens `--rpg-*` y componentes del tablero). La inspiración visual es el archivo local del profe
`estilos/nexus_academy_dashboard.html` (no versionado, con Tailwind). Se toma su estética: paneles, barras,
etiquetas, brillo y números en Orbitron si está instalada. No se usan su CDN ni sus íconos.

## Decisiones

1. **`estilos/ui.css` solo con lo RPG.** No se enlaza `estilos/stald.css` en Juegos: sus `.card`, `.tabs`, `.chip` y
   `.btn` chocarían con los de `juegos.css` y cambiarían todas las salas. `ui.css` trae solo los tokens `--rpg-*` y
   componentes con prefijo `rpg-`, con respaldos (`var(--r-md, 18px)`). Así sirve con los dos sistemas de tokens.
   Secundaria lo enlaza antes de `ingles/secundaria.css`, que deja de repetir esas reglas.
   - Alternativa descartada: unificar Juegos con `stald.css`. Es un cambio enorme y arriesgado para las salas
     (E2E de 60 juegos).
2. **Primer PR pequeño** con `ui.css` y los artefactos de este cambio, para que el agente de Inglés lo reuse. El
   segundo PR aplica el diseño a Juegos.
3. **Secciones nuevas sin `.game[data-juego]`.** Las E2E y `tests/e2e/lib/menu.js` cuentan `.game[data-juego]` como
   las tarjetas de la lista de una categoría. «Para ti» y «Copas» usan `.jg-tarjeta` con `data-jugar` (el clic se
   atiende junto con `data-juego` en `juegos/app/arranque.js`). «En vivo» usa `data-ir-tab`, no `data-tab`, porque
   muchas E2E hacen `click('[data-tab="partidas"]')` y deben seguir tocando la pestaña.
4. **Sin datos inventados.** El encabezado usa `/juegos/yo`: avatar, nick, `totalIndividual`, `totalPartidas` y
   `pos`. «Para ti» usa `mejores`, el mejor puntaje de la semana por juego. No hay nivel ni XP.
5. **Botones de 44 px.** En `juegos.css`: `.btn` y `.btn.sm` con `min-height: 44px`, `.tab` y `.chip-btn` con 44 px,
   «← Inicio» como botón real. En las páginas de juego solo se ajustan las reglas de menú (`.btn.chico` de 42 a
   44 px, `.btn` de Plataformas en pantallas bajas, foco visible). No se tocan el canvas, los HUD ni los
   `button{min-height:32px}` genéricos de los controles en partida.
6. **Tema.** `juegos.html` aplica `stald_tema` en `<head>` (el mismo script de `ingles.html`). `juegos.css` agrega el
   bloque `:root[data-theme="dark"]`. La regla con `prefers-color-scheme` ya respetaba `data-theme="light"`.
7. **Rendimiento.** Todo el estilo nuevo es de menús y overlays: sin `backdrop-filter`, sin animaciones infinitas y
   sin sombras sobre el iframe del juego. El iframe de Arcade (`.arcade-caja`) no cambia, así que los fps de Karts y
   Anillos siguen igual.

## Riesgos

- Una E2E que compare el texto exacto de una tarjeta `.game`. Mitigación: la píldora «▶ Jugar» va con
  `aria-hidden="true"` al final y las E2E de menú usan `includes`. Se corre la suite de Juegos completa.
- La altura de 44 px en `.btn.sm` puede alargar filas de botones chicos en salas. Mitigación: capturas a 360 px y la
  suite de salas.
