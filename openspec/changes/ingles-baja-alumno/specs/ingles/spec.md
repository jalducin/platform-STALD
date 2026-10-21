## ADDED Requirements

### Requirement: Baja de Inglés reversible
El admin SHALL poder dar de baja de Inglés en línea a un alumno o alumna desde «Registro» en `ingles.html`, con una
confirmación que diga que sus resultados se conservan como historial, y SHALL poder reactivarlo después. La baja SHALL
guardarse como `baja: "AAAA-MM-DD"` en su entrada de `alumnos.json` (`POST /ingles/grupos/baja`) y la reactivación
SHALL quitarla (`POST /ingles/grupos/reactivar`); ambas rutas SHALL ser solo del admin. La baja SHALL NOT borrar
resultados, avance, borradores ni inscripciones. Quien está de baja SHALL NOT aparecer en la lista de personas activas,
el tablero, el resumen, el avance ni el conteo de los grupos, ni ver el calendario, el horario o el Meet de su grupo.
Su acceso a Secundaria y a Juegos (y su jugador de Juegos) SHALL NOT cambiar.

#### Scenario: Dar de baja
- **WHEN** el profe pulsa «🚪 Baja de Inglés» de Sofía y confirma
- **THEN** Sofía pasa a «🗂️ De baja de Inglés» con la fecha de hoy
- **AND** ya no aparece en el tablero, el resumen ni el conteo de su grupo
- **AND** sus resultados se conservan

#### Scenario: La alumna de baja entra a Inglés
- **WHEN** Sofía, de baja, abre `ingles.html`
- **THEN** ve «Ya no estás en Inglés en línea; tus clases de Inglés siguen en Secundaria» con un enlace a
  `ingles.html?modo=secundaria`
- **AND** no ve actividades, horario ni Meet de Inglés (`/ingles/actividades` responde 403 `baja_ingles`)

#### Scenario: Secundaria y Juegos sin cambio
- **WHEN** Sofía, de baja de Inglés, entra a Secundaria o a Juegos
- **THEN** entra como antes, con el mismo jugador de Juegos
- **AND** el portal ya no le muestra Inglés

#### Scenario: Reactivar
- **WHEN** el profe pulsa «↩️ Reactivar» de Sofía
- **THEN** vuelve a la lista, al tablero y a su grupo de antes, con sus resultados

#### Scenario: Solo el admin
- **WHEN** una alumna llama a `POST /ingles/grupos/baja` o `/reactivar`
- **THEN** recibe 403 `solo_admin` y el registro no cambia

#### Scenario: Correo inexistente o baja repetida
- **WHEN** el admin da de baja un correo que no está en el registro
- **THEN** recibe 404 `not_found`
- **AND** dar de baja dos veces responde `sinCambio: true` sin cambiar la fecha
