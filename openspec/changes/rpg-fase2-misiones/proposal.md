## Why

El profe aprobó la propuesta paraguas `plataforma-rpg` (2026-10-21). Su Fase 2, parte A, lleva a Secundaria las
**misiones principales**: un proyecto por mundo, con pasos, entrega **solo en texto** y evaluación con rúbrica, más el
catálogo de mundos, el árbol de habilidades, las misiones diarias y semanales (sin XP) y la práctica con revisión en el
servidor. El diseño completo vive en `openspec/changes/plataforma-rpg/design.md` (§1, §2, §3.2, §4 y §6); este cambio
**mueve** a su `specs/` los requisitos que implementa y los quita del paraguas.

## What Changes

- **Validador:** forma nueva `validar_semana.ts <datos> --misiones <ámbito>` (sin `<lunes>`): valida
  `contenido/<ámbito>/mundos.json` (fechas encimadas por materia = error; en Secundaria, nombres y fechas iguales a los
  de `comun/gamificacion.js`) y cada `contenido/<ámbito>/misiones/<id>.json` (campos, 3 a 5 pasos en orden y dentro de su
  mundo, `tipoEntrega` solo `texto`, rúbrica de 4 criterios que suma 100 y aviso de privacidad en la consigna).
- **Servidor (`server/misiones.ts`, rutas nuevas):**
  - `GET /misiones` y `POST /misiones/<id>/entrega` (solo texto, 1–4 000 caracteres; archivo → 400
    `tipo_no_permitido`), guardadas en `entregas/<misión>/<slug>.json` de `stald_docs` (prefijo nuevo en Postgres).
  - Bandeja básica del admin `/profe/entregas` (evaluar con la rúbrica, pedir corrección —con privacidad borra el texto—,
    borrar contenido de una entrega o de una persona).
  - `POST /practica/comprobar`: práctica de los pasos de teoría de Secundaria; la respuesta nunca viaja al navegador
    (la teoría se publica sin `correcta` ni `aceptadas`).
  - Script de retención `server/retencion_entregas.ts` (31 de agosto: borra el contenido y conserva la evaluación).
- **`comun/gamificacion.js` (aditivo):** XP de misión (rúbrica × 3 + 60 a tiempo) en el mismo total, mapa de mundos con
  catálogo y estados dominado/completado con misión, misiones diarias y semanales sin XP con sus insignias, y árbol de
  habilidades. La fórmula de la Fase 1 no cambia (10 casos de regresión, tarea 2.3 del paraguas).
- **Secundaria (`ingles.html?modo=secundaria`):** pestañas «🗺️ Mapa», «🌳 Árbol» y «⚔️ Misiones» (pasos, cuadro de
  entrega con recordatorio de privacidad y contador), retroalimentación accesible (XP de la misión evaluada, práctica de
  teoría) y, para el admin, «📥 Entregas» con la rúbrica.
- **Contenido (repo privado):** `contenido/secundaria/mundos.json`. Las misiones piloto las escribe otro agente con el
  formato de `docs/data-model.md` y se suben cuando el motor esté en producción.
- **Skill** `clases-secundaria`: sección de misiones (entregables solo en texto).

## Matriz de acceso

| Quién | `GET /misiones` | `POST /misiones/<id>/entrega` | `/profe/entregas*` | `POST /practica/comprobar` |
|---|---|---|---|---|
| Admin | todas las de Secundaria (o `?alumna=`), sin entregas | 403 `solo_alumnos` | 200 | 200 (cualquier clase) |
| Alumna de Secundaria | las suyas visibles | 200 en las suyas; ajena o mundo futuro 404 | 403 | 200 en sus clases visibles; ajena 404 |
| Alumno activo de Inglés | las de `contenido/ingles/misiones` de su grupo (hoy ninguna) | ajena 404 | 403 | 404 |
| Baja de Inglés (sin Secundaria) | solo sus entregas anteriores, sin enviar | 403 | 403 | 403 |
| Invitado de Juegos o correo no asignado | 403 | 403 | 403 | 403 |
| Sin sesión | 401 | 401 | 401 | 401 |

Las respuestas no llevan correos; el panel muestra el nombre de pila. La verificación es por fila (pruebas Deno y curl).

## Impact

- Superficies: servidor Deno (`server/misiones.ts`, `server/main.ts`, `server/actividades.ts`, `server/db.ts`,
  `server/validar_semana.ts`), `ingles.html` (modo Secundaria), `comun/gamificacion.js`, repo de datos
  (`mundos.json`), Postgres (`stald_docs`, solo rutas nuevas `entregas/`; sin migración).
- Sin dependencia del aviso de privacidad ni del consentimiento (tareas 3.13–3.14 del paraguas, detrás de un interruptor
  apagado): las entregas solo texto no los requieren.
- Acciones externas: subir `mundos.json` y las misiones piloto al repo privado (agente, cuando el código esté en
  producción).
