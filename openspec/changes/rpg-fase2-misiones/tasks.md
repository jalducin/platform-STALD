## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: crear la rama `feature/rpg-fase2-misiones` desde `main` (worktree aparte)

## 1. Pruebas que fallan (TDD)

- [x] 1.1 Validador `--misiones <ámbito>`: misión válida, rúbrica ≠ 100, fechas fuera del mundo o fuera de orden, sin
  aviso de privacidad, paso con `tipoEntrega` `imagen` o `audio` = error; `mundos.json` encimado = error y, en
  Secundaria, nombres y fechas distintos a `comun/gamificacion.js` = error (`server/misiones_validar_test.ts`)
- [x] 1.2 Entrega solo texto: 200, 400 `entrega_invalida` (vacía o > 4 000), 400 `tipo_no_permitido` (archivo, multipart
  o `tipo` ≠ texto), 409 `ya_evaluado`, 404 ajena o mundo futuro, 403 baja e invitado, 401, 503 al fallar Postgres
  (`server/misiones_test.ts`)
- [x] 1.3 Bandeja `/profe/entregas`: orden, evaluar (XP = rúbrica × 3 + 60 a tiempo), 409 `incompleta`, 400
  `rubrica_invalida`, corrección por privacidad borra el texto, borrar contenido conserva la evaluación, 403 a alumnos
- [x] 1.4 `POST /practica/comprobar` y teoría publicada sin respuestas
- [x] 1.5 `comun/gamificacion.js`: XP de misión, mapa con catálogo, misiones diarias y semanales sin XP, árbol

## 2. Implementación

- [x] 2.1 `server/misiones_validar.ts` y `server/validar_semana.ts`: forma `--misiones <ámbito>`
- [x] 2.2 `server/misiones.ts` y rutas en `server/main.ts`; prefijo `entregas/` en `server/db.ts`
- [x] 2.3 Bandeja básica del admin y script `server/retencion_entregas.ts`
- [x] 2.4 `POST /practica/comprobar` y teoría sin respuestas en `server/actividades.ts`
- [x] 2.5 `comun/gamificacion.js` (aditivo)
- [x] 2.6 Vistas «🗺️ Mapa», «🌳 Árbol», «⚔️ Misiones» (entrega con recordatorio y contador), retroalimentación y
  «📥 Entregas» del admin (`ingles/secundaria-misiones.js`, `ingles/secundaria.css`)
- [x] 2.7 `contenido/secundaria/mundos.json` en una copia del repo privado, validado con 0 errores y subido el 2026-10-22
  con el código ya en producción (las misiones piloto las sube el agente de contenido)
- [x] 2.8 Skill `clases-secundaria` con la sección de misiones y `node ai-specs/scripts/sincronizar-espejos.mjs`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Pruebas de `server/` afectadas (actividades, gamificación, espejos) y E2E de Secundaria
  (`e2e-examen-secundaria`, `secundaria-clases`, `secundaria-dashboard`); E2E nueva `e2e-misiones` a 360 px, claro y
  oscuro

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/` (subagente `verificador-pruebas`), `deno check server/main.ts`, `deno lint server/` y
  E2E de Secundaria en los puertos 8911/8912 con copia temporal de datos; sin tablas `stald_` reales (stores en memoria
  o `stald_test_*`). Reporte `openspec/changes/rpg-fase2-misiones/reports/AAAA-MM-DD-step-4.1-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Servidor local con copia de datos y curl a cada fila de la matriz (admin, alumna, alumno de Inglés, de baja,
  invitado, sin sesión, correo no asignado, misión ajena, texto demasiado largo, archivo adjunto); CLI `--misiones` con
  caso válido e inválido; restaurar las entregas de prueba (copia temporal que se borra)

## 6. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Tras el merge (PR #233, 2026-10-22): `/salud`, rutas nuevas en solo lectura (401 sin sesión), vistas publicadas (`?v=`); avisar al
  coordinador para subir las misiones piloto

## 7. Documentación técnica (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (`mundos.json`, `misiones/`, `entregas/`, `teoria[].practica`), `docs/backend-standards.md`
  (rutas y matriz), `docs/frontend-standards.md` (vistas y gamificación de misiones)

## Pendiente (fuera de este cambio)

- Aviso de privacidad y consentimiento (tareas 3.13–3.14 del paraguas, otro agente, interruptor apagado)
- Archivar los cambios de Fase 1 (tarea 2.1 del paraguas): espera el visto bueno del profe
