## ADDED Requirements

### Requirement: Entrada de Inglés sin el formulario mientras carga
`ingles.html` SHALL empezar con la entrada (`#login`) y la app (`#app`) ocultas con estilo en línea, para que valga
aunque el CSS no haya llegado:
- sin sesión, SHALL mostrar la entrada;
- con sesión, SHALL mostrar la app al llegar los datos, sin enseñar antes el formulario de correo;
- si la primera carga falla, SHALL mostrar la entrada con el aviso del error.

#### Scenario: Con sesión desde el portal
- **WHEN** una alumna con sesión toca «Inglés» en el portal
- **THEN** no ve el formulario de correo en ningún momento y, al cargar, ve su tablero

#### Scenario: Sin sesión
- **WHEN** alguien sin sesión abre `ingles.html`
- **THEN** ve la entrada con correo y contraseña

#### Scenario: Error en la primera carga
- **WHEN** `/ingles/data` falla al entrar
- **THEN** ve la entrada con «⚠️» y el motivo

### Requirement: Nivel de inglés y nivel del juego con nombres distintos
El nivel de inglés de la alumna o el alumno SHALL mostrarse como «🎓 Inglés <nivel>» (p. ej. «🎓 Inglés A1»). El nivel
del juego (XP) SHALL mostrarse como «Nv. <n> · <rango>» (p. ej. «Nv. 3 · Exploradora»), con `Nv.` como abreviatura de
«Nivel del juego».

Aplica en el tablero de Inglés, el de Secundaria y el resultado de la clase por pasos. Solo cambian el texto y el
estilo; las fórmulas de nivel y XP no cambian.

#### Scenario: Tablero de Inglés
- **WHEN** un alumno de nivel A1 con 310 XP abre «🏠 Inicio»
- **THEN** ve «🎓 Inglés A1» en su tarjeta y «Nv. 2 · Aprendiz» en la barra del juego

#### Scenario: Tablero de Secundaria
- **WHEN** la alumna de Secundaria abre su tablero
- **THEN** la barra del juego dice «Nv. <n> · <rango>»
