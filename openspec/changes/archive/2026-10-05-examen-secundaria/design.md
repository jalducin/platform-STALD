## Decisiones
1. **Reutilizar el motor.** El motor de Inglés ya hace lo necesario:
   - intentos con mejor calificación;
   - retroalimentación por tema;
   - resultados en Postgres (`resultados/`).

   Se agrega `AMBITO_SECUNDARIA = { contenido: "contenido/secundaria", clave: "secundaria" }`, igual que
   `AMBITO_PROFE`. Cada materia es un **tema**, así que el resultado sale por materia.
2. **Identidad.** `handleSecundaria(req, sub, email, admin, store, filasSecundaria, json)`:
   - el admin entra como admin, con los resultados de todas las personas;
   - quien tiene filas de Secundaria entra con su primer nombre (el mismo que usa `/perfil`); el slug es, por
     ejemplo, `sofia`;
   - cualquier otra persona recibe 403 `sin_acceso`.
3. **Exclusivo.** El campo `alumnos?: string[]` del elemento:
   - en la lista se ocultan los elementos que no son para el slug;
   - al abrir uno por id responde 404, igual que un elemento ajeno;
   - sin el campo, lo ve todo el ámbito (sin cambios para Inglés).
4. **Dos oportunidades.** El elemento es `tipo: "examen"` con `intentos: 2` y sin `segundaOportunidad`: el
   segundo intento está disponible de inmediato. Se queda la mejor calificación (`mejor`, como en Inglés). Con el
   tercero responde 409 `sin_intentos`.
5. **Frontend.**
   - `?modo=secundaria` reutiliza `ingles.html`: sesión, reproductor y resultados.
   - Lleva una vista propia (`ingles/secundaria.js`), sin la barra de secciones de Inglés.
   - Alumna: tarjetas de examen con estado, intentos y mejor calificación.
   - Admin: por examen, cada persona con su mejor calificación, intentos y materias a reforzar.
6. **Contenido.**
   - Va en `contenido/secundaria/semanas/2026-10-05.json` y `contenido/secundaria/examenes/`, del 5 al 11 de
     octubre.
   - Preguntas abiertas: los cálculos van como respuesta corta exacta (10.75, 5/6, 7) y las de texto libre como
     opción múltiple (programa con `for`, 16 de septiembre, zonas arqueológicas, preguntas de la noticia).

## Pruebas
- Unitarias (`server/secundaria_test.ts`):
  - la alumna ve y resuelve su examen;
  - otra persona de Secundaria no lo ve y recibe 404 por id;
  - un correo sin Secundaria recibe 403;
  - con dos intentos se queda el mejor y el tercero se rechaza;
  - el admin ve los resultados.
- E2E: la alumna entra en `?modo=secundaria`, contesta, ve su resultado y el segundo intento; el admin ve la
  tabla de resultados.
