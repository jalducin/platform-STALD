## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ruta-profe`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/profe_test.ts`):
  - ámbito profe con plan y solo sus elementos;
  - el grupo no ve contenido de profe;
  - intento guardado como Profe;
  - ruta solo admin (403);
  - validador con ámbito profe y su patrón;
  - nombre "Profe" reservado en altas.
- [x] 1.2 Implementación:
  - ámbito en `server/actividades.ts` y `server/semana.ts`;
  - `handleProfe` y ruta en `server/main.ts`;
  - CLI `validar_semana.ts --profe`;
  - nombre reservado en `server/alumnos.ts`.

## 2. Contenido (repo privado de datos)

- [x] 2.1 Generador `herramientas/profe-mes-1/gen_profe_mes1.py`:
  - `plan.json`;
  - semana 0: examen directo + diagnóstico;
  - semanas 1–4: 2 actividades + 2 exámenes cada una.
- [x] 2.2 Validar las 5 semanas con 0 errores

## 3. Frontend

- [x] 3.1 `ingles.html?modo=profe`: título, ruta de actividades, sin filas de Notion y tarjeta "Ruta del mes"
  con resultados
- [x] 3.2 Enlaces desde la vista de admin y desde el portal (solo admin)

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Suite completa en verde; ajustar pruebas de actividades si cambia la firma

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test`, `check` y `lint`
- [x] 5.2 E2E `e2e-ruta-profe`:
  - plan y semana 0;
  - resolver el examen directo y ver el resultado;
  - el grupo no la ve;
  - la vista del grupo no cambia.
- [x] 5.3 Reporte `openspec/changes/ruta-profe/reports/2026-10-01-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Producción:
  - listar la ruta como admin (plan y semana 0);
  - 403 con otro correo;
  - abrir un elemento sin enviar, para no gastar el intento del profe.
- [x] 6.2 Subir el contenido al repo de datos tras la aprobación del profe

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/backend-standards.md` (ruta y ámbito) y `docs/data-model.md` (`contenido/profe/`)
- [x] 7.2 README del repo de datos
- [x] 7.3 Skill `nueva-semana-ingles`: cómo armar el mes siguiente del profe
