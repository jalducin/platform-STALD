## Context

`juegos.html` es un shell de scripts clásicos (cambio `organizar-codigo`): todos los `const`/`function` de nivel superior
son globales compartidos y el orden de los `<script>` es el orden de dependencias. Antes de este cambio cargaba 48
archivos (4 CSS y 44 JS) de entrada. Para decidir qué puede esperar se analizó cada archivo con `acorn` +
`eslint-scope` (referencias que se resuelven en otro archivo y si se evalúan **al cargar** o **al llamar**):

- Al cargar, el hub solo necesitaba de los motores: `ClasicosRapidosUI.TARJETAS` y `TableroUI.TARJETAS`
  (`menu.js`) y `ClasicosRapidosUI.AYUDA` (`arranque.js`). Todo lo demás se usa al llamar.
- Dependencias al cargar entre archivos de juego: `clasicos.js` → `basta.js`; `tablero-ui.js` → `tablero.js`;
  `clasicos-rapidos-ui.js` → `clasicos-rapidos.js`; `futbolito-motor.js` → `fisica.js`; `arcade.js` y `karts-copa.js`
  → `karts-pistas.js`; `bingo.js`, `blackjack.js`, `dibuja.js`, `memo-sopa-sala.js` → `salas-grandes.js`; y `salas.js`
  → `tablero-ui.js`, `clasicos-rapidos-ui.js`, los 4 de salas grandes, `basta.js` y `reloj-sala.js`.
- Las partes individuales de `individuales.js`, `mente.js`, `clasicos.js`, `naipes.js`, `arcade.js` (hasta la sección
  «en sala»), `tablero-ui.js` y `clasicos-rapidos-ui.js` no tocan nada de `salas.js`, salvo `BOTS`/`BOT_EXTRA`
  (Tablero y Bingo en individual).
- No hay nombres globales repetidos entre archivos (cambiar el orden no cambia quién «gana»), ningún archivo depende de
  `DOMContentLoaded`/`load` y los CSS perezosos (`tablero.css`, `clasicos-rapidos.css`) solo tienen clases `tb-`/`cr-`.

## Goals / Non-Goals

**Goals:** menú de Juegos con ≤ 15 archivos y usable en ≤ 3 s en celular con 4G; cada juego trae solo su paquete al
abrirse; enlaces profundos, recarga, salas en vivo, copas, revancha y espectador intactos; misma experiencia dentro de
cada juego.

**Non-Goals:** cambiar la lógica de los juegos, módulos ES o un *bundler*; precargar juegos «populares» en segundo plano
(puede venir después); partir `salas.js` por juego.

## Decisions

### 1. Paquetes por familia en un cargador clásico (`juegos/app/cargador.js`)
- `ARCHIVOS_JUEGO`: los 34 JS y 2 CSS perezosos **con su `?v=`**, en el orden que tenían en `juegos.html` (que ya es un
  orden de dependencias válido). Es la única fuente de los `?v=` de esos archivos.
- `PAQUETES`: cada uno lista archivos o paquetes; `archivosDe()` expande, quita repetidos y **ordena por
  `ARCHIVOS_JUEGO`**. Cada paquete incluye las dependencias al cargar de sus archivos, así cualquier combinación de
  paquetes ya cargados respeta el orden relativo de antes.
- `PAQUETE_DE_JUEGO`: id del juego → paquete. Un id sin entrada usa «todo» (nunca falla por olvido).

| Paquete | Archivos (además de `individuales.js`) | Juegos |
|---|---|---|
| `marco` | — | Vocabulario, Spelling, Memorama, Maratón, Ortografía, Ordena (es), Cálculo, Simón, Sopa |
| `ingles` | `ingles-gramatica.js` | Completa y responde, Ordena (en), Máquina del tiempo |
| `linea` | `linea-tiempo.js` | Línea del tiempo |
| `mente` | `ajedrez.js`, `app/mente.js` | Sudoku, Ajedrez |
| `clasicos` | `basta.js`, `una.js`, `app/clasicos.js` | Basta (es/en), ¡Una!, Lotería |
| `naipes` | `cartas.js`, `app/naipes.js` | Póker, Brisca, Conquián |
| `tablero` | `tablero.css`, `tablero.js`, `tablero-ui.js` | Damas, Batalla naval, Dominó, Parchís |
| `rapidos` | `clasicos-rapidos.css`, `clasicos-rapidos.js`, `clasicos-rapidos-ui.js` | Gato, Conecta 4, PPT, Ahorcado, Serpientes |
| `arcade` | `app/arcade.js` | Axo, Karts, Dragon Run, Fútbol, Futbolito Arena, Billar, Brigada, Golf, Futbolito |
| `grandes` | `naipes` + `salas-grandes.js`, `bingo.js`, `blackjack.js`, `dibuja.js`, `memo-sopa-sala.js` | Bingo, Blackjack |
| `todo` | todos | Dibuja y adivina, 👥 Partidas y toda entrada a una sala |

- Alternativa descartada: paquetes de un archivo con un grafo de dependencias declarado a mano por archivo (más fino,
  más fácil de romper). Otra: `import()` de módulos ES (exige reescribir los globales compartidos de `organizar-codigo`).
