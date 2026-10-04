## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/inicio-lunes-alumnos`

## 1. Servidor

- [x] 1.1 Pruebas que fallan en `server/inicio_lunes_test.ts`:
  - `lunesDeInicio`;
  - alta con y sin `inicio`;
  - lista de actividades filtrada.
- [x] 1.2 Cambios en `server/alumnos.ts`, `server/actividades.ts` y `server/main.ts`

## 2. Frontend

- [x] 2.1 `ingles.html`: "inicia el lunes …" en el alta y en la lista; tarjeta "Tu curso empieza el lunes …" para la alumna

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite completa en verde

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Correr `deno test`, `check` y `lint`.
- [x] 4.2 E2E local:
  - alta de una alumna;
  - la alumna entra y no ve atrasos previos;
  - el resto del grupo sí los ve;
  - restaurar el estado.
- [x] 4.3 Reporte `openspec/changes/inicio-lunes-alumnos/reports/2026-10-03-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Hacer un alta de prueba en producción:
  - comprobar `inicio` y la lista;
  - borrar el alta.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 Actualizar `docs/data-model.md` y `docs/backend-standards.md`.
