## Decisiones

### 1. Ámbito de contenido
- `Ambito = { contenido, clave, patron }`:
  - `AMBITO_CLASE` = `contenido`, sin cambios;
  - `AMBITO_PROFE` = `contenido/profe`.
- `loadItem`, `visibleItems`, `handleActividades` y `validarSemana` reciben el ámbito, y las claves de caché lo
  incluyen.
- Los ids de la ruta llevan prefijo `profe-` para no chocar con los del grupo en `resultados/`.

### 2. Identidad del profe
- `/ingles/profe/actividades` exige el correo de admin y llama a `handleActividades` con
  `{ isAdmin: false, alumno: "Profe" }`. Es el mismo flujo que el de un alumno: estado, intentos, corrección y
  guardado.
- El listado del ámbito profe agrega `plan` (`contenido/profe/plan.json`).

### 3. Semana del profe
| Día | Elemento | Intentos | Preguntas |
|---|---|---|---|
| Lunes | Actividad A: temas de estudio + práctica | 2 (el 2.º corrige) | 12 |
| Miércoles | Examen A (de la actividad A) | 1 | 15 |
| Jueves | Actividad B: temas de estudio + práctica | 2 | 12 |
| Sábado | Examen B (toda la semana; mensual en la semana 4) | 1 | 20–25 |

Los exámenes abren su día (`disponibleDesde` = `fechaLimite`). Se pueden hacer tarde y quedan marcados fuera de
tiempo.

### 4. Temario del mes 1 (B1+ → B2)
| Semana | Actividad A | Actividad B |
|---|---|---|
| 0 (28 sep) | Examen directo de la semana 1 del grupo + Diagnóstico B1 → B2 | — |
| 1 (5 oct) | Present perfect vs past simple; present perfect continuous | Narrative tenses: past continuous, past perfect, used to / would |
| 2 (12 oct) | Future forms: will, going to, present continuous, future continuous / perfect | Conditionals 0–3, mixed, unless; wish / if only |
| 3 (19 oct) | Passive voice (todos los tiempos) y have something done | Reported speech y reporting verbs |
| 4 (26 oct) | Relative clauses y modals of deduction | Linkers de contraste y phrasal verbs B2 |

Los enunciados van en inglés y las explicaciones en español. Alrededor del 70 % es opción múltiple y el 30 %
escritura.

### 5. Subpágina
`ingles.html?modo=profe` usa `ACT_URL = /ingles/profe/actividades` y no carga filas de Notion. Pinta, en este
orden:
1. la tarjeta "🗺️ Ruta del mes", con semanas, objetivo, Busuu, rutina y resultados por semana;
2. "Esta semana";
3. el tablero.

Reutiliza el reproductor de actividades y la vista de resultados.
