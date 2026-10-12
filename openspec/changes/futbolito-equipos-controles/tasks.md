## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/futbolito-equipos-controles` desde `origin/main` (eae63e5), sin
  *upstream* (no se hace push).

## 1. Diagnóstico de controles (antes de cambiar)

- [x] 1.1 Medir con Playwright (emulación móvil, toques reales por CDP) a 390×844 y 844×390, suelto y dentro de
  `juegos.html`: patada, temblor, toque largo, barra activa, arrastre, retraso, *scroll*/zoom; Billar: salto de la
  mira, precisión, tiro accidental, ⟲ ⟳, barra de fuerza. Resultados en `design.md` §1.

## 2. Servidor con TDD

- [x] 2.1 Pruebas que fallan en `server/futbolito_equipos_test.ts`: formato `1v1`/`2v2` (inválido → 400
  `formato_invalido`); mesa 2 vs 2 (4 personas, la quinta `sala_llena`; con bots empieza con 1; sin bots con 2);
  reparto automático y `equipo` en unirse (`equipo_lleno`, `equipo_invalido`, solo antes de empezar, solo 2 vs 2);
  tiro con `barra` guardado; en 2 vs 2 sin `barra` → `jugada_invalida`; barra ajena → 409 `no_es_tu_barra`; reparto
  del servidor igual al de `Futbolito.repartir`. Actualizar `server/mesas_test.ts` y la prueba de `MESAS` de
  `server/futbolito_billar_test.ts`.
- [x] 2.2 `server/futbolito.ts` (formato, reparto, equipo, dueño de la barra) y cambios chicos marcados
  `// futbolito-equipos` en `server/salas.ts`; `juegos/mesas.js` con `formatos`.

## 3. Motores con TDD (Deno)

- [x] 3.1 Pruebas que fallan en `server/futbolito_equipos_test.ts`: `Futbolito.repartir` (1 vs 1, 2 vs 2 con bots,
  preferencias, 2 vs 1), `Futbolito.motorSala` (turno = asiento dueño de la barra con la pelota; rendirse por equipo),
  `Fisica.linea` con `valida` (jugada con barra ajena no cuenta), `Futbolito.barraActivaCon` (pelota pegada por detrás,
  histéresis).
- [x] 3.2 Implementar en `juegos/futbolito-motor.js` y `juegos/fisica.js`.

## 4. Controles y equipos en las páginas

- [x] 4.1 E2E que fallan primero: ampliar `tests/e2e/e2e-futbolito.js` (selector y preferencia; Botones con toques
  reales: flecha sostenida, PATEA al bajar el dedo con temblor y 350 ms, 🔄 BARRA; Deslizar; Mando clásico con toques
  reales y control físico simulado; teclado ↑↓/Espacio/Tab/Q/E; sala 2 vs 2 con 2 personas + 2 bots, cambio de equipo,
  colores y nombres, tiro de quien tiene la pelota, `no_es_tu_barra`) y `tests/e2e/e2e-billar.js` (toque sin salto,
  sin tiro accidental, ⟳ sostenido, barra de fuerza, TIRAR, resortera con cancelación, mando y teclado).
- [x] 4.2 `juegos/mesa-ui.js`: `sostener` (botón táctil sostenido con repetición) y `linea` con asientos.
- [x] 4.3 `juegos/futbolito.html`: selector, Botones, Deslizar, Mando clásico, teclado, barra activa con histéresis,
  panel de tiro de sala, sala por asientos (colores, nombres, turno por barra, `barra` en el tiro).
- [x] 4.4 `juegos/billar.html`: arrastre sin salto, ajuste fino sostenido, ángulo visible, bola fantasma, resortera
  segura, barra de fuerza vertical, TIRAR grande, Mando clásico y preferencia.
- [x] 4.5 `juegos.html` (cambios chicos marcados `// futbolito-equipos`): formato al crear, equipos y «🔁 Cambiar de
  equipo» en la espera, `participantes()` con opciones, `pintarFisicaSala` con la mesa completa.

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 5.1 Revisar las verificaciones existentes de `e2e-futbolito`, `e2e-billar`, `e2e-mando`, `e2e-karts` y
  `e2e-juegos` (texto de ayuda del menú, «Desliza», panel de tiro, `#r-fuerza`) y ajustarlas a los controles nuevos sin
  perder cobertura.

## 6. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 6.1 `npx -y deno test -A server/` y `npx -y deno lint server/`.
- [x] 6.2 E2E: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9009 --puerto-web 8999
  futbolito billar mando karts juegos` (la copia temporal se descarta al terminar: estado restaurado; nunca se
  escribe en tablas `stald_`).
- [x] 6.3 Reporte `openspec/changes/futbolito-equipos-controles/reports/2026-10-12-step-6-pruebas-y-verificacion.md`.

## 7. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 7.1 Revisar las capturas a 320, 390 y 844×390 (suelto y en Juegos): botones, mando, panel de tiro, sala 2 vs 2;
  corregir lo que se vea mal. Casos de error: sin `localStorage`, valor desconocido de la preferencia, `curl` a
  `/juegos/sala` (formato inválido, equipo lleno, barra ajena, sin sesión).
- [ ] 7.2 Tras el merge (usuario): probar en celulares reales con 4 personas.

## 8. Documentación (OBLIGATORIO)

- [x] 8.1 `docs/frontend-standards.md` (controles de Futbolito y Billar, mando, sala por equipos) y
  `docs/backend-standards.md` (formato, `equipo`, `barra`, `no_es_tu_barra`, `equipo_lleno`, mesa por formato);
  `docs/data-model.md` (`equipo` y `barra`).
- [x] 8.2 `npx -y @fission-ai/openspec@1.4.1 validate futbolito-equipos-controles --strict`.

## 9. Cierre

- [ ] 9.1 Commits en español; sin push, PR ni merge (integra el usuario tras `organizar-codigo`). Tras el merge:
  `openspec archive`.
