## Contexto

Código del sensor de Karts:

- `juegos/karts.html` `activarSensor(silencioso)`: si `DeviceOrientationEvent.requestPermission` es función la llama
  (en un `try`; si lanza o rechaza cuenta como `'denied'`); si no existe, sigue como `'granted'`. Solo `'granted'`
  agrega el `deviceorientation`; si en 2 s no llega una lectura (o el permiso no fue `'granted'`) llama a
  `falloSensor()`: cambia a Botones y avisa «📱 No se pudo usar el sensor (sin permiso o sin giroscopio). Seguimos con
  los botones.». Con `silencioso` (sala, sin toque) no cambia a botones y el panel ⚙️ ofrece «📱 Activar sensor».
- Se llama dentro del toque en «📱 Activar sensor» (menú y panel ⚙️), al elegir 📱 en el panel ⚙️ y al tocar para
  arrancar una carrera individual (`iniciarCarrera`). En sala, `sensorEnSala` (al recibir `inicio`, sin toque).
  `juegos/app/arcade.js` `permisoSensorSala()` lo pide en el toque de la sala de espera.

## Lo que dicen las fuentes oficiales

- **MDN** (`DeviceOrientationEvent.requestPermission()`): devuelve una promesa con `"granted"` o `"denied"`; requiere
  activación transitoria (un gesto) y rechaza con `NotAllowedError` si el estado es «prompt» sin gesto; solo en
  contexto seguro (HTTPS). https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- **Datos de compatibilidad de MDN** (`mdn/browser-compat-data`, `api/DeviceOrientationEvent.json`): Chrome 152
  (Chrome Android, Edge, Samsung Internet y WebView «mirror»), Safari iOS 14.5; Safari de escritorio y Firefox no.
- **Chrome Platform Status** «DeviceOrientation Events permission request API»
  (https://chromestatus.com/feature/5915984063889408) e *Intent to Ship* en blink-dev
  (https://groups.google.com/a/chromium.org/g/blink-dev/c/ckd2rFmT3PA): Chrome **151** en escritorio y Android; el
  permiso de sensores pasa a Allow/Ask/Block con **Allow por omisión** (sin efecto visible para casi todos), después
  se piensa pasar a Ask; en WebView siempre `"granted"`; **los sitios no reciben eventos hasta llamar a
  `requestPermission()`** (como WebKit). La política `DefaultSensorsSetting` puede bloquearlos.
- **Especificación W3C Device Orientation** (https://w3c.github.io/deviceorientation/): `DeviceOrientationEvent` es
  `[SecureContext]`; sin gesto y con estado «prompt» rechaza con `NotAllowedError`; con estado ya `granted` resuelve
  sin gesto; sin permiso no se disparan eventos.

## Respuestas

1. ¿Chrome para Android expone `requestPermission`? **Sí, desde Chrome 151** (MDN BCD anota 152). Antes, no.
2. ¿Qué hace? Resuelve `"granted"` con el permiso en Allow (el valor por omisión) aun sin gesto; con Ask muestra el
   cuadro (necesita gesto) y resuelve `"granted"`/`"denied"`; con Block, `"denied"`. Y sin llamarlo no llegan
   eventos: por eso **siempre hay que llamarlo si existe**, que es lo que hace Karts.
3. ¿HTTPS y gesto? HTTPS siempre (GitHub Pages lo es). Gesto solo cuando el estado es «prompt» (iPhone, o Chrome en
   Ask); Karts lo llama dentro del toque.

## Decisión

- Android con Chrome < 151: sin `requestPermission` → escucha directo (sin cambios).
- Android con Chrome 151+: `requestPermission` → `"granted"` (Allow) → escucha → activo. En Ask, el toque de
  «Activar sensor» muestra el cuadro. Si niega o no hay giroscopio, botones con aviso.
- iPhone: igual que antes.
- Se comprobó en el Chromium 153 completo (`chrome.exe`): `requestPermission()` → `"granted"` sin gesto y con gesto.
  En el *headless shell* de Playwright, sin conceder sensores, `navigator.permissions.query({name:'accelerometer'})`
  es `"prompt"` y `requestPermission()` resuelve `"prompt"` (no hay cuadro que contestar); con
  `grantPermissions(['accelerometer','gyroscope'])` resuelve `"granted"`. Karts trata `"prompt"` como no concedido →
  botones con aviso: también usable.
- **Bug latente en la carrera de sala** (encontrado por el revisor): `iniciarCarrera` (llamada desde `empezarSala`,
  sin toque) ejecutaba `activarSensor()` NO silencioso antes de `sensorEnSala`; como `activarSensor` reutiliza la
  promesa `activando`, el `activarSensor(true)` de `sensorEnSala` heredaba la versión no silenciosa. Con Chrome 151+
  en Ask (o iPhone sin permiso previo) el rechazo terminaba en `falloSensor()`: botones, `karts_control = 'botones'`
  guardado y el panel sin «📱 Activar sensor» (`#b-sensor-panel` se oculta si el control no es sensor). También
  corría para quien especta. Con Allow (por omisión) no se notaba.
  - Arreglo: `iniciarCarrera` solo activa el sensor fuera de sala (`!op.sala`). En sala lo hace `sensorEnSala`:
    sin `requestPermission`, `activarSensor()` como siempre; con él, silencioso y, si no quedó activo, abre ⚙️ con
    «📱 Activar sensor» (un toque dentro del juego).
  - Alternativa descartada: hacer `activarSensor` «más silencioso» en general; cambia el modo individual, que ya está
    bien.

Fuera de eso no se cambia `juegos/`. Se corrigen y amplían las pruebas.

## Pruebas

- Contextos táctiles de `e2e-karts` con `permissions: ['accelerometer', 'gyroscope']` (Chrome real los permite).
- `probarSensorPermiso`: init script `sensorSimulado` por caso (`nativo`, `granted`, `ausente`, `denied`, `error`;
  con o sin lecturas). Cuenta las llamadas (también envolviendo el nativo) y si hubo activación de usuario
  (`navigator.userActivation.isActive`; es la activación transitoria, de unos segundos: confirma que la llamada viene
  de un toque, no que sea síncrona dentro del manejador). El caso «nativo sin conceder» espera lo que resuelva el
  navegador (`'prompt'` en el headless shell, `'granted'` en Chrome completo); con Chromium < 151 los casos nativos
  esperan cero llamadas.
- `probarSensorEnSala`: sala real (Marisol, Lago Helado, fantasmas) con `karts_control = 'sensor'` y un
  `requestPermission` que rechaza hasta que haya un toque dentro del juego (quien no arrancó la sala). Chromium hereda
  al iframe la activación del clic en «Empezar», por eso no se usa `userActivation` en esta simulación.
- Las lecturas son eventos sintéticos (`dispatchEvent`): llegan aunque el navegador no haya dado permiso; lo que
  distingue los casos es el resultado de `requestPermission` y el conteo de llamadas.
