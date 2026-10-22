# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-22
- Cambio: juegos-diseno-rpg (PR 1 #231 ya fusionado; este reporte es del PR 2)
- Agente: Claude (agente de Juegos) y subagente `verificador-pruebas`

## Comandos ejecutados

- `npx -y deno test -A server/`
- `node tests/calidad/calidad.mjs --detalle`
- E2E de Juegos completas, en los puertos 8931/8932 y sobre una copia temporal de
  `jalducin/platform-STALD-data` (`gh repo clone` al scratchpad, sin push):

  `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 8931 --puerto-web 8932 login portal privacidad juegos
  categorias juegos-diseno juegos-ingles jugadores nick partidas enlace-sala juegos-recarga revancha conquian-estres
  clasicos fusion cultura-conocimiento sudoku dragon-run plataformas karts karts-puntos karts-vivo futbol
  futbol-en-linea futbolito-arena brigada futbolito billar golf puntos-tipo basta-rondas loteria-sala una-sala una-robo
  poker cartas-espanolas ajedrez clasicos-rapidos juegos-tablero ajustes-salas ritmo avatar-foto peticiones
  ranking-juegos salas-grandes mando emocion espectador login-despues`
- Repeticiones dirigidas de las que fallaron, y las mismas pruebas en `origin/main` (checkout separado) como
  línea base: `portal`, `revancha` y `peticiones`.
- PR 1: `secundaria-dashboard` y `secundaria-clase` con `--hoy 2026-10-27`.

## Resultados de pruebas

- **Unitarias del servidor:** 981 pasaron, 0 fallaron, 6 omitidas.
- **Calidad:** sin avisos en `juegos.html`, `juegos/app/juegos.css`, `estilos/ui.css` ni en la E2E nueva. Los avisos de
  complejidad cognitiva (S3776) de `arranque.js`, `menu.js` y de las páginas de juego son de funciones que este cambio
  no tocó. Los clics nuevos van en un listener propio de `menu.js` para no subir la complejidad de `arranque.js`.
- **`juegos-diseno` (nueva):** 67 PASS, 0 FAIL.
  - Incluye encabezado, secciones, «Para ti» vacío y con puntajes, «En vivo», «Copas», 44 px, foco, contraste AA y
    sin scroll a 360 px, en claro, en oscuro y con `stald_tema`.
  - También los menús de Karts, Fútbol Estelar, Billar y Golf sin ningún botón visible menor a 44 px. Los controles
    del mando (`tabindex=-1`) quedan fuera; los `.mini` del HUD no están visibles en el menú.
- **Primera corrida completa:** 42 PASS y 8 FAIL, en unas 1 h 38 min.
  - Al repetirlas pasaron `karts` (426/0), `futbolito` (55/0), `una-robo` (6/0) y `salas-grandes` (64/0): eran fallas
    intermitentes por fps o tiempos con la máquina cargada.
  - **`revancha`:** 4 páginas abren `juegos.html` a la vez y el `http.server` de Python (cola de 5 conexiones) rechazaba
    conexiones en Windows. Faltaban scripts (`TableroUI is not defined`), y el CSS extra de `estilos/ui.css` sumaba
    una petición más. Se arregló el entorno de pruebas: `correr.sh` sirve los estáticos con
    `ThreadingHTTPServer` y una cola de 128. Después: `revancha` 20/0.
  - **`portal`** («Inglés entra sin volver a pedir el correo»): carrera de tiempo en `ingles.html`, que este cambio no
    toca. Después del arreglo del servidor de estáticos pasó en 3 corridas seguidas (16/0).
  - **`peticiones`:** 6 presupuestos excedidos por exactamente 1 `GET /interruptores` (cambio `rpg-privacidad`). Falla
    igual en `origin/main` (5/6): no es de este cambio.
  - **`karts-vivo`:** fps de 48 a 54 contra el mínimo de 55 con CPU ×4 y 8 karts, y una falla de «estrella» (cohete e
    inmunidad, lógica de partida). El cambio no toca el canvas ni `karts.html` más allá de `mando.js?v=3`, y
    `.arcade-caja` sigue igual. Lo atribuyo a la carga de la máquina (la suite completa corrió en paralelo con otros
    agentes).
- **PR 1:** `secundaria-dashboard` 83/0 y `secundaria-clase` 35/0.

## Verificación de estado

- Antes: copia temporal del repo de datos en el scratchpad. `correr.sh` la vuelve a copiar en cada fase y la original
  nunca se modifica.
- Después: sin push al repo de datos, sin Postgres (`--pg` no se usó) y sin tablas `stald_`. La E2E nueva no escribe en
  el servidor: «Para ti» se prueba con `state.mejores` solo en la página.
- Estado restaurado: Sí. No hubo nada que restaurar.

## Resultado

- Estado Step 4: PASS para el cambio.
- Bloqueos:
  - ninguno propio;
  - `peticiones` falla también en `main` (presupuesto sin `/interruptores`): queda para el cambio `rpg-privacidad`.
