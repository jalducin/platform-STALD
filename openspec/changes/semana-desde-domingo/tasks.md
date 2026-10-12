## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/semana-desde-domingo`

## 1. Servidor

- [x] 1.1 Prueba que falla en `server/semana_domingo_test.ts`: `abreYa`, el domingo se ve la semana y se abre lo del
  lunes, el examen sigue cerrado y el sábado todavía no se ve
- [x] 1.2 `abreYa` y `lunesSiguiente` en `server/motor.ts`, usados en `estadoItem`, `server/actividades.ts` y
  `server/resumen.ts`

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 `server/motor_test.ts`: el domingo anterior ya es «disponible»; el sábado, «proximamente»
- [x] 2.2 E2E de Inglés (hoy de prueba = domingo 2026-10-04): `profe-grupo` cuenta aparte la semana siguiente

## 3. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 3.1 `deno test -A server/` y `deno lint server/`
- [x] 3.2 E2E de Inglés y login
- [x] 3.3 Reporte en `openspec/changes/semana-desde-domingo/reports/2026-10-11-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 4.1 En producción (domingo 2026-10-11): Sofy ve «Semana 3» y puede abrir la actividad del martes

## 5. Documentación técnica (OBLIGATORIO)

- [x] 5.1 `docs/data-model.md` (la semana se ve desde el domingo); PR, CI, merge y archivo
