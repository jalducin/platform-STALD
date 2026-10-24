## MODIFIED Requirements

### Requirement: Avance del examen guardado en la cuenta
La plataforma SHALL guardar en el servidor el avance de quien contesta un intento (actividad, examen, refuerzo, reto
del Meet o clase por pasos, en Inglés, Secundaria o la ruta del profe), asociado a su cuenta, a ese
elemento y a ese intento, a los pocos segundos del último cambio y de inmediato al cambiar de paso, junto con el paso
visible. Al volver a abrirlo desde cualquier aparato o navegador SHALL recuperar las respuestas y abrir en el mismo
paso; al recargar la página dentro del elemento, SHALL reabrirlo solo. El borrador NO SHALL calificarse ni contar como
intento, ni aparecer como resultado para el admin. Al enviar el intento, el borrador SHALL borrarse y el siguiente
intento SHALL empezar limpio. Nadie más SHALL poder leer ni escribir ese borrador (admin → 403; otra persona → 404).

#### Scenario: Otro aparato
- **WHEN** Sofía contesta 30 preguntas en su celular y luego abre el examen en la computadora
- **THEN** ve sus 30 respuestas recuperadas y sigue en el paso donde se quedó

#### Scenario: Se borra el navegador
- **WHEN** el navegador pierde sus datos locales a mitad del examen
- **THEN** al volver a abrirlo recupera el avance guardado en su cuenta

#### Scenario: Cambiar de paso guarda ya
- **WHEN** la alumna contesta la pregunta 1 y toca «Siguiente →»
- **THEN** el servidor ya tiene su respuesta y el paso 2, sin esperar

#### Scenario: Recargar dentro de la actividad
- **WHEN** el alumno recarga la página con la actividad abierta
- **THEN** la actividad se abre sola con sus respuestas y en el mismo paso

#### Scenario: Sin enviar no cuenta
- **WHEN** hay borrador pero no se ha tocado «Enviar»
- **THEN** el elemento sigue con 0 intentos usados, sin calificación, y el admin no ve resultado

#### Scenario: Dos navegadores con la misma cuenta
- **WHEN** la alumna avanza en dos navegadores y envía desde uno
- **THEN** el otro, al guardar, recibe 409 y avisa «Este intento ya se envió desde otro aparato o navegador», y no crea borrador del intento nuevo

### Requirement: Avisos de guardado y protección al salir
Mientras un examen está abierto, el reproductor SHALL mostrar «Tu avance se guarda en tu cuenta ✔» y, tras cada
cambio, «Guardando…» y luego «💾 Guardado hace N s» (minutos u horas después). Si no se pudo guardar en la cuenta (sin
red o error del servidor) SHALL avisar «📴 No se pudo guardar en tu cuenta… Tu avance sigue en este aparato» con un
botón «🔄 Reintentar», y SHALL reintentar solo al volver la conexión. SHALL evitar el «jalar para recargar» con
`overscroll-behavior-y: contain` y SHALL pedir confirmación del navegador al salir o recargar si hay respuestas sin
enviar. Fuera del examen no SHALL haber ni confirmación ni bloqueo del desplazamiento.

#### Scenario: Indicador de guardado
- **WHEN** la alumna contesta una pregunta
- **THEN** el aviso dice «Guardando…» y, al subir, «💾 Guardado hace 2 s»

#### Scenario: Sin red
- **WHEN** no hay conexión al guardar
- **THEN** el aviso ofrece «🔄 Reintentar» y el avance sigue en el aparato

#### Scenario: Recargar con respuestas pide confirmación
- **WHEN** hay respuestas sin enviar y la alumna recarga la página
- **THEN** el navegador pide confirmar antes de salir

#### Scenario: Tras enviar no hay bloqueo
- **WHEN** la alumna ya envió y está en su resultado
- **THEN** la página no lleva `examen-abierto` ni pide confirmación al salir

### Requirement: Autoguardado del avance en el aparato
El reproductor de actividades y exámenes (Inglés, Ruta del profe y Secundaria) SHALL guardar además una copia del
avance de cada intento en el `localStorage` del aparato, con una clave por ámbito, persona (hash corto del correo,
nunca el correo en claro), elemento e intento, con las respuestas y el paso visible, y SHALL restaurarla al volver a
abrir el mismo intento (entre esta copia y la de la cuenta gana la más reciente). SHALL funcionar con opción múltiple,
respuesta escrita, pronunciación, ordenar y unir pares, en lista y en modo paso, y no SHALL tocar las preguntas fijas
de la corrección. La vista previa del admin no SHALL guardar borrador.

#### Scenario: Recargar no pierde respuestas
- **WHEN** la alumna contesta una pregunta de opción múltiple y una escrita, recarga la página y vuelve a abrir el examen
- **THEN** ambas respuestas aparecen marcadas y escritas, el avance cuenta 2 respondidas y se avisa «Recuperamos tus 2 respuestas»

#### Scenario: Modo paso continúa donde se quedó
- **WHEN** se restaura un borrador en una pantalla de menos de 600 px
- **THEN** la pregunta visible es la del paso guardado (o, sin paso guardado, la primera sin contestar)

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
- **THEN** el examen funciona con la copia de la cuenta, sin error
