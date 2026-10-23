## Why

El profe pidió (2026-10-22, aprobado): que cada motor de juego se cargue **solo cuando se abre su juego**, para que el
menú de Juegos cargue mucho más rápido en celular. Es la parte 1 de `navegacion-rendimiento` (propuesta que dejó la
auditoría `navegacion-dispositivos`).

Hoy `juegos.html` pide de entrada 4 hojas de estilo y 44 scripts aunque la persona solo vea las categorías o la entrada
de invitado: todos los motores (Karts, tableros, cartas, salas grandes, física…) y todas las pantallas de juego.
Línea base medida en este cambio con caché vacía y red 4G simulada (perfil «Slow 4G» de Lighthouse: 150 ms,
1.6 Mbps):

| Dónde | Caso | Archivos | KB | Menú usable |
|---|---|---:|---:|---:|
| Local (sin compresión) | celular 360 | 48 | 1110 | 6.67 s |
| Local (sin compresión) | PC 1280 | 48 | 1110 | 6.64 s |
| Producción (gzip de Pages, sin sesión) | celular 360 | 49 | 392 | 3.29 s |
| Producción (gzip de Pages, sin sesión) | PC 1280 | 49 | 392 | 3.07 s |

## What Changes

- **Shell mínimo:** `juegos.html` carga solo lo del hub: `estilos/ui.css`, `juegos/app/juegos.css`, `comun/auth.js`,
  `comun/interruptores.js`, `juegos/emocion.js` (sonido compartido; lo usa el menú de música) y los scripts de
  `juegos/app/` del hub (`nucleo.js`, `cargador.js` nuevo, `menu.js`, `ranking.js`, `admin.js`, `musica.js`,
  `arranque.js`).
- **Cargador (`juegos/app/cargador.js`, nuevo):** lista los archivos de juego con su `?v=` en el orden de dependencias de
  antes y los agrupa en paquetes por familia (individuales, Inglés con gramática, Línea del tiempo, Mente ágil,
  Clásicos, Naipes, Tablero, Clásicos rápidos, Arcade, salas grandes y «todo»). Al elegir un juego inyecta los
  `<script>`/`<link>` que falten (descarga en paralelo con `preload`, ejecución en orden y se detiene en la primera
  falla), cachea la promesa de cada archivo para no pedirlo dos veces y muestra «Cargando…»; si la red falla, un aviso
  amable con «🔄 Reintentar» y «← Volver». Si el paquete ya está, abre el juego al instante, igual que antes.
- **Salas:** 👥 Partidas, unirse por código, `?sala=` (y `&ver=1`), volver a una sala tras recargar, revancha y
  reanudar un juego individual cargan primero el paquete «todo» (el código de las salas atiende a cualquier juego).
  Dibuja y adivina también (su botón «Crear partida» abre Partidas con el juego ya elegido).
- **Catálogo sin motores:** las tarjetas de Clásicos rápidos (Gato, Conecta 4, Piedra-papel-tijera, Ahorcado,
  Serpientes) y de Tablero (Damas, Batalla naval, Dominó, Parchís) pasan de `clasicos-rapidos-ui.js`/`tablero-ui.js` a
  `JUEGOS` en `juegos/app/menu.js` (mismos datos y orden); los módulos exponen `ClasicosRapidosUI.jugar(id)` y siguen
  con `TableroUI.elegir(id)`. «📖 Cómo se juega» busca los textos de los módulos cuando ya están cargados.
- **Bots compartidos:** `BOTS` y `BOT_EXTRA` pasan de `salas.js` a `nucleo.js` (los usan Tablero y Bingo en
  individual).
- **Sin cambios de lógica de juego** (canvas, física, reglas), de servidor, de contrato HTTP ni de datos.
- **E2E nueva `juegos-carga`:** mide archivos, KB y tiempo con 4G en celular y PC, exige el tope (≤ 15 archivos y menú
  usable en ≤ 3 s en celular 4G, fijados con la medición) y prueba la carga al elegir un juego, «Cargando…», el error
  con «Reintentar», 👥 Partidas y los enlaces profundos (`?sala=`, `&ver=1`, `#cat=`, `?registro=1`).

## Capabilities

### Modified Capabilities
- `juegos`: requisito «Código de Juegos organizado por responsabilidad» (shell + paquetes perezosos) y requisito nuevo
  «Carga perezosa del código de cada juego».

## Impact

- Superficies: `juegos.html` y el código del cliente de Juegos (`juegos/app/*.js`, `juegos/tablero-ui.js`,
  `juegos/clasicos-rapidos-ui.js`). No toca `index.html`, `ingles.html`, `secundaria.html`, el servidor Deno, Postgres,
  Realtime, Auth, el repo de datos ni Notion.
- Pruebas: `tests/e2e/e2e-juegos-carga.js` (nueva) y `tests/e2e/correr.sh`; ajustes en las E2E que evaluaban motores
  recién abierta la página (cargan antes su paquete con `cargarPaquete`).
- Docs: `docs/frontend-standards.md` (estructura de `juegos/app/` y `?v=` de los archivos perezosos), `docs/pruebas.md`;
  `openspec/changes/navegacion-rendimiento/proposal.md` anota que la parte 1 la cubre este cambio.
- Peticiones al servidor de datos: las mismas (la E2E `peticiones` no cambia sus presupuestos).
- Matriz de acceso: sin cambios; solo cambia cuándo el navegador descarga código público del sitio.
- Coordinación: otro agente cambia la navegación de Inglés y Secundaria (`navegacion-mejoras`) y no toca `juegos/`.

## Acciones externas

- Ninguna. GitHub Pages publica con el merge a `main` (verificación en producción a cargo del agente).

## Cómo revertir

Revertir el PR (solo estáticos y pruebas).
