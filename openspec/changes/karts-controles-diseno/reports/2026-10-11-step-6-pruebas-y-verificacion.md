# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: karts-controles-diseno
- Agente: Claude (Sprint 8)

## Comandos ejecutados
- Antes (en `origin/main`, sin cambios): `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8917 --puerto-web 8895 karts`
  (15/15) y capturas sueltas de `juegos/karts.html` en vertical, horizontal y escritorio (`scratchpad/karts-antes/`).
- Causa raíz: scripts de Playwright con `hasTouch`/`isMobile` y toques CDP (`Input.dispatchTouchEvent`), suelto y
  dentro de `juegos.html` a 390×844, 360×640 y 844×390 (detalle en `design.md`).
- `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8917 --puerto-web 8895 karts`
- `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8917 --puerto-web 8895 karts juegos plataformas partidas juegos-recarga revancha`
- `npx -y @fission-ai/openspec@1.4.1 validate karts-controles-diseno --strict`

## Resultados de pruebas
- Dirigidas (`karts`): 48 pasaron, 0 fallaron, 0 omitidas (antes 15). Nuevas con toques reales: joystick proporcional
  (−0.21 con 15 px, −1 con 60 px), zona muerta, regreso al centro, abajo frena, multitáctil joystick + DERRAPE →
  turbo morado, botones ◀ con toque real, preferencia «Botones» tras recargar, sensor (inclinar 18° → giro 0.71),
  permiso negado y sin lecturas (2 s) → joystick, minimapa con 8 marcas y con 3 en sala (tú + 2 fantasmas), mandos
  dentro de la pantalla y sin cruzarse con el minimapa ni el HUD a 360×640, 390×844 (joystick y botones) y 844×390,
  escritorio sin mandos y a 60 fps.
- Primera corrida: 47/48; falló «escritorio sin mandos»: `navigator.maxTouchPoints > 0` en un equipo sin pantalla
  táctil mostraba los mandos. Se quitó ese criterio (spec y design actualizados) y pasó 48/48.
- Regresión: 6 corridas, 6 PASS, 0 FAIL, 0 omitidas: `juegos` 28, `partidas` 15, `juegos-recarga` 37, `revancha` 20,
  `plataformas` 24 y `karts` 48 pasos.
- Duración: ~10 min la regresión; ~3 min `karts` sola.

## Capturas revisadas (antes vs. después)
- Antes (`scratchpad/karts-antes/`): carros como rectángulos; DERRAPE cortado a 360 px; en horizontal el minimapa
  encima de ▼ y 🎁; minimapa de puntos sin distinguir quién es quién.
- Después (`tests/e2e/salida/`): `karts-390-carrera`, `karts-390-joystick`, `karts-390-botones`, `karts-390-sensor`,
  `karts-390-menu-controles`, `karts-390-menu-sensor`, `karts-390-sensor-negado`, `karts-360-vertical`,
  `karts-844-horizontal`, `karts-escritorio`, `karts-390-resultados`, `karts-390-sala`, `karts-390-podio`: karts con
  llantas, alerón, casco y número; pistas con piano, grano, decoración y arco de META; HUD en tarjetas; minimapa con
  «TÚ»; todo cabe sin encimarse. Hallazgo corregido: los pinos de la pista de hielo parecían estrellas de 4 picos.

## Verificación manual (Step 7.1, el agente ejecuta)
- `juegos/karts.html` suelto (python http.server 8895), Chromium móvil con pantalla 3x:
  - 390×844: 60 fps con 41–52 partículas derrapando; con CPU ×4: 60 fps; 844×390 con CPU ×4: 60 fps.
  - `prefers-reduced-motion`: 2–10 partículas y 0 confeti (40 sin la preferencia).
  - Consola: sin errores JS; solo 404 de `/favicon.ico` (la página suelta no tiene ícono; dentro de Juegos no aplica).
  - Limitación: Chromium sin pantalla no reproduce el GPU de un celular; queda la prueba en aparatos reales (7.2).

## Verificación de estado
- Antes: copia de prueba en `scratchpad/data` (no se modifica; `correr.sh` trabaja sobre una copia temporal).
- Después: `correr.sh` borró su copia al terminar; la preferencia nueva solo vive en el `localStorage` de cada
  contexto de prueba (se descarta al cerrar). Sin cambios en servidor, Supabase, `stald_*`, `.env` ni Notion.
- Estado restaurado: Sí.

## Resultado
- Estado Step 6: PASS
- Bloqueos: ninguno
