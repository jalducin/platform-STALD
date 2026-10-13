## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/emocion-sonora` desde `origin/main`.

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/emocion_test.ts` (Deno, AudioContext falso): todas las recetas, gol (tribuna + fanfarria),
  cuenta regresiva a 1 s, racha que sube con tope, silencio (`arcade_sonido`, `juegos_emocion`, `silencio()`), sin
  gesto, sin AudioContext o con error al crearlo, espera mínima (`repetido`), ducking solo en stingers grandes,
  capa de tensión (sube, se apaga con 0, silencio y calma) y registro acotado a 200.
- [x] 1.2 `tests/e2e/e2e-emocion.js`: eventos en Futbolito (gol, 4-4 con tensión, silbato y victoria), Golf (hoyo),
  Karts (última vuelta y podio), quiz (final), podio de una partida y revancha; silencio de Arcade y «Efectos de
  emoción: No» (con el sonido clásico de vuelta); sin AudioContext; autoplay bloqueado (`sin-gesto`); muestras WAV de
  cada stinger con `OfflineAudioContext` en `tests/e2e/salida/emocion/` (duración, pico < 1 y RMS > 0). Agregarla a
  `correr.sh`. Correrla y confirmar que falla antes de aplicar el módulo en los juegos.

## 2. Módulo

- [x] 2.1 `juegos/emocion.js`: recetas (design §2), motor en vivo con limitador, silencio/volumen/gesto (§5), espera
  mínima, ducking (§4), capa de tensión (§3), gancho de pruebas (§6) y `renderizar()` para OfflineAudioContext.

## 3. Aplicación en los juegos (design §7)

- [x] 3.1 Hub: cargar `juegos/emocion.js?v=1` en `juegos.html`; «🎉 Efectos de emoción: Sí / No» en el menú de
  música (`musica.js`); `calma()` en `limpiar()` (`nucleo.js`).
- [x] 3.2 Marco común (`individuales.js`): últimos segundos en `reloj()`, racha en `quiz()`, récord o revelación en
  `terminar()`.
- [x] 3.3 Partidas (`salas.js`): podio con suspenso (y el 1.er lugar tras el redoble en `juegos.css`), revancha y
  Basta por rondas; Lotería y ¡Una! (`salas-mesa.js`); Bingo (`bingo.js`); Póker (`naipes.js`); Blackjack
  (`blackjack.js`).
- [x] 3.4 Arcade: Futbolito (solo líneas `// emocion-sonora`, sin tocar controles ni física), Billar, Golf, Karts,
  Axo y Dragon Run; gancho de prueba `__karts.casiVuelta(v)` para la última vuelta.
- [x] 3.5 Subir `?v=` de los scripts cambiados (tras el merge de `errores-latentes`: `salas.js?v=7`,
  `individuales.js?v=5`; `arranque.js` queda en `v=6` de main porque no se toca).

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Revisar que las E2E de los juegos tocados (futbolito, billar, golf, karts, plataformas, dragon-run, juegos,
  partidas, revancha, loteria-sala, una-sala, poker, salas-grandes) sigan válidas: en Karts la cuenta regresiva ahora
  suena con `Emocion.cuenta` y el podio aparece igual (solo una animación).

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `deno check server/main.ts`.
- [ ] 5.2 E2E completa: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9239 --puerto-web
  9249` (copia temporal de datos que se descarta: estado restaurado; nunca se escribe en tablas `stald_`). Falla
  conocida previa: `peticiones` (41 contra tope de 40); el módulo no agrega peticiones al API.
- [ ] 5.3 `cd tests/calidad && npm run calidad`: sin avisos nuevos.
- [ ] 5.4 Reporte `openspec/changes/emocion-sonora/reports/2026-10-12-step-5-pruebas-y-verificacion.md`.

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 Generar y revisar las muestras WAV de cada stinger (duración, pico y RMS) y escuchar el registro de eventos
  de un partido de Futbolito y un podio en el navegador. Casos de error: sin AudioContext, autoplay bloqueado,
  silencio de Arcade y efectos apagados.
- [ ] 6.2 Tras el merge: verificar en producción que `juegos/emocion.js` se sirve, que `juegos.html` y los juegos de
  Arcade lo cargan sin errores y que `Emocion.eventos()` registra el gol de Futbolito.
- [ ] 6.3 (usuario) El profe prueba de oído en su celular y en el salón.

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md`: sección «Emoción sonora» (API, silencio, ducking, gancho de pruebas y cómo la
  usa un juego nuevo) y `docs/pruebas.md` si cambia el inventario de E2E.
- [x] 7.2 `npx -y @fission-ai/openspec@1.4.1 validate emocion-sonora --strict`.

## 8. Publicación

- [ ] 8.1 Merge de `origin/main` (si ya entró el sprint 24a, conservar ambos lados en `futbolito.html`), PR en
  español, `gh pr checks --watch` hasta que terminen todos, `gh pr merge --merge`, borrar la rama remota.
- [ ] 8.2 No archivar: el cambio espera la prueba del profe. Después: `openspec archive emocion-sonora`.
