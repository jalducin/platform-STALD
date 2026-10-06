## ADDED Requirements

### Requirement: Autoguardado del avance en el aparato
El reproductor de actividades y exámenes (Inglés, Ruta del profe y Secundaria) SHALL guardar el avance de cada
intento en el `localStorage` del aparato, con una clave por ámbito, persona (hash corto del correo, nunca el correo
en claro), elemento e intento, y SHALL restaurarlo al volver a abrir el mismo intento. El borrador NUNCA SHALL
enviarse al servidor. SHALL funcionar con opción múltiple, respuesta escrita y pronunciación, en lista y en modo
paso, y no SHALL tocar las preguntas fijas de la corrección. La vista previa del admin no SHALL guardar borrador.

#### Scenario: Recargar no pierde respuestas
- **WHEN** la alumna contesta una pregunta de opción múltiple y una escrita, recarga la página y vuelve a abrir el examen
- **THEN** ambas respuestas aparecen marcadas y escritas, el avance cuenta 2 respondidas y se avisa «Recuperamos tus 2 respuestas»

#### Scenario: Modo paso continúa donde se quedó
- **WHEN** se restaura un borrador en una pantalla de menos de 600 px
- **THEN** la pregunta visible es la primera sin contestar

#### Scenario: Volver y reabrir
- **WHEN** la alumna toca «← Volver» con respuestas sin enviar y vuelve a abrir el mismo examen
- **THEN** sus respuestas siguen ahí

#### Scenario: Ids que ya no existen
- **WHEN** el borrador trae una pregunta que no está en el intento abierto
- **THEN** se ignora sin error y solo se restauran las que existen

#### Scenario: Corrección con preguntas fijas
- **WHEN** se abre la corrección (intento 2) de una actividad
- **THEN** el borrador es del intento 2 y no cambia las respuestas fijas del intento anterior

#### Scenario: Sin correo en claro
- **WHEN** se guarda un borrador
- **THEN** ni la clave ni el valor contienen el correo de la persona

#### Scenario: Sin almacenamiento disponible
- **WHEN** el navegador no permite `localStorage`
- **THEN** el examen funciona como antes, sin error

### Requirement: Borrado y caducidad del borrador
El borrador SHALL borrarse al enviar el intento con éxito, al abrir un intento posterior del mismo elemento, al
abrir un elemento ya terminado y al tocar «Cerrar sesión» en Inglés. Los borradores con más de 14 días SHALL
borrarse al cargar el reproductor o abrir un elemento. Si el envío falla, el borrador SHALL conservarse.

#### Scenario: Enviar borra el borrador
- **WHEN** la alumna envía el examen y ve su resultado
- **THEN** ya no existe el borrador de ese intento

#### Scenario: Envío fallido
- **WHEN** el servidor rechaza el envío
- **THEN** el borrador sigue guardado

#### Scenario: Borrador viejo
- **WHEN** hay un borrador guardado hace 15 días y se abre la página
- **THEN** ese borrador se borra

### Requirement: Avisos de guardado y protección al salir
Mientras un examen está abierto, el reproductor SHALL mostrar «Tu avance se guarda solo en este aparato ✔» y,
tras cada guardado, «Guardado hace un momento». SHALL evitar el «jalar para recargar» con
`overscroll-behavior-y: contain` y SHALL pedir confirmación del navegador al salir o recargar si hay respuestas
sin enviar. Fuera del examen no SHALL haber ni confirmación ni bloqueo del desplazamiento.

#### Scenario: Indicador de guardado
- **WHEN** la alumna contesta una pregunta
- **THEN** el aviso dice «Guardado hace un momento»

#### Scenario: Recargar con respuestas pide confirmación
- **WHEN** hay respuestas sin enviar y la alumna recarga la página
- **THEN** el navegador pide confirmar antes de salir

#### Scenario: Tras enviar no hay bloqueo
- **WHEN** la alumna ya envió y está en su resultado
- **THEN** la página no lleva `examen-abierto` ni pide confirmación al salir
