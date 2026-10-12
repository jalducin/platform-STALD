## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/golf` desde `origin/main` (tras `git fetch`)

## 1. Servidor con TDD

- [ ] 1.1 Pruebas que fallan en `server/golf_test.ts`: crear sala de `golf` (sin bots aunque se pidan; con 1
  persona 409 `faltan_jugadores`; 2, 3 y 4 personas empiezan; la quinta, `sala_llena`); jugadas válidas (tiro y
  rendirse) guardadas solo con sus campos; inválidas → 400 `jugada_invalida`; `turno_tomado`; tras `final`, 409
  `partida_terminada`; catálogo («Golf», Arcade, tope 1000); progreso `golf` (forma válida guardada y leída; hoyo
  10, 4 estrellas, 0 golpes, llave de más → 400 `progreso_invalido`; cada quien el suyo); `server/mesas_test.ts` sigue
  verde con la tabla nueva
- [ ] 1.2 `server/salas.ts` (`JUEGOS_PARTIDA`, `MESAS`, `FISICA`, `validarJugada`), `server/juegos.ts` (`CATALOGO`),
  `server/progreso.ts` (`JUEGOS_PROGRESO`, `validarGolf`) y `juegos/mesas.js`, con el comentario `// golf`

## 2. Motor determinista (sin DOM) con pruebas Deno

- [ ] 2.1 Pruebas que fallan en `server/golf_motor_test.ts`: solo `+ − * /` y `Math.sqrt`; 9 hoyos con par 2–5 y
  dificultad creciente; rebote en pared; arena frena; agua regresa con castigo; pendiente empuja; portal; molino abre
  y cierra; compuerta se mueve y empuja; hoyo con velocidad baja sí y alta no; límite par + 4 (recogida); turnos por
  menos golpes; cambio de hoyo y fin; rendirse; puntos, estrellas y nombres de resultado; animación por subpasos =
  reproducción instantánea; determinismo (misma lista de tiros → mismo estado); cada hoyo se termina con el bot
  dentro del límite; `hoyosSala`; `Fisica.linea` con `motorSala` (tiros de personas y tiro automático)
- [ ] 2.2 `juegos/golf-motor.js`: hoyos, geometría, simulación por subpasos, reglas de turnos y hoyos, bot con campo
  de distancias y caché, puntuación

## 3. Página del juego y plataforma

- [ ] 3.1 `juegos/golf.html`: canvas a 60 fps con paso fijo, cámara que sigue a la pelota, minimapa, vista acostada en
  horizontal; menú (recorrido, práctica con estrellas y desbloqueo, control), resortera con línea guía y fuerza en
  número, ⟲ ⟳, − / +, «⛳ GOLPEAR», mando clásico, teclado, pausa; resultado por hoyo, tarjeta y avance
  (`guardar`/`puntos`); modo sala por turnos (`MesaUI.crearSala` con `Golf.motorSala`), rendirse, fin con tarjeta;
  `prefers-reduced-motion`; desde 320 px
- [ ] 3.2 `juegos.html` (marcado `// golf`): tarjeta en Arcade, `JUEGOS_PARTIDA`, `TIEMPO_REAL`, `FISICA`, mesa de
  hasta 4 en `pintarFisicaSala`, tarjeta de golpes debajo del podio y nota «sin bots» al crear la sala

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Revisar los conteos del menú contra `JUEGOS.length` (`e2e-juegos`, `e2e-fusion`, `e2e-clasicos`,
  `e2e-karts`, `e2e-futbolito`, `e2e-juegos-tablero`, `e2e-clasicos-rapidos`): siguen válidos con un juego más
- [ ] 4.2 E2E nueva `tests/e2e/e2e-golf.js` en la fase `base` de `correr.sh`: individual con toques reales (CDP),
  mando clásico y su preferencia, teclado, terminar un hoyo, tarjeta, avance guardado (servidor y menú de práctica),
  sala de 2 personas hasta el podio con tarjeta, capturas a 320, 390 y 844×390

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [ ] 5.2 E2E `golf juegos billar mando` con la copia de datos de prueba (la copia se descarta al terminar: estado
  restaurado; nunca se escribe en tablas `stald_`)
- [ ] 5.3 Revisar las capturas a 320, 390 y 844×390 y corregir lo que se vea mal
- [ ] 5.4 Reporte `openspec/changes/golf/reports/2026-10-12-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 Servidor local + estáticos: `curl` a `/juegos/sala` (crear golf, empezar con 1 persona, jugada válida,
  inválida, sin sesión, tras final) y a `/juegos/progreso/golf` (válido, inválido); abrir `juegos/golf.html` suelto en
  Chromium móvil (vertical, horizontal, `prefers-reduced-motion`, cuadros por segundo)
- [ ] 6.2 Tras el merge (usuario): probar en un celular real

## 7. Documentación (OBLIGATORIO)

- [ ] 7.1 `docs/frontend-standards.md` (Golf, controles, mando, puente de sala), `docs/backend-standards.md` (jugadas,
  mesa, progreso `golf`), `docs/data-model.md` (`juegos/progreso/golf` y `jugadas[]`)
- [ ] 7.2 `npx -y @fission-ai/openspec@1.4.1 validate golf --strict`

## 8. Cierre

- [ ] 8.1 Commits en español; sin push, PR ni merge (los hace el integrador). Tras el merge: `openspec archive`
