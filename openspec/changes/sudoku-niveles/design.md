## Decisiones

### 1. Generación (cliente)
- Tablero resuelto por backtracking con números barajados (`sudokuResuelto(rnd)`).
- Quitar números en orden aleatorio mientras el tablero siga con **una sola solución**
  (`contarSoluciones(g, 2)`, backtracking con la celda de menos candidatos primero) hasta llegar a las
  pistas del nivel. En Experto se para si ya no se puede quitar sin perder la unicidad (~23–26 pistas).
- Funciones puras de nivel superior para poder probarlas desde el navegador.

### 2. Juego
- Celdas como botones (9×9, cajas con borde grueso). Tocar celda → elegir número en el teclado (1–9 con
  cuántos faltan de cada uno, ⌫ borrar) o con el teclado físico (dígitos, Supr/Retroceso y flechas).
- Número correcto → queda fijo en azul. Equivocado → rojo un momento, no se guarda y resta una vida.
- 3 errores → fin "💔 Sin vidas" con 0 puntos.

### 3. Puntos
`puntos = max(round(base × 0.2), round(base × (1 + 0.4 × max(0, 1 − seg/límite))) − 40 × errores)`.

| Nivel | Pistas | Base | Límite de rapidez | Máximo |
|---|---|---|---|---|
| Fácil | 40 | 400 | 10 min | 560 |
| Medio | 32 | 700 | 15 min | 980 |
| Difícil | 27 | 1000 | 20 min | 1400 |
| Experto | 23 | 1400 | 25 min | 1960 |

El servidor topa en 2000, como cualquier juego del catálogo.
