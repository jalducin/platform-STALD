## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/basta-divertida-una-robo` desde `origin/main`

## 1. Pruebas primero (TDD)

- [x] 1.1 `server/basta_una_test.ts`:
  - validación de `opciones.extra` (arreglo o texto, desconocida, repetida, más de 2) y herencia en la revancha;
  - puntos de la columna extra (única, repetida, no verificada, vacía);
  - las tres listas de categorías iguales.
- [x] 1.2 `server/basta_una_test.ts`, ¡Una!:
  - robar hasta poder;
  - mazo vacío sin rebarajar;
  - determinismo;
  - aviso con el id 0;
  - el servidor rechaza `robar`/`pasar` con carta o color.

## 2. Basta: categorías divertidas

- [x] 2.1 `juegos/datos/basta.json`: `extras[]` con las 10 categorías y su banco de respuestas
- [x] 2.2 `juegos/basta.js`: `norm`, `dic` y `puntuar` (mudados de `juegos.html`), `conExtras`, `extrasDe` y
  `MAX_EXTRAS` = 2
- [x] 2.3 `server/salas.ts`: `EXTRAS_BASTA`, `MAX_EXTRAS_BASTA` y la validación de `opciones.extra` (400
  `extras_invalidas`)
- [x] 2.4 `juegos.html`:
  - selector al crear la partida (máximo 2, con aviso);
  - sala de espera con las categorías;
  - `datosBasta()` con las extras;
  - pantalla previa en Basta individual.

## 3. ¡Una!: robar hasta poder tirar

- [x] 3.1 `juegos/una.js`: `robarHastaPoder` y `avisoRobo`
- [x] 3.2 `juegos.html` individual: robo de la persona y de los bots, sin rebarajar para robar, y animación
  `.una-btn.nueva`
- [x] 3.3 `juegos.html` en sala: `estadoUna` (robo determinista con `ultima.robadas`), aviso y animación una vez por
  paso
- [x] 3.4 `server/salas.ts`: `robar`/`pasar` sin carta ni color

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 E2E `clasicos`: pantalla previa de Basta y Basta en inglés con 2 categorías divertidas
- [x] 4.2 E2E `basta-rondas`: sala con Pokémon y Antojito, puntos de la columna extra y revancha que las hereda
- [x] 4.3 E2E `una-robo`: robo hasta poder, aviso, animación y mazo vacío (antes: «cada robo suma 1 carta»)
- [x] 4.4 E2E `una-sala`: robos iguales en ambos dispositivos y partida sin bots hasta vaciar el mazo
- [x] 4.5 E2E `clasicos` (integración en `release/juegos-lote`): las 8 palabras de Basta en inglés son distintas
  entre sí; con la «P» la prueba repetía «pan» en Thing y en la cocina y la repetida no cuenta (7 de 8)
- [x] 4.6 E2E `una-robo` (integración): mínimo de 20 robos con tope de 300 s (antes 40 en 240 s). Con el equipo
  cargado llegaba a 23–26 robos sin ningún robo malo; las verificaciones de cada robo no cambian

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [x] 5.2 E2E `juegos partidas revancha basta-rondas una-sala una-robo clasicos` con datos de prueba (puertos 8917 y
  8895)
- [x] 5.3 Reporte en `openspec/changes/basta-divertida-una-robo/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 6.1 Revisar las capturas a 390 px:
  - crear la partida;
  - ronda con 9 casillas;
  - resultados;
  - sala de la revancha;
  - Basta individual;
  - robo de varias cartas en individual y en sala;
  - mazo vacío.
- [x] 6.2 Casos de error contra el servidor local (en la prueba Deno y la E2E): `extras_invalidas` y
  `jugada_invalida`
- [ ] 6.3 Tras el merge (lo hace el usuario): en producción, crear una partida de Basta con 2 categorías divertidas y
  robar en ¡Una!

## 7. Documentación técnica (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (`extras` de `basta.json` y `opciones.extra`), `docs/backend-standards.md` (validación)
  y `docs/frontend-standards.md` (regla de robo y módulos)
- [ ] 7.2 PR, CI, merge y `openspec archive` (lo hace el usuario)
