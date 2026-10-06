## ADDED Requirements

### Requirement: Menú de administración unificado en Juegos
Juegos SHALL mostrar al admin una sola pestaña «🛡️ Admin», además de 🎮 Juegos, 👥 Partidas y 🏆 Ranking, que junte
las sub-secciones Jugadores, Pendientes, Invitados y Fotos, cada una con su contador. Un buscador único SHALL filtrar
la sub-sección activa por nombre, nick o correo, sin importar mayúsculas ni acentos. Cada lista SHALL desplazarse
dentro de su propio marco y, en el celular, mostrarse como tarjetas sin desplazamiento horizontal. La sub-sección
elegida SHALL guardarse en el navegador como preferencia de interfaz, sin datos personales. Nadie más que el admin
SHALL ver la pestaña.

#### Scenario: Barra de 4 pestañas
- **WHEN** el admin abre Juegos
- **THEN** la barra muestra 🎮 Juegos, 👥 Partidas, 🏆 Ranking y 🛡️ Admin, y ya no hay pestañas sueltas de
  Jugadores, Invitados ni Fotos

#### Scenario: Contadores
- **WHEN** el admin abre «🛡️ Admin»
- **THEN** cada sub-sección muestra cuántos elementos tiene (jugadores registrados, registros pendientes, invitados y
  fotos)

#### Scenario: Buscar en la sub-sección activa
- **WHEN** el admin escribe «valeria» en el buscador con la sub-sección Jugadores abierta
- **THEN** solo queda visible Valeria y se indica cuántas coincidencias hay
- **WHEN** nada coincide
- **THEN** se muestra «Nada coincide» con un botón para limpiar la búsqueda

#### Scenario: Sub-sección recordada
- **WHEN** el admin elige «Invitados» y vuelve a abrir Juegos
- **THEN** «🛡️ Admin» abre en «Invitados» y en el navegador solo se guarda el nombre de la sub-sección

#### Scenario: Celular
- **WHEN** el admin abre cualquier sub-sección en una pantalla de 390 px de ancho
- **THEN** las filas se ven como tarjetas, la lista se desplaza dentro de su marco y la página no se desplaza de lado

#### Scenario: Una fuente falla
- **WHEN** `/juegos/invitados` responde con error y las otras rutas responden bien
- **THEN** «Invitados» muestra el error con «Reintentar» y las demás sub-secciones funcionan

#### Scenario: Alumna sin pestaña
- **WHEN** una alumna abre Juegos
- **THEN** no ve «🛡️ Admin» y el servidor le responde 403 en `/juegos/jugadores`, `/juegos/invitados` y
  `/juegos/fotos`

## MODIFIED Requirements

### Requirement: Jugadores registrados para el admin
Juegos SHALL mostrar al admin, dentro de «🛡️ Admin», la sub-sección «Jugadores» con todos los jugadores registrados
(alumnos, alumnas e invitados) y la sub-sección «Pendientes» con los registros pendientes de cuentas de acceso. Cada
pendiente SHALL tener un botón para generar su enlace de acceso a Juegos, que se puede copiar o mandar por WhatsApp.
Las dos sub-secciones SHALL poder descargarse en CSV. Nadie más SHALL ver estas sub-secciones ni los correos.

#### Scenario: Registro que no terminó
- **WHEN** alguien creó su cuenta pero no confirmó el correo
- **THEN** aparece en «Pendientes» como «sin confirmar» y el profe puede generar su enlace de acceso a Juegos

#### Scenario: Alumna sin permiso
- **WHEN** una alumna pide `/juegos/jugadores`
- **THEN** recibe 403 y no ve la pestaña

### Requirement: Nick de jugador
Todo jugador de Juegos SHALL poder ponerse un nick de 2 a 20 letras o números desde «🎨 Tu avatar». El nick SHALL
mostrarse en lugar de su nombre en el chip, el ranking y las partidas. Si lo quita, SHALL volver a su nombre. El
admin SHALL ver el nombre real y el nick en la sub-sección «Jugadores» de «🛡️ Admin».

#### Scenario: Alumna con nick
- **WHEN** Marisol se pone el nick «Mari Star»
- **THEN** el ranking y su chip muestran «Mari Star», y el profe ve «Marisol» con el nick «Mari Star»

#### Scenario: Quitar el nick
- **WHEN** deja el nick vacío y guarda
- **THEN** vuelve a aparecer con su nombre
