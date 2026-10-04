## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ajedrez`

## 1. Motor (TDD)

- [x] 1.1 Escribir en rojo `server/ajedrez_test.ts`: perft, reglas especiales, finales, SAN y bot
- [x] 1.2 Implementar `juegos/ajedrez.js` hasta que pase a verde

## 2. Servidor

- [x] 2.1 Agregar pruebas y código para:
  - `ajedrez` en el catálogo y en partidas;
  - validación de la jugada;
  - opción `reloj`.

## 3. Frontend

- [x] 3.1 Tablero compartido: selección, destinos, coronación, última jugada, jaque y volteo
- [x] 3.2 Individual: niveles, color, bot, rendirse y puntos
- [x] 3.3 Partida 1 vs 1: `estadoAjedrez` con relojes, bot de respaldo y opción de reloj
- [x] 3.4 Agregar `AYUDA.ajedrez`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Suite completa en verde
- [x] 4.2 Actualizar los conteos del hub en los E2E y correr las regresiones

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 Correr `deno test`, `check` y `lint`
- [x] 5.2 Correr el E2E `e2e-ajedrez`: individual y 1 vs 1 con dos navegadores
- [x] 5.3 Escribir el reporte `openspec/changes/ajedrez/reports/2026-10-03-step-5-pruebas-y-verificacion.md`

## 6. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Probar en producción:
  - individual sin terminar, para que no se guarden puntos;
  - sala 1 vs bot con jugadas aceptadas;
  - borrar la sala al terminar.

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 Actualizar `docs/frontend-standards.md`, `docs/backend-standards.md` y `docs/data-model.md`

## 8. Ajuste post-apply del profe: sala sin bots y niveles renombrados

- [x] 8.1 Servidor:
  - pruebas en rojo de cupo 2, `bots: false` y `faltan_jugadores`;
  - implementar `CUPO`.
- [x] 8.2 Página:
  - `participantes()` devuelve solo humanos en ajedrez;
  - la casilla de bots se oculta en ajedrez;
  - los niveles se llaman Básico, Intermedio y Avanzado;
  - aviso cuando falta el rival.
- [x] 8.3 E2E: sala con dos personas, el tercero queda fuera y no se puede empezar sin rival; regresiones
- [x] 8.4 Verificar en producción; actualizar la documentación y el reporte
