## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/cierre-tecnico`

## 1. Servidor (TDD)

- [x] 1.1 Pruebas que fallan:
  - prefijos de `PgStore`;
  - errores sin respaldo;
  - `importarNotion`.
- [x] 1.2 Implementar en `PgStore`:
  - prefijos;
  - quitar el respaldo;
  - marcas en `main.ts`.
- [x] 1.3 Fase 1: importar identidades de Notion en `GET /ingles/alumnos` (admin)
- [x] 1.4 `migrar-ingles.ts --juegos`

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 Ajustar las pruebas del respaldo de `PgStore` y dejar la suite completa en verde

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 Migrar Juegos en `stald_test_*`
- [x] 3.2 Correr los E2E de Juegos en modo Postgres de prueba
- [x] 3.3 Escribir el reporte

## 4. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Publicar la fase 1 y la migración de Juegos:
  - no debe haber salas vigentes;
  - correr `--prueba`, la migración real y `--delta`;
  - cuadrar los conteos;
  - jugar una partida de prueba y borrarla.
- [ ] 4.2 Importar Notion: el profe abre Inglés y se verifica en la base que el registro tenga a todas las personas
  con correo
- [ ] 4.3 Fase 2 (Inglés sin Notion):
  - pruebas;
  - publicar;
  - verificar que las personas importadas siguen entrando.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 Actualizar `docs/data-model.md`, `docs/backend-standards.md` y `README.md`
