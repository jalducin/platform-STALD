## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/ejercicios-ordenar-emparejar` desde `origin/main`

## 1. Servidor

- [x] 1.1 Pruebas que fallan en `server/ordenar_emparejar_test.ts`:
  - calificación de `ordenar` (orden correcto, con `aceptadas`, mal, con distractor);
  - calificación de `emparejar` (todo bien, un par mal, parcial);
  - saneo (largo, tipos y opciones inexistentes);
  - textos de revisión;
  - vista pública determinista, sin respuestas y nunca en el orden correcto;
  - validación (campos, 3–6 pares, fichas y textos repetidos);
  - corrección (fijas y anteriores);
  - `PUT /<id>/borrador` con avance parcial.
- [x] 1.2 `server/motor.ts`: tipos, `publicQuestion(e, semilla)`, `esCorrecta`, `textoRespuesta`,
  `textoCorrecta`, `sanitizeRespuestas` y `validateItem`.
- [x] 1.3 `server/actividades.ts`: semilla por alumno o alumna e intento en la vista pública.

## 2. Página

- [x] 2.1 `ingles/reproductor.js`:
  - bloque `ordenar` (fichas, línea, «Borrar»);
  - bloque `emparejar` (dos columnas, color y número, deshacer);
  - `examAnswers` y el progreso (pares completos);
  - restaurar el borrador, mostrar las fijas de la corrección y la región `aria-live`.
- [x] 2.2 `ingles/app.js` (acciones `ficha`, `ord-borrar`, `emp`) e `ingles/ingles.css` (fichas, pares,
  colores y 390 px)

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `server/motor_test.ts` y `server/pronunciacion_test.ts` siguen en verde con la nueva firma de
  `publicQuestion`.
- [x] 3.2 Actividad de prueba `tests/fixtures/datos/contenido/actividades/fichas-e2e.json`, exclusiva de
  Fernando, en la semana de prueba 2026-09-21.
- [x] 3.3 E2E nueva `tests/e2e/e2e-ordenar-emparejar.js`, registrada en `tests/e2e/correr.sh` (fase `ingles`).
  Cubre:
  - resolver mal;
  - revisión de errores;
  - recarga a medio intento;
  - intento de corrección resuelto bien;
  - vista previa del admin sin respuestas;
  - captura a 390 px.

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [x] 4.2 E2E de la fase `ingles` completa más `ordenar-emparejar`, con la copia de datos (la original no se
  modifica)
- [x] 4.3 Reporte en
  `openspec/changes/ejercicios-ordenar-emparejar/reports/2026-10-11-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 5.1 Servidor local con la copia de datos, usando `curl`:
  - la vista pública trae `fichas`, `izquierda` y `derecha`, sin respuestas;
  - un envío con un arreglo malformado cuenta como sin responder;
  - `validar_semana.ts` reporta un `emparejar` con 2 pares (copia temporal).
- [x] 5.2 Revisar las capturas a 390 px (fichas y pares sin desbordar)

## 6. Documentación técnica (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md`: formato JSON de `ordenar` y `emparejar`
- [x] 6.2 `docs/backend-standards.md` (calificación) y `docs/frontend-standards.md` (fichas y pares,
  accesibilidad), si aplica
- [x] 6.3 Skill `ai-specs/skills/nueva-semana-ingles/SKILL.md`, con una copia idéntica en
  `.claude/skills/nueva-semana-ingles/SKILL.md`
- [x] 6.4 `npx -y @fission-ai/openspec@1.4.1 validate ejercicios-ordenar-emparejar --strict`
- [ ] 6.5 Tras el merge (integrador): verificar en producción y `openspec archive`
