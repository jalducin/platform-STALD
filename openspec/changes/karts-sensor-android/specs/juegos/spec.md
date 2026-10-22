## ADDED Requirements

### Requirement: Permiso del sensor de Karts en cada navegador
El sensor de «Karts Turbo» SHALL funcionar con y sin `DeviceOrientationEvent.requestPermission`. Si existe (iPhone y
Chrome 151+ de Android y escritorio), SHALL llamarse dentro del toque que activa el sensor y solo `"granted"` SHALL
activarlo; `"denied"`, cualquier otro valor, una excepción o un rechazo SHALL contar como sin permiso. Si no existe,
el juego SHALL escuchar `deviceorientation` directo. Sin permiso, o sin lecturas en 2 s, el juego SHALL regresar a
los botones con un aviso amable. En la carrera de una sala (que arranca sin toque) el juego SHALL intentar el sensor
en modo silencioso: si no queda activo, SHALL conservar el sensor elegido y abrir el panel ⚙️ con «📱 Activar
sensor» en lugar de cambiar a botones. Las pruebas E2E SHALL cubrir los dos caminos y la sala.

#### Scenario: Android con Chrome 151+
- **WHEN** elige 📱 Sensor y toca «Activar sensor» en un Chrome que trae `requestPermission` y permite sensores
- **THEN** el permiso se pide en ese toque, resuelve `"granted"` y el sensor queda activo

#### Scenario: Android con Chrome anterior a 151
- **WHEN** elige 📱 Sensor en un navegador sin `requestPermission` que manda lecturas
- **THEN** el sensor queda activo sin pedir permiso

#### Scenario: Permiso negado o rechazado
- **WHEN** `requestPermission` resuelve `"denied"` o rechaza con `NotAllowedError`
- **THEN** el juego cambia a los botones y avisa «No se pudo usar el sensor»

#### Scenario: Sin lecturas
- **WHEN** no llega ninguna lectura de orientación en 2 s
- **THEN** el juego cambia a los botones con el mismo aviso

#### Scenario: Sala sin toque con el permiso en «Preguntar»
- **WHEN** empieza una carrera de sala con 📱 Sensor elegido y `requestPermission` rechaza porque no hubo toque
- **THEN** el control sigue en sensor (también lo guardado), el panel ⚙️ ofrece «📱 Activar sensor» y con ese toque
  el sensor queda activo
