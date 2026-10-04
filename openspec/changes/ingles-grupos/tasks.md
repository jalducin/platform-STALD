## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-grupos`

## 1. Base de datos

- [x] 1.1 `supabase/migrations/001_stald_ingles.sql`: esquema `stald`, tablas, índices y RLS sin políticas públicas
- [x] 1.2 Aplicar en *Portafolio* con la CLI y confirmar que `public.contact_messages` no cambia

## 2. Servidor (TDD)

- [x] 2.1 Pruebas en rojo:
  - `db.ts`;
  - `ResultadosStore` (con respaldo de lectura);
  - grupos;
  - calendario por grupo.
- [x] 2.2 Implementar `server/db.ts`, `ResultadosStore`, `server/grupos.ts`, el grupo en el alta y `visibleItems`
  por grupo

## 3. Migración

- [x] 3.1 `herramientas/migrar-ingles.ts` con modo `--prueba`, `upsert` idempotente y cuadre de conteos
- [x] 3.2 Probar la migración contra una copia de los datos (2 corridas iguales)

## 4. Frontend (vista mínima del admin)

- [x] 4.1 Selector de grupo, tarjeta de grupos, grupo en el alta, "Mover de grupo" y filtros

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 5.1 Suite completa en verde y E2E de Inglés (alta, inicio lunes, ruta del profe, segunda oportunidad)

## 6. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 6.1 E2E `e2e-grupos`: crear un grupo, dar de alta, mover a alguien de grupo, filtrar resultados y guardar un
  resultado en Postgres
- [x] 6.2 Reporte `openspec/changes/ingles-grupos/reports/…-pruebas-y-verificacion.md`

## 7. Migración en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 7.1 Etiquetar el respaldo `antes-de-postgres`, correr el modo de prueba y luego la migración real
- [ ] 7.2 Cuadrar los conteos, verificar 3 documentos y dejar a todos en el "Grupo 1"
- [ ] 7.3 Hacer el corte a `ResultadosStore` y verificar en producción con una sola lectura

## 8. Documentación (OBLIGATORIO)

- [x] 8.1 Actualizar `docs/data-model.md` (tablas `stald`), `docs/backend-standards.md` (rutas y `db.ts`), README y
  `docs/deno-deploy-setup.md`
