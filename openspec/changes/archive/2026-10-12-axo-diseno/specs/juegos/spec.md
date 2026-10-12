## ADDED Requirements

### Requirement: Diseño visual de Axo y los 12 mundos
«Axo y los 12 mundos» SHALL verse pulido sin cambiar sus reglas, su física, sus puntos ni el formato del progreso
guardado, con arte propio dibujado en canvas o SVG (sin imágenes externas ni personajes o marcas registradas):
- Axo SHALL ser un ajolote con branquias, ojos, sonrisa y cola, con animaciones de caminar, saltar, caer, daño y
  victoria; con champiñón SHALL verse más grande y con chile de fuego SHALL cambiar de tono; durante la
  invulnerabilidad SHALL verse translúcido sin parpadeo fuerte;
- cada mundo jugable SHALL tener un fondo con paralaje de 2 a 3 capas (pradera: colinas y nubes; desierto: dunas y
  sol; hielo: montañas nevadas y auroras; volcán: humo y brillo de lava) y los castillos su propio escenario;
- los tiles SHALL tener borde, sombra y textura; las monedas SHALL girar; los enemigos y el jefe SHALL tener cara y
  detalles propios de cada mundo;
- SHALL haber partículas ligeras: polvo al aterrizar, chispas al tomar monedas y nieve o ceniza según el mundo;
- el mapa de mundos SHALL mostrar un camino ilustrado con un nodo por nivel y el castillo del jefe, candados en los
  mundos «Próximamente» y el progreso guardado (niveles superados, nivel que sigue y avance de los 12 mundos);
- el HUD y los botones táctiles SHALL ser legibles y no SHALL tapar el nivel en un celular vertical de 390×844;
- las capas estáticas SHALL pre-dibujarse fuera de pantalla para sostener 60 cuadros por segundo, y con
  `prefers-reduced-motion` el juego SHALL quitar el paralaje y las partículas.

#### Scenario: Axo con poderes
- **WHEN** Sofy toma un champiñón y después un chile de fuego
- **THEN** Axo se ve más grande y luego cambia de tono, y al recibir un golpe queda translúcido 1.5 s sin parpadear

#### Scenario: Fondo de cada mundo
- **WHEN** Angel juega el nivel 3-1
- **THEN** ve montañas nevadas y auroras que se mueven a distinta velocidad que el piso, y cae nieve

#### Scenario: Mapa con avance
- **WHEN** Marisol, con el 1-1 y el 1-2 superados, abre el mapa
- **THEN** ve el camino de la Pradera con el 1-1 y el 1-2 marcados como superados, a Axo junto al castillo 1-3 y
  candados en los mundos 5 a 12

#### Scenario: Celular vertical
- **WHEN** alguien juega en un celular de 390×844
- **THEN** el HUD queda sobre el cielo, fuera del área del nivel, y los botones táctiles quedan debajo del juego

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** el fondo no hace paralaje y no hay partículas de ambiente, polvo ni chispas
