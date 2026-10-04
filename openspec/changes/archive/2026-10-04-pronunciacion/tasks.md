## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/pronunciacion`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/pronunciacion_test.ts`):
  - frase exacta y con contracciones → correcta; coincidencia < 80 % → incorrecta;
  - `auto:ok` / `auto:repetir`; respuesta saneada (≤ 300);
  - `validateItem` exige `frase`; vista pública con `frase` y `audio`, sin `explicacion`;
  - revisión con lo reconocido y la frase;
  - patrón del profe con viernes.
- [x] 1.2 `server/motor.ts` (tipo `pronunciar`, `audio`, similitud) y `server/semana.ts` (viernes en el
  patrón del profe)

## 2. Frontend

- [x] 2.1 `ingles.html`:
  - 🔊 y 🐢 con `speechSynthesis`;
  - bloque `pronunciar` con reconocimiento de voz, coincidencia en vivo y repetición;
  - autoevaluación sin reconocimiento.

## 3. Contenido (repo privado de datos)

- [x] 3.1 5 actividades de pronunciación (`profe-pron-2026-10-02` … `-10-30`), semanas y `plan.json`
  regenerados
- [x] 3.2 Validar las 5 semanas con `--profe` (0 errores)

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Suite completa en verde; `profe_test.ts` sigue en verde con el patrón nuevo

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test`, `check` y `lint`
- [x] 5.2 E2E `e2e-pronunciacion`:
  - 🔊 llama a `speechSynthesis`;
  - reconocimiento simulado: correcta e incorrecta;
  - autoevaluación sin reconocimiento;
  - envío y revisión.
  - Regresión `e2e-ruta-profe`.
- [x] 5.3 Reporte `openspec/changes/pronunciacion/reports/2026-10-01-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Producción, solo lectura:
  - la ruta lista la pronunciación del viernes 2 con sus 12 ejercicios;
  - la vista pública trae `frase` y `audio` sin respuestas.

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (`audio`, `pronunciar`), `docs/backend-standards.md` (calificación) y
  `docs/frontend-standards.md` (voz y privacidad)
- [x] 7.2 Skill `nueva-semana-ingles` (pronunciación en el mes siguiente del profe)
