## Why

Al correr la E2E `karts`, el Chromium de Playwright (153) expone `DeviceOrientationEvent.requestPermission` y Karts
toma el camino «de iPhone» (pedir permiso con un toque). Se sospechó que en Chrome de Android real el control por
inclinación tampoco se activaría.

La investigación (ver `design.md`) dice:

- **Modo individual: sin bug.** Chrome 151+ (escritorio y Android) trae `requestPermission` igual que iPhone y Karts
  ya lo trata bien: lo llama en el toque, solo `"granted"` activa, y si no existe escucha directo.
- **Carrera de sala: bug latente.** `iniciarCarrera` llamaba a `activarSensor()` sin toque (el inicio llega por
  `postMessage`) y en modo NO silencioso. Con Chrome 151+ en «Preguntar» (o iPhone sin permiso previo) el rechazo
  cambiaba a botones en silencio, guardaba `karts_control = 'botones'` (se perdía lo elegido para el resto de la
  copa) y el panel ⚙️ ya no ofrecía «📱 Activar sensor». Con el permiso en «Permitir» (lo de fábrica en Chrome) no
  pasa; afecta a quien cambió el ajuste, a equipos administrados y al cambio de fábrica que Chrome planea.
- **Pruebas rotas:** el *headless shell* de Playwright deja los sensores en «prompt» y `requestPermission()` resuelve
  `'prompt'`, así que 7 pasos de `e2e-karts` con el sensor nativo fallaban, y el camino sin `requestPermission`
  (Android con Chrome < 151, Firefox) ya no se probaba.

## What Changes

- `juegos/karts.html`: `iniciarCarrera` ya no activa el sensor en sala (`!op.sala`); lo hace solo `sensorEnSala`
  (silencioso si existe `requestPermission`), que deja el sensor elegido y abre ⚙️ con «📱 Activar sensor».
- `tests/e2e/e2e-karts.js`:
  - Los contextos táctiles conceden `accelerometer` y `gyroscope` (como Chrome real, que los permite por omisión).
  - Nueva parte `probarSensorPermiso` (también suelta con `KARTS_SOLO=sensor`): nativo con sensores permitidos;
    nativo sin conceder (lo que resuelva el navegador); simulado `granted`; ausente (Android con Chrome < 151);
    `denied`; rechazo `NotAllowedError`; ausente sin lecturas. En cada caso el juego queda con un control usable
    (sensor activo, o botones con el aviso amable) y, si hay `requestPermission`, se llama una vez en el toque.
  - `probarSensorEnSala`: sala con el sensor elegido y `requestPermission` que rechaza sin toque → sigue el sensor,
    ⚙️ ofrece «📱 Activar sensor» y con ese toque se activa.
- `docs/frontend-standards.md` y `docs/pruebas.md`: el sensor con Chrome 151+ y cómo se prueba.
- Sin `?v=` que subir: el cambio es el script en línea de `juegos/karts.html` (el iframe se carga sin versión).

## Capabilities

### Modified Capabilities

- `juegos`: el sensor de Karts se describe para los dos caminos (con y sin `requestPermission`), en modo individual y
  en sala, y su prueba.

## Impact

- Superficies: `juegos/karts.html` (página de Juegos dentro de `juegos.html`), pruebas E2E y documentación. El
  servidor Deno, Postgres, Realtime, el repo de datos y Notion no se tocan.
- Acceso a datos: ninguno nuevo (solo `localStorage.karts_control` del propio navegador).
- Acciones externas: probar en un Android real con Chrome 151+ (responsable: usuario/profe).
