## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/futbolito-billar` desde `origin/main` (tras `git fetch`)

## 1. Servidor con TDD

- [x] 1.1 Pruebas que fallan en `server/futbolito_billar_test.ts`: crear sala de `futbolito` y `billar`; mesa 1 vs 1
  (1 persona + bot empieza; sin bots, 409 `faltan_jugadores`; la tercera persona, `sala_llena`); jugadas válidas
  (tiro y rendirse) guardadas solo con sus campos; inválidas → 400 `jugada_invalida`; `turno_tomado`; tras `final`,
  409 `partida_terminada`; catálogo con título y tope 1000; `server/mesas_test.ts` con la tabla nueva
- [x] 1.2 `server/salas.ts`: `JUEGOS_PARTIDA`, `MESAS`, `validarJugada` y `partida_terminada` (comentario
  `// futbolito-billar`); `server/juegos.ts`: `CATALOGO`; `juegos/mesas.js`: renglones iguales

## 2. Motores deterministas (sin DOM) con pruebas Deno

- [x] 2.1 `juegos/fisica.js`: `senCos`, `atan2Dec`, `rng`, `q` y `linea` (turnos de sala: jugadas, bots, tiro
  automático por tiempo, rendirse, caché por prefijo); pruebas de exactitud de la trigonometría y de la línea
- [x] 2.2 `juegos/billar-motor.js`: triángulo con semilla, simulación por subpasos, troneras, reglas de la bola 8,
  bot por nivel y puntos; pruebas: determinismo (dos reproducciones idénticas), falta con la blanca, 8 antes de
  tiempo pierde, 8 al final gana, grupos, turno que sigue
- [x] 2.3 `juegos/futbolito-motor.js`: mesa, barras, rebotes, pendiente, patada, modo vivo (individual) y tiro
  determinista (sala), bot por nivel y puntos; pruebas: determinismo, gol y saque, posesión, fin a 5 goles

## 3. Páginas de los juegos

- [x] 3.1 `juegos/futbolito.html`: canvas 60 fps con paso fijo, menú de nivel, partida contra el bot con toques
  (deslizar mueve la barra activa, tocar patea) y teclado, marcador, resultado con puntos; modo sala por tiros (barra,
  ángulo y fuerza; animación de cada tiro; turnos y reloj); `prefers-reduced-motion`; vertical y horizontal
- [x] 3.2 `juegos/billar.html`: mesa vertical/horizontal, apuntar arrastrando con línea guía, fuerza por arrastre o
  barra, efecto, bot por nivel, resultado con puntos; modo sala por turnos; `prefers-reduced-motion`
- [x] 3.3 `juegos.html`: tarjetas en Arcade, `jugarArcade` sin avance para estos juegos, `JUEGOS_PARTIDA`,
  `TIEMPO_REAL` y puente `pintarFisicaSala` (inicio, jugadas, jugada-ok, fin → `pintarFinalSala`)

- [x] 3.4 Capa de acciones (`MesaUI.crearAcciones`, `window.accionesJuego`) para teclado y un mando futuro, sin
  depender de `juegos/mando.js` (pedido del integrador; design §9); prueba E2E de las acciones en los dos juegos

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Conteo del menú robusto (igual a `JUEGOS.length` de la página, con Futbolito y Billar) en `e2e-juegos`,
  `e2e-fusion`, `e2e-clasicos` y `e2e-karts`
- [x] 4.2 E2E nuevas `tests/e2e/e2e-futbolito.js` y `tests/e2e/e2e-billar.js` en la fase `base` de `correr.sh`:
  individual con toques reales (CDP), sala con 1 persona + bot y con 2 personas, revancha, capturas a 390 px y en
  horizontal

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [x] 5.2 E2E `futbolito billar juegos fusion clasicos revancha karts plataformas` con la copia de datos de prueba
  (la copia se descarta al terminar: estado restaurado)
- [x] 5.3 Revisar las capturas
- [x] 5.4 Reporte `openspec/changes/futbolito-billar/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Servidor local + estáticos: `curl` a `/juegos/sala` (crear futbolito/billar, jugada válida, inválida,
  sin sesión, tras final) y abrir los juegos sueltos en Chromium móvil (vertical, horizontal, `prefers-reduced-motion`,
  cuadros por segundo)
- [ ] 6.2 Tras el merge (usuario): probar en un celular real

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md` (Futbolito, Billar, motores y puente de sala), `docs/backend-standards.md`
  (jugadas, `partida_terminada`, catálogo y mesas), `docs/data-model.md` (`jugadas[]` de los dos juegos)
- [x] 7.2 `npx -y @fission-ai/openspec@1.4.1 validate futbolito-billar --strict`

## 8. Cierre

- [ ] 8.1 Commits en español; sin push, PR ni merge (los hace el usuario). Tras el merge: `openspec archive`
