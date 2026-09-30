## Why

Las tarjetas de resumen del tablero de Inglés (Hechas 3 días, Atrasadas, Hoy, Próximas) solo muestran
conteos. El usuario pidió (2026-09-30) que al tocarlas filtren el tablero, para ir directo a lo que
importa (p. ej. solo lo atrasado).

## What Changes

- **Cada tarjeta es un botón de filtro:**
  - Al tocarla, el tablero muestra solo su sección y la tarjeta queda marcada.
  - Al tocarla otra vez, o en "Ver todo", se quita el filtro.
- Relación tarjeta → sección:

  | Tarjeta | Sección |
  |---|---|
  | Hechas 3 días | ✅ Realizadas · últimos 3 días |
  | Atrasadas | ⏰ Atrasadas |
  | Hoy | 📌 Hoy |
  | Próximas | 📅 Próximas |

- Con filtro activo se ocultan también "Realizadas anteriores" y "Sin fecha".
- **Admin:** cada tablero de alumno o alumna filtra por separado.
- El filtro no se guarda: al recargar se ve todo.

## Capabilities

### Modified Capabilities
- `dashboard-ingles`: tarjetas de resumen que filtran el tablero.

## Impact

- **Superficies:** solo `ingles.html`, sin cambios de servidor ni de datos.
- `index.html` (Secundaria) queda igual; se puede replicar después si se pide.
- **Acciones externas:** publicación de GitHub Pages al hacer merge (el agente verifica).

## Matriz de acceso

Sin cambios. El filtro solo oculta filas que el usuario ya ve.
