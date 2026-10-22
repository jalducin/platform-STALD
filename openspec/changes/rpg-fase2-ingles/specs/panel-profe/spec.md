## ADDED Requirements

### Requirement: Moderación de nicks y apagado del ranking
`/profe/nicks` y `/profe/ranking` SHALL responder solo al admin (alumno, alumna o invitado → 403; sin sesión → 401) y
SHALL NOT incluir correos. `GET /profe/nicks[?grupo=]` SHALL listar a cada persona activa con su nombre de pila, su
nick de Juegos, el estado (`sin_nick`, `pendiente`, `aprobado`, `rechazado`), si pidió aparecer, el motivo de rechazo y
el motivo de la revisión automática si el nick no la pasa; primero quien pidió aparecer y está pendiente.
`POST /profe/nicks/aprobar { alumno, nick }` SHALL aprobar solo el nick actual (si cambió → 409 `nick_cambio`) y solo
si pasa la revisión automática (si no → 400 `nick_invalido`). `POST /profe/nicks/rechazar { alumno, nick, motivo }`
SHALL exigir un motivo de 1 a 200 caracteres, que verá quien lo pidió. `POST /profe/ranking` SHALL prender o apagar el
interruptor general (`ranking`) y apagar o prender un grupo (`grupo`, `apagado`). Toda acción SHALL invalidar la
caché del ranking. Al abrir la lista SHALL borrarse el perfil de gamificación de quien lleva más de 30 días de baja o ya
no está en el registro. En `ingles.html` el admin SHALL tener la sección «🛡️ Nicks» con el interruptor, «⏳ Por
revisar» y «👥 Todos los nicks».

#### Scenario: Aprobar nick
- **WHEN** el profe aprueba el nick de Juegos «Estrella Azul» de una alumna que pidió aparecer
- **THEN** la caché del ranking se invalida y el nick aparece en el ranking del grupo

#### Scenario: Rechazar con motivo
- **WHEN** el profe rechaza «Rayo 77» con el motivo «Usa un nick sin números»
- **THEN** el alumno ve en su tarjeta que no se aprobó, con ese motivo, y un botón para cambiarlo en Juegos

#### Scenario: El nick cambió mientras revisaba
- **WHEN** el profe aprueba un nick que el alumno ya cambió en Juegos
- **THEN** el servidor responde 409 `nick_cambio` y la lista se vuelve a cargar

#### Scenario: Alumno intenta moderar
- **WHEN** un alumno pide `POST /profe/nicks/aprobar`
- **THEN** el servidor responde 403

#### Scenario: Perfil de una baja antigua
- **WHEN** el profe abre la lista y un alumno lleva 40 días de baja
- **THEN** su perfil de gamificación se borra; el de quien lleva 6 días se conserva
