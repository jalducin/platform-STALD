# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-05
- Cambio: examen-autoguardado
- Agente: Claude Code (Opus 5.5), worktree aislado, rama `feature/examen-autoguardado`

## Comandos ejecutados
- `npx -y @fission-ai/openspec@1.4.1 validate examen-autoguardado --strict`
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- `npx -y deno check server/main.ts`
- TDD (antes de implementar), con `CHROME=…/chromium-1228/chrome-win64/chrome.exe`:
  `bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8827 --puerto-web 8805 autoguardado login`
- Regresión (dos corridas completas; la segunda tras el ajuste de la clase del aviso):
  `bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8827 --puerto-web 8805 alta-alumnos segunda-oportunidad pronunciacion ruta-profe profe-diseno examen-secundaria autoguardado login portal juegos login-despues`

## Resultados de pruebas
- OpenSpec: `Change 'examen-autoguardado' is valid`.
- Deno: 208 pasaron, 0 fallaron, 6 omitidas (las de `actividades_test.ts` que necesitan `DATA_DIR`, como siempre).
  `deno lint`: 52 archivos sin hallazgos. `deno check server/main.ts`: sin errores. El servidor no cambió.
- E2E en rojo antes de implementar (TDD): `autoguardado` FAIL (no existe `#autoguardado`) y `login` FAIL (no existe
  `#code-ayuda`).
- E2E, corrida final:

| Prueba | Estado | Pasos |
|---|---|---|
| alta-alumnos | PASS | 11/11 |
| segunda-oportunidad | PASS | 8/8 |
| pronunciacion | PASS | 11/11 |
| ruta-profe | FAIL (conocida) | 14/15 |
| profe-diseno | PASS | 11/11 |
| examen-secundaria | PASS | 10/10 |
| autoguardado (nueva) | PASS | 24/24 |
| login | PASS | 54/54 |
| portal | PASS | 16/16 |
| juegos | PASS | 26/26 |
| login-despues | PASS | 6/6 |

- `ruta-profe`: «plan con 5 semanas (0–4) y la actual marcada» depende de la fecha y falla en `main` desde el
  2026-10-05. No es de este cambio; la arregla otro sprint.
- En la primera corrida de regresión, `segunda-oportunidad` falló en «domingo: no es corrección (sin respuestas
  fijas)». Causa real de este cambio: el aviso vacío `#autoguardado-aviso` llevaba la clase `.aviso-corr`, con la
  que la prueba (y la interfaz) identifican la corrección. Se actualizó `design.md`, el aviso pasó a una clase
  propia (`.autoguardado-aviso`, con el mismo estilo) y `autoguardado` agregó el paso «el aviso de recuperación no
  se confunde con la corrección». En la segunda corrida pasó.

## Verificación de estado
- Antes: huella MD5 de los 204 archivos de la copia de datos del scratchpad = `4437cb576bfa399cf7a024ab8e291779`.
- Después: `4437cb576bfa399cf7a024ab8e291779` (sin cambios; `correr.sh` trabaja sobre una copia temporal que borra
  al terminar).
- Puertos 8827/8805: libres al terminar. Sin Postgres (`--pg` no se usó), sin Supabase real y sin producción.
- Estado restaurado: no hizo falta.

## Verificación manual (Step 6) — ejecutada por el agente
- UI con Chromium a 390 px (`e2e-autoguardado`), capturas `autoguardado-restaurado.png` y
  `autoguardado-resultado.png` revisadas:
  - aviso «Tu avance se guarda solo en este aparato ✔» y «· Guardado hace un momento» tras contestar;
  - clave `stald_borrador:secundaria:<hash>:sec-e2e-guardado:1`, sin el correo; valor `{"g-h1":0,"g-h2":"cinco"}`;
  - `html.examen-abierto` con `overscroll-behavior-y: contain`; fuera del examen, sin la clase;
  - al recargar con respuestas, Chromium mostró el diálogo `beforeunload` (y el evento sintético se cancela);
    sin respuestas o tras enviar, no;
  - tras recargar y reabrir: radio y escrita restauradas, 2/6, «↺ Recuperamos tus 2 respuestas. Sigue donde te
    quedaste.» y el modo paso en `g-h3`, la primera sin contestar;
  - «← Volver» y reabrir: restauradas; enviar: 100 %, sin borrador; el 2.º intento empieza en 0/6 sin aviso.
- Casos de error: borrador caducado (15 días) de otro examen se borró al cargar; un id inexistente en el borrador
  se ignoró sin error.
- Reenvío del enlace (`e2e-login`, captura `login-codigo.png` y `login-reenviar.png` revisadas): ayuda visible en
  el portal y en Juegos; botón deshabilitado con «Puedes pedir otro en N s» tras el envío (espera acortada a 3 s
  con `window.__REENVIO_SEGUNDOS`), se habilita, al tocarlo avisa «✔ Te mandamos otro enlace a
  marisol@example.com.» y vuelve a esperar.
- No cubierto por E2E: la corrección (intento 2) de una actividad de Inglés con preguntas fijas. Por diseño, las
  fijas están deshabilitadas y ni `examAnswers` ni la restauración las tocan, y la clave es por intento.

## Resultado
- Estado Step 5: PASS (salvo la falla conocida y ajena de `ruta-profe`).
- Bloqueos: ninguno.
