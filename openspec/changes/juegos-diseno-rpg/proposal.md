## Why

El profe pidió (2026-10-22) aplicar a Juegos el diseño RPG que ya tiene Secundaria (cambio `secundaria-dashboard`):
tarjetas, chips de color, barras, modo claro y oscuro y botones que se vean como botones. Hoy la entrada de
`juegos.html` es un título, un botón «🆕 Registrar», las pestañas y las tarjetas de categoría. El jugador solo se ve
en el chip de arriba. Varios botones miden menos de 44 px: `.btn.sm`, las pestañas, «← Inicio», 🔇 y los
`.btn.chico` de los menús de Billar, Futbolito y Fútbol Estelar. Juegos tampoco respeta el tema elegido en el portal
(`stald_tema`).

Los tokens RPG viven solo en `ingles/secundaria.css`. Para que Inglés y Juegos usen los mismos, se pasan a un CSS
común.

## What Changes

- **CSS común `estilos/ui.css`** (primer PR, pequeño): los tokens RPG (`--rpg-*`, claro y oscuro) y los componentes
  RPG reutilizables de Secundaria (`.rpg-num`, `.rpg-etiqueta`, `.rpg-xp-barra`, `.rpg-xp-chip`, `.rpg-dato*`,
  `.rpg-contador`). Salen de `ingles/secundaria.css` sin cambiar cómo se ve Secundaria. Usan respaldos
  (`var(--r-md, 18px)`) para funcionar con los tokens de `estilos/stald.css` y con los de `juegos/app/juegos.css`.
  Inglés (otro agente) puede usarlo igual.
- **Entrada de Juegos estilo RPG** (`juegos/app/menu.js`):
  - encabezado `#jg-heroe` con el avatar, el nick, ⭐ puntos individuales, 👥 puntos de partidas y el lugar de la
    semana. Todo sale de `/juegos/yo`. No hay nivel ni XP en Juegos y no se inventan;
  - en «🎮 Juegos», antes y después de las categorías:
    - «⭐ Para ti»: hasta 3 juegos con tu mejor puntaje de la semana (`mejores`), cada uno con chip de categoría, su
      color y un botón «▶ Jugar». Sin puntajes, un estado vacío amable;
    - las categorías, sin cambios de contenido;
    - «👥 En vivo · Salas»: «➕ Crear partida» y «🔑 Unirme con código» (llevan a la pestaña Partidas);
    - «🏆 Copas»: Karts Turbo y Fútbol Estelar, los juegos con copas, con «▶ Jugar»;
  - tarjetas de juego (`.game`) con franja de color de su categoría y una píldora «▶ Jugar».
- **Botones reales en todo Juegos** (`juegos/app/juegos.css` y los menús de `juegos/*.html`):
  - fondo, borde, padding, hover, foco visible, estado deshabilitado y 44 px o más en `.btn` (también `.btn.sm`),
    pestañas, `.opt`, «← Inicio», 🔇 y el chip del avatar, opciones de música, avatar y color, y `.adm-sub`;
  - en Karts, Fútbol Estelar, Futbolito Arena, Billar, Golf, Futbolito, Brigada, Plataformas y Dragon Run, los
    botones de menú y overlays (`.btn`, `.btn.chico`) miden 44 px o más y tienen foco visible;
  - no se tocan la lógica ni el canvas. Las piezas del tablero (celdas, cartas y fichas) siguen igual.
- **Tema:** `juegos.html` lee `stald_tema` como `ingles.html`. `juegos.css` agrega `:root[data-theme="dark"]` y
  respeta `data-theme="light"`.
- **Ranking:** mismo contenido, en tarjetas RPG; los estados vacíos siguen.

### No-objetivos

- Nivel, XP, insignias o misiones en Juegos. No hay datos para eso.
- Lista de salas abiertas. No existe la ruta en el servidor, así que «En vivo» lleva a Partidas.
- Cambiar la lógica, el canvas o los HUD dentro de las partidas.
- Tailwind, Font Awesome o fuentes externas en Juegos.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisitos nuevos (ADDED) «Entrada de Juegos con estilo RPG» y «Botones reales en Juegos».
- `plataforma`: requisito nuevo (ADDED) «Estilos RPG compartidos».

## Impact

- Superficies:
  - `estilos/ui.css` (nuevo), `ingles/secundaria.css` y `ingles.html` (sin cambio visual);
  - `juegos.html`, `juegos/app/juegos.css`, `juegos/app/menu.js`, `juegos/app/ranking.js` y `juegos/app/arranque.js`;
  - los `<style>` de `juegos/karts.html`, `futbol.html`, `futbolito-arena.html`, `billar.html`, `golf.html`,
    `futbolito.html`, `brigada.html`, `plataformas.html` y `dragon-run.html` (solo botones de menú);
  - E2E nueva `juegos-diseno` y `docs/frontend-standards.md`.
- Sin cambios en el servidor, Postgres, Realtime, Auth, Notion ni el repo de datos. No cambia el contrato HTTP.
- Matriz de acceso (sin cambios): cada jugador ve sus propios puntos y mejores de la semana (`/juegos/yo`, de su
  sesión), y el ranking muestra lo mismo que antes (nick y avatar, nunca correos).
- Acciones externas: ninguna. Pages publica con el merge a `main`.
