## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/examen-segunda-oportunidad`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/segunda_oportunidad_test.ts`):
  - estado en espera entre viernes y domingo; 403 `segunda_pronto`;
  - el domingo da preguntas distintas y cuenta la mejor;
  - fuera de tiempo según su fecha;
  - validación;
  - el profe no espera.
- [x] 1.2 `server/motor.ts`, `server/actividades.ts` y `server/semana.ts`

## 2. Frontend

- [x] 2.1 `ingles.html`: botón y píldora de la 2.ª oportunidad, y aviso en el resultado

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite completa en verde

## 4. Contenido (repo privado de datos)

- [x] 4.1 `examen-2026-10-02`: `intentos: 2` y `segundaOportunidad: 2026-10-04`. Validar la semana con 0 errores.

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test`, `check` y `lint`
- [x] 5.2 E2E `e2e-segunda-oportunidad`:
  - viernes: resolver y ver el aviso;
  - sábado: en espera;
  - domingo: preguntas nuevas y la mejor cuenta.
  - Usa `PERMITIR_HOY` en el servidor local.
- [x] 5.3 Reporte `openspec/changes/examen-segunda-oportunidad/reports/2026-10-02-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 Producción, solo lectura: el examen de la semana 1 lista `segundaOportunidad` 2026-10-04 e `intentosMax` 2

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (`segundaOportunidad`) y skill `nueva-semana-ingles` (exámenes con 2 oportunidades)
