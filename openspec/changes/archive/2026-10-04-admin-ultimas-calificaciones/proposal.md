## Why

El usuario pidió (2026-09-30) ver en su acceso de admin las **5 calificaciones más recientes de cada
alumno o alumna**. Hoy solo ve la última calificación de Notion (⭐) y el diagnóstico. Las calificaciones
de las actividades en línea están dentro del detalle de cada alumno o alumna.

## What Changes

- **Tarjeta "📊 Últimas calificaciones"** arriba de la vista de admin de `ingles.html`, con una fila por
  alumno o alumna y hasta 5 calificaciones, de la más reciente a la más antigua.
  - Cada una es un chip con su valor: `92%` en línea o `9` de Notion.
  - El color depende del nivel: verde ≥ 80, ámbar 60–79, rojo < 60.
  - Al pasar el cursor se ven el título y la fecha.
- **Dentro del bloque de cada alumno o alumna:** la misma lista con ícono, título, calificación y fecha.
- **Fuentes:**
  - **En línea:** actividades, refuerzo, reto y exámenes. Una entrada por elemento, con su mejor
    calificación y la fecha de su último envío.
  - **Notion:** filas con "Calificación" capturada, con la fecha de su última edición.
- Sin cambios de servidor: los datos ya llegan al admin (`/ingles/actividades` con `resultados` y
  `/ingles/data`).

## Capabilities

### Modified Capabilities
- `dashboard-ingles`: últimas 5 calificaciones por alumno o alumna en la vista de admin.

## Impact

- **Superficies:** solo `ingles.html`, en la vista de admin.
- **Acciones externas:** publicación de Pages al hacer merge (el agente verifica).

## Matriz de acceso

Solo el admin ve la tarjeta: la vista de alumno o alumna no cambia. No hay datos nuevos; es otra forma de
mostrar lo que el admin ya recibe.
