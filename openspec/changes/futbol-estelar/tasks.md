## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/futbol-estelar` desde `origin/main` (tras `git fetch`)

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/futbol_motor_test.ts`: física del balón, posesión y primer toque, pases, determinismo, partidos que
  terminan, reloj y medio tiempo, fuera de lugar, faltas y penal, tanda de penales, cartas, Difícil vence a Fácil
- [ ] 1.2 `server/futbol_liga_test.ts`: universo regenerado igual al JSON e invariantes, calendario de 14 jornadas,
  tabla, ascensos y descensos, mercado y ojeador deterministas, puntos por partido, semana ISO y rival semanal
- [ ] 1.3 `server/futbol_test.ts`: `CATALOGO.futbol`, `JUEGOS_PROGRESO`, forma exacta del avance (válidos e
  inválidos) y carrera llena dentro de 4096 B; correrlas y registrar que fallan

## 2. Universo y reglas sin DOM

- [ ] 2.1 `herramientas/generar-futbol.ts` (determinista) y `juegos/datos/futbol.json`
- [ ] 2.2 `juegos/futbol-motor.js`: física, posesión, patadas con potencia, defensa, portero, reanudaciones, faltas,
  fuera de lugar, reloj, penales, cartas e IA por niveles
- [ ] 2.3 `juegos/futbol-liga.js`: calendario, tabla, temporada, ascensos, carrera (mercado, ojeador, cartas,
  progresión), copa, torneo, puntos y clasificatoria semanal

## 3. Servidor

- [ ] 3.1 `server/juegos.ts`: `CATALOGO.futbol`; `server/progreso.ts`: `futbol` en `JUEGOS_PROGRESO` y `validarFutbol`

## 4. Página del juego

- [ ] 4.1 `juegos/futbol.html`: cámara lateral 2.5D, sprites, balón con altura, radar, HUD y avisos
- [ ] 4.2 Entrada `FutbolEntrada`: joystick y botones táctiles, mando clásico, control físico, teclado, selector
  recordado, tutorial, aviso de girar
- [ ] 4.3 Menú y modos: partido rápido, copa, carrera (crear club, tabla, plantilla, mercado, ojeador, cartas),
  torneo local (personas, entradas y lados), clasificatoria semanal; pizarra táctica previa
- [ ] 4.4 Plataforma: `listo`/`inicio`/`guardar`/`puntos` y llamadas a `window.Emocion?.…?.()`

## 5. Integración con Juegos y retiro de Futbolito

- [ ] 5.1 `juegos/app/menu.js`: tarjeta `futbol`, Futbolito a `JUEGOS_RETIRADOS` (`juegoPorId` lo sigue encontrando)
- [ ] 5.2 `juegos/app/salas.js`: Futbolito fuera de `JUEGOS_PARTIDA` (las salas viejas siguen); `?v=` en `juegos.html`

## 6. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 6.1 `tests/e2e/e2e-futbol.js` (nuevo; en `correr.sh`): menú y modos, toques reales (mover + pase + tiro,
  multitáctil), mando clásico y control físico simulado, teclado, dos controles locales simulados, partido rápido que
  termina, gol, carrera guardada y recuperada, torneo de 4, ranking, capturas y fps
- [ ] 6.2 `e2e-juegos.js` (Arcade sin Futbolito y con Fútbol Estelar) y `e2e-futbolito.js` (Futbolito fuera del menú;
  sala heredada agregando la opción solo en la prueba)

## 7. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 7.1 `npx -y deno test -A server/` y `npx -y deno lint` sin errores nuevos
- [ ] 7.2 E2E `futbol juegos categorias mando karts billar golf` (más `futbolito`) con la copia de datos de prueba (la
  copia se descarta: estado restaurado) y después la suite completa (`peticiones` 41 vs 40 es previa)
- [ ] 7.3 `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 7.4 Reporte `openspec/changes/futbol-estelar/reports/2026-10-12-step-7-pruebas-y-verificacion.md`

## 8. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 8.1 Revisar las capturas a 390×844, 844×390 y escritorio e iterar hasta que se vea como un juego de futbol de
  verdad, legible y atractivo
- [ ] 8.2 Medir fps con CPU ×4 (390×844 y 844×390) en Chromium móvil; consola sin errores
- [ ] 8.3 Tras el merge: verificar producción (página, JSON, tarjeta en Arcade sin Futbolito, `/juegos/progreso/futbol`)

## 9. Documentación (OBLIGATORIO)

- [ ] 9.1 `docs/frontend-standards.md` (Arcade: Fútbol Estelar, controles, modos, Futbolito retirado),
  `docs/data-model.md` (avance `futbol`), `docs/backend-standards.md` (catálogo y progreso), `docs/pruebas.md` si
  aplica
- [ ] 9.2 `npx -y @fission-ai/openspec@1.4.1 validate futbol-estelar --strict`

## 10. Cierre

- [ ] 10.1 Merge de `origin/main` (conservando ambos lados), PR en español, `gh pr checks --watch`, merge, borrar la
  rama remota y verificar producción
- [ ] 10.2 Sin archivar: espera la prueba del profe (luego `openspec archive futbol-estelar`)
