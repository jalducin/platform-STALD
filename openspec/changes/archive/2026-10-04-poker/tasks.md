## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear la rama `feature/poker` y trabajar en ella

## 1. Motor (TDD)

- [x] 1.1 Escribir `server/cartas_test.ts` en rojo. Debe cubrir:
  - evaluador;
  - flujo de una mano;
  - jugadas inválidas;
  - botes laterales;
  - empates;
  - partidas de bots.
- [x] 1.2 Implementar `juegos/cartas.js` hasta que las pruebas pasen

## 2. Servidor

- [x] 2.1 Pruebas y código para:
  - `poker` en el catálogo;
  - `poker` en partidas;
  - validación de la jugada.

## 3. Frontend

- [x] 3.1 Individual: `elegirPoker`, mesa, bots, fin de partida, puntos y modo pareja
- [x] 3.2 Partida: `estadoPoker`, `pintarPokerSala`, clics y opción de equipos
- [x] 3.3 "📖 Cómo se juega" (`AYUDA`, `ayuda()`)

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Suite completa en verde, sin regresiones en partidas (¡Una! y las demás)

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 Correr `deno test`, `check` y `lint`
- [x] 5.2 Correr el E2E `e2e-poker`: individual y en partida con dos navegadores
- [x] 5.3 Escribir el reporte en `openspec/changes/poker/reports/2026-10-03-step-5-pruebas-y-verificacion.md`

## 6. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Jugar en producción una partida individual y una sala de póker con bots. Después, borrar la sala y la
  partida de prueba.

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 Actualizar:
  - `docs/frontend-standards.md` (motor de cartas y ayuda);
  - `docs/backend-standards.md`;
  - `docs/data-model.md`.

## 8. Ajuste post-apply del profe: ritmo más lento

- [x] 8.1 Aplicar los nuevos tiempos en el modo individual y en sala
- [x] 8.2 Correr E2E del póker y regresiones
- [x] 8.3 Verificar en producción
