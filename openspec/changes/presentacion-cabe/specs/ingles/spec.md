## ADDED Requirements

### Requirement: Diapositivas del Meet sin contenido cortado
El modo presentación del Meet («🎬 Presentar», solo admin) SHALL mostrar todo el contenido de cada diapositiva en
cualquier pantalla: 1920×1080, 1366×768, 1280×720, tablet 1024×768 y celular en horizontal o vertical, con o sin
pantalla completa. Si el contenido no cabe, primero SHALL reducir la escala de la letra del cuerpo, sin bajar de un
mínimo legible (70 % y 14 px). Si aun así no cabe, SHALL dejar el cuerpo con scroll y el aviso
«⬇️ Hay más · parte x/y». Las tablas SHALL tener scroll horizontal propio en lugar de recortarse, y los diagramas SHALL
pasar a columna cuando la diapositiva sea angosta. Ningún elemento SHALL quedar oculto por overflow sin scroll.

#### Scenario: Teoría que cabe al reducir la escala
- **WHEN** el admin presenta una diapositiva de teoría cuyo contenido supera por poco el alto disponible
- **THEN** la letra del cuerpo baja lo necesario y todo el contenido se ve sin scroll

#### Scenario: Teoría muy larga
- **WHEN** la diapositiva no cabe ni a la escala mínima (p. ej. una tabla de 7×4 con ejemplos y puntos en 1280×720)
- **THEN** aparece «⬇️ Hay más · parte 1/n», y → (o Espacio o un clic) baja una parte sin cambiar de diapositiva
- **AND** al llegar al final, el aviso dice «✅ Parte n/n · → sigue» y el siguiente → pasa a la diapositiva siguiente
- **AND** ← y ↑ suben por las partes antes de regresar a la diapositiva anterior

#### Scenario: Cambio de tamaño
- **WHEN** el admin entra o sale de pantalla completa, gira el celular o cambia el tamaño de la ventana
- **THEN** la diapositiva actual se vuelve a ajustar

#### Scenario: Celular vertical
- **WHEN** el admin presenta desde un celular en vertical (360×740)
- **THEN** la diapositiva ocupa el alto disponible y el texto mide al menos 10 px

### Requirement: Presentación con diseño RPG
El modo presentación SHALL usar el diseño RPG de la plataforma sin cambiar el contenido de los Meets:
- portada «⚔️ Misión de la semana» con emoji, título y mundo;
- agenda como «🗺️ Ruta de la misión», con pasos y tiempos;
- teoría en tarjetas, con chips y diagramas;
- práctica como «⚔️ Reto», juego como «🏟️ Arena» y libreta como «📒 Tarea»;
- cierre «🏆 ¡Misión cumplida!».

La barra SHALL tener botones reales de 44 px o más (anterior, siguiente, tema, pantalla completa y salir), el contador
«x / y» y una barra de progreso con `role="progressbar"`. SHALL ofrecer un modo oscuro pensado para proyector y un modo
claro. Por omisión SHALL seguir el tema de la página; el admin SHALL poder cambiarlo con ☀️/🌙 o con la tecla T, y la
elección SHALL recordarse.

#### Scenario: Sistema en modo oscuro
- **WHEN** el admin abre la presentación con el sistema en modo oscuro
- **THEN** la presentación usa el tema oscuro, y al pulsar T cambia al claro, con otro fondo de diapositiva

#### Scenario: Navegación
- **WHEN** el admin usa los botones «← Anterior» / «Siguiente →» o las flechas del teclado
- **THEN** la presentación avanza o regresa, y se actualizan el contador «x / y» y la barra de progreso
  (`aria-valuenow`)
