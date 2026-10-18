## Why

El profe decidió: «45 segundos». Desde `karts-3-vueltas` (#212) cada carrera dura 3 vueltas (≈ 3:00–3:30) y los 30 s
que tienen las demás personas para terminar tras la primera llegada (`karts-copa-sala-4`) quedaron muy justos: con
carreras más largas, la diferencia normal entre el 1.º y el 2.º lugar crece y muchas personas quedaban NT.

## What Changes

- **Plazo de 45 s** tras la primera llegada en las salas de Karts (copa en sala y carrera suelta en sala):
  `KartsCopa.PLAZO_MS` = 45 000 en `juegos/karts-copa.js`, el archivo que comparten el servidor
  (`server/karts_copa.ts`, `server/carreras.ts`) y la página (`#plazo` «⏱️ N s para terminar» y la tabla con la cuenta).
  El «no terminé» se sigue mandando 1.5 s antes del cierre.
- **Coherencia con los límites de 3 vueltas**: el plazo siempre vence antes que el límite de la pista + la gracia
  (cierre de respaldo) y el servidor acepta a un 2.º lugar que llega 45 s después de quien ganó.
- **Pruebas** usan `KC.PLAZO_MS` en lugar del número fijo; la E2E `karts-vivo` lee el plazo de la página.
- `?v=` de `juegos/karts-copa.js` y `juegos/app/arcade.js` por encima de `main`; docs de backend y frontend.

Superficies: `juegos.html` (Arcade de la sala), `juegos/karts.html` (solo comentario), servidor Deno (sin cambios de
lógica: usa la constante). Sin cambios en Postgres, Realtime, Auth, repo de datos ni Notion. Sin acciones externas
(Deno Deploy y Pages publican con el merge a `main`).

Matriz de acceso: sin cambios.

Orden de archivo: este cambio renombra y modifica el requisito que agrega `karts-copa-sala-4`; se archiva después de él.

## Impact

- `juegos/karts-copa.js`, `juegos/app/arcade.js`, `juegos/karts.html`, `juegos.html`, `server/carreras.ts`,
  `server/karts_copa.ts`, `server/salas.ts` (comentarios), pruebas `server/*karts*_test.ts`,
  `tests/e2e/e2e-karts-vivo.js`, `docs/backend-standards.md`, `docs/frontend-standards.md`.
