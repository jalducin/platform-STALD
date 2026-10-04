## Decisiones

### 1. `ultimasCalificaciones(nombre, filasNotion, items)` en `ingles.html`
Junta las calificaciones de las dos fuentes, las ordena de la más reciente a la más antigua y devuelve
las primeras 5:

| Fuente | Qué entra | `valor` | `pct` (para el color) | `fecha` |
|---|---|---|---|---|
| En línea | cada elemento con un resultado de ese alumno o alumna | `mejor.porcentaje` + `%` | el porcentaje | `enviadoEn` del último intento |
| Notion | filas con `calificacion` no vacía | el texto capturado | si es un número ≤ 10, × 10; si es un número mayor, tal cual; si no es número, sin color | `editadoEn` |

Cada entrada lleva también `titulo` e `icono`.

### 2. Presentación
- **Tarjeta resumen:** tabla de dos columnas.
  - En la primera va el nombre.
  - En la segunda, hasta 5 chips (`.chip.fortaleza`, `.en-progreso` o `.debilidad` según `pct`) con
    `title="<titulo> · <fecha>"`.
  - Sin calificaciones se muestra "—".
- **En el bloque del alumno o alumna:** una lista "🗓️ Últimas 5 calificaciones" con ícono, título,
  valor y fecha (`es-MX`, día y mes).
- Todo texto se inserta con `escapeHtml`.
