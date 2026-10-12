## ADDED Requirements

### Requirement: Código de Juegos organizado por responsabilidad
`juegos.html` SHALL contener solo la estructura de la página (HTML, `<link>` y `<script>`). Sus estilos SHALL vivir en
`juegos/app/juegos.css` y su código en scripts clásicos de `juegos/app/` (sin build ni módulos ES), uno por
responsabilidad, cargados en un orden fijo y con `?v=N` para el caché. Partir la página SHALL NOT cambiar su
comportamiento: los mismos juegos, pantallas, rutas del servidor, nombres globales y datos en `localStorage`.

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
- **THEN** `juegos.html`, `juegos/app/juegos.css` y cada script de `juegos/app/` responden 200

#### Scenario: Avance de Arcade con una sola implementación
- **WHEN** un alumno juega Axo y los 12 mundos, Karts Turbo o Dragon Run
- **THEN** su avance se lee y se guarda en `/juegos/progreso/<juego>` con la misma lógica (escrituras encadenadas,
  versión `v` y un reintento ante `version_vieja` si ya se leyó el avance)
- **AND** Futbolito y Billar siguen sin pedir avance al servidor