- `grandes` registra siempre los 4 juegos de salas grandes en el mismo orden: `salas.js` arma la lista de «Crear
  partida» con `Object.keys(SALAS_GRANDES)` y el orden de las opciones no debe depender de qué se abrió primero.

### 2. Descarga en paralelo, ejecución en orden y alto en la primera falla
- Por cada JS pendiente del paquete se agrega `<link rel="preload" as="script">` (descargas en paralelo, una sola
  petición por archivo) y luego se inyectan los `<script>` **uno tras otro** (cada uno espera el `load` del anterior,
  ya descargado). Los CSS se insertan en paralelo y el paquete espera su `load`.
- Se descartó `async = false` con todos los `<script>` a la vez: si uno falla, los siguientes se ejecutan igual; un
  script clásico que truena a medias deja sus `const` en zona muerta para siempre y al reintentarlo el navegador
  reporta «ya declarado». Con la cadena, ante una falla no se ejecuta nada de lo que sigue y el reintento solo vuelve a
  pedir lo que faltó.
- `cargas[ruta]` guarda la promesa de cada archivo (marca `listo` al cargar; se borra si falla, para reintentar). Un
  archivo nunca se inyecta dos veces, aunque dos paquetes lo pidan a la vez.
- Cascada de estilos igual que antes: `tablero.css` se inserta **antes** de `juegos/app/juegos.css` y
  `clasicos-rapidos.css` **justo después**.
- Sin tiempo límite propio: si el navegador no termina la descarga, no se reinyecta (evita ejecutar dos veces).

### 3. Puntos de entrada
- `conPaquete(nombre, contenedor, fn, volver)`: si el paquete está listo llama a `fn` **al instante** (mismo
  comportamiento síncrono de antes, p. ej. `unirseCodigo` pinta Partidas y escribe en `#p-msg` en el mismo turno); si
  no, pinta «Cargando…» en el contenedor, carga y llama a `fn` solo si esa pantalla sigue a la vista; ante una falla
  pinta el aviso con «🔄 Reintentar» (`[data-reintentar-carga]`) y «← Volver».
- `abrirJuego(j)` (tarjetas, «▶ Jugar» de Para ti/Copas y «🔁 Jugar otra vez»): `limpiar()` y `conPaquete` del
  paquete del juego en `#app`; luego el «Preparando…» y `j.jugar()` de siempre.
- `pantallaHub('partidas')`: `conPaquete('todo', #tab-body, pintarPartidas)` (Volver = pestaña 🎮 Juegos). El botón
  «👥 En vivo · Salas» del hub espera a que se pinte para enfocar el campo.
- `iniciar()`: antes de `?sala=` (unirse o `&ver=1`), sala guardada, revancha guardada o juego individual guardado,
  `await cargarPaquete('todo')`; `salaPendiente` se consume después de cargar, así «Reintentar» de la pantalla de
  error vuelve a intentar la misma sala. `hayPartidaGuardada()` (nuevo en `nucleo.js`) evita cargar «todo» si no hay
  nada que reanudar.
- `arranque.js`: el bloque de clics de la sala sale si `typeof sala === 'undefined'` (todavía no hay código de
  salas); «📖 Cómo se juega» busca `ClasicosRapidosUI.AYUDA`, `TableroUI.ayuda` y `AYUDA_GRANDES` con `window.…?.`.

### 4. Catálogo sin motores
Las 9 tarjetas de Clásicos rápidos y Tablero se mueven tal cual a `JUEGOS` (mismo orden: al final, Clásicos rápidos y
luego Tablero). `tablero-ui.js` toma el título de `juegoPorId(id)`; `clasicos-rapidos-ui.js` expone `jugar(id)`.
`BOTS` y `BOT_EXTRA` pasan a `nucleo.js` (núcleo) sin cambiar sus datos.

### 5. Medición
E2E `juegos-carga`: caché vacía (`Network.setCacheDisabled`) y 4G por CDP (`Network.emulateNetworkConditions`: 150 ms,
1.6 Mbps de bajada y 750 Kbps de subida). «Archivos» = toda petición que no va al API (HTML, CSS, JS, JSON, imágenes y
CDN); KB = `encodedDataLength`; «menú usable» = `performance.now()` cuando `[data-categoria]` ya mide en pantalla (los
escuchas de clic se registran antes de `iniciar()`). Mediana de 3. `MEDIR=1` solo imprime (línea base).

## Risks / Trade-offs

- [Primer juego un poco más lento] → solo trae su paquete (unos KB); el menú ya no paga los 48 archivos.
- [Partidas trae todo] → igual que antes de este cambio, pero solo al entrar a Partidas o a una sala.
- [Un juego nuevo sin entrada en `PAQUETE_DE_JUEGO`] → abre con «todo» (correcto, solo menos óptimo); la regla queda en
  `docs/frontend-standards.md`.
- [`?v=` en dos lugares] → `juegos.html` para el núcleo y `ARCHIVOS_JUEGO` para lo perezoso; documentado.
- [E2E que evaluaban motores recién abierta la página] → llaman antes a `cargarPaquete(...)`.
- [Interacción durante la carga] → `conPaquete` solo pinta si su pantalla sigue a la vista.

## Migration Plan

Sin migración de datos. Publica GitHub Pages con el merge; verificación en producción: archivos al abrir
`juegos.html`, un juego individual y una sala.
