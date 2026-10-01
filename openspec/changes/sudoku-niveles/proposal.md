## Why

El usuario pidió (2026-09-30) **sudokus por niveles, individuales**, dentro de Juegos (categoría Mente
ágil).

## What Changes

- Juego nuevo **🔢 Sudoku** (`mente-sudoku`), solo individual:
  - niveles **Fácil** (40 pistas), **Medio** (32), **Difícil** (27) y **Experto** (~24);
  - cada tablero se genera en el navegador, con **solución única**;
  - 3 vidas: un número equivocado se marca en rojo y quita una vida;
  - resaltado de fila, columna, caja y números iguales; teclado numérico y teclado físico;
  - contador de tiempo y de números que faltan.
- **Puntos** (solo al resolverlo): base por nivel (400, 700, 1000, 1400) + hasta 40 % por rapidez
  (límite 10, 15, 20 o 25 min) − 40 por error; mínimo el 20 % de la base. Sin vidas → 0.
- **Servidor:** `mente-sudoku` en `CATALOGO` (categoría `mente`, tope 2000).

## Capabilities

### Modified Capabilities
- `juegos`: Sudoku por niveles.

## Impact

- `server/juegos.ts` (catálogo), `juegos.html`, pruebas y E2E.
- Sin datos nuevos: el tablero se genera en el navegador.
- Acciones externas: redeploy al hacer merge; verificación en producción y restauración de la partida de
  prueba.
