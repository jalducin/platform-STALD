## MODIFIED Requirements

### Requirement: Código de Juegos organizado por responsabilidad
`juegos.html` SHALL contener solo la estructura de la página (HTML, `<link>` y `<script>`). Sus estilos SHALL vivir en
`juegos/app/juegos.css` y su código en scripts clásicos de `juegos/app/` (sin build ni módulos ES), uno por
responsabilidad, con `?v=N` para el caché. `juegos.html` SHALL cargar en un orden fijo solo el núcleo del hub; el
código de cada juego (motores de `juegos/` y pantallas de `juegos/app/`) SHALL cargarlo `juegos/app/cargador.js` bajo
demanda, en el mismo orden relativo de dependencias y con el `?v=` de su lista. Partir la página o cargar por partes
SHALL NOT cambiar su comportamiento: los mismos juegos, pantallas, rutas del servidor, nombres globales y datos en
`localStorage`.

#### Scenario: La página carga igual que antes
- **WHEN** una alumna abre `juegos.html` en el celular (390 px) o en la computadora
- **THEN** ve el mismo menú, con todas las categorías y todos los juegos de `JUEGOS`
- **AND** la consola del navegador no muestra errores

#### Scenario: Los juegos de sala siguen usando los ayudantes de la página
- **WHEN** un alumno juega una partida de Bingo, Dominó o Gato con amigos
- **THEN** los scripts de `juegos/` (`salas-grandes.js`, `tablero-ui.js`, `clasicos-rapidos-ui.js`) encuentran los
  mismos ayudantes globales de antes (`sala`, `post`, `pintarFinalSala`, …) y la partida se juega igual

#### Scenario: Publicación completa
- **WHEN** el cambio llega a `main` y GitHub Pages lo publica
- **THEN** `juegos.html`, `juegos/app/juegos.css`, cada script de `juegos/app/` y cada archivo de la lista del
  cargador responden 200

#### Scenario: Avance de Arcade con una sola implementación
- **WHEN** un alumno juega Axo y los 12 mundos, Karts Turbo o Dragon Run
- **THEN** su avance se lee y se guarda en `/juegos/progreso/<juego>` con la misma lógica (escrituras encadenadas,
  versión `v` y un reintento ante `version_vieja` si ya se leyó el avance)
- **AND** Futbolito y Billar siguen sin pedir avance al servidor

## ADDED Requirements

### Requirement: Carga perezosa del código de cada juego
Al abrir `juegos.html`, el navegador SHALL descargar solo el núcleo del hub (shell, menú y categorías, encabezado,
ranking, admin, música, sesión y sonido compartido) y SHALL NOT descargar motores ni pantallas de juego. Al elegir un
juego, la página SHALL inyectar los scripts y estilos de su paquete que falten, con el `?v=` de cada archivo, mostrar
«Cargando…» mientras llegan y abrir el juego. Cada archivo SHALL pedirse una sola vez por página (la promesa queda en
caché); un juego ya cargado SHALL abrir al instante. Si la red falla, la página SHALL mostrar un aviso amable con
«🔄 Reintentar» y «← Volver», sin ejecutar a medias los archivos que siguen. 👥 Partidas, unirse por código, los
enlaces `?sala=` (también `&ver=1`), volver a una sala o a una revancha tras recargar y reanudar un juego individual
SHALL cargar primero el código de las salas y de todos sus juegos. La carga perezosa SHALL NOT agregar peticiones al
servidor de datos. Con caché vacía y red 4G simulada (150 ms, 1.6 Mbps), el menú SHALL abrir con 15 archivos o menos
y quedar usable en 3 s o menos en celular (E2E `juegos-carga`).

Matriz de acceso: sin cambios; solo cambia cuándo el navegador descarga código público del sitio.

#### Scenario: Menú sin motores
- **WHEN** una alumna abre `juegos.html` en su celular con red 4G y caché vacía
- **THEN** el menú de categorías queda usable en 3 s o menos con 15 archivos o menos
- **AND** no se descargó ningún motor ni pantalla de juego (Karts, tableros, cartas, salas…)

#### Scenario: Elegir un juego
- **WHEN** toca Gato por primera vez
- **THEN** ve «Cargando…», se piden `clasicos-rapidos.js`, `clasicos-rapidos-ui.js` y `clasicos-rapidos.css` con su
  `?v=` y abre la pantalla de Gato con los mismos estilos de antes
- **AND** si sale y vuelve a tocar Gato, abre sin pedir ningún archivo

#### Scenario: Falla de red al cargar un juego
- **WHEN** la descarga de un archivo de Damas falla
- **THEN** ve «No se pudo cargar el juego» con «🔄 Reintentar» y «← Volver»
- **AND** al tocar «Reintentar» con red, Damas abre

#### Scenario: Enlace de sala con caché vacía
- **WHEN** alguien abre `juegos.html?sala=KXQP` (o `?sala=KXQP&ver=1`) por primera vez en su aparato
- **THEN** la página carga el código de las salas antes de unirse (o de entrar como espectador) y ve la sala de espera
  o la partida como antes

#### Scenario: Partidas
- **WHEN** un alumno toca 👥 Partidas
- **THEN** ve «Cargando…» y luego el formulario de crear partida con la misma lista de juegos de antes

#### Scenario: Recarga en medio de una sala o de un juego
- **WHEN** recarga la página dentro de una sala, en el podio o a mitad de un juego que se reanuda
- **THEN** la página carga el código de los juegos y vuelve a la sala, ofrece la revancha o pregunta si continuar,
  como antes

#### Scenario: Sin peticiones extra al servidor
- **WHEN** se mide la E2E `peticiones` (hub y un juego individual, ranking, sala de 2 personas)
- **THEN** cada flujo queda en el mismo presupuesto de peticiones al API que antes
