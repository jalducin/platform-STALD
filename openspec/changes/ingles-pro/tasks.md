## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-pro` (después de fusionar `ingles-grupos`)

## 1. Servidor (TDD)

- [x] 1.1 Escribir las pruebas en rojo de `/ingles/resumen` (indicadores y mapa de calor) y de la racha
  (`server/resumen_test.ts`; también la prórroga desde el cajón)
- [x] 1.2 Implementar los agregados: `server/resumen.ts` sobre el almacén, `PgStore.leerCarpeta` (una consulta por
  elemento), `calcularRacha` en `motor.ts` (la racha viaja en `/ingles/actividades`) y
  `POST /ingles/actividades/<id>/prorroga`

## 2. Frontend

- [x] 2.1 `estilos/stald.css`: tokens, modo oscuro y componentes
- [x] 2.2 Separar `ingles.html` en scripts (`comun`, `alumno`, `admin`, `tablero`, `reproductor`, `presentacion`,
  `profe` y `app`) sin cambiar su comportamiento (scripts clásicos; ver design §2)
- [x] 2.2b Navegación con `SECCIONES`: barra inferior en celular, pestañas o menú lateral en escritorio, ruteo por hash y botón Atrás
- [x] 2.3 Vista de alumno o alumna: encabezado con anillo, nivel y racha; Próxima clase; Para hoy; Semana; Resultados;
  e insignias
- [x] 2.4 Vista del profe: barra lateral de grupos, indicadores, mapa de calor y cajón de alumno o alumna
- [x] 2.5 Reproductor: progreso, una pregunta por pantalla en celular, atajos y resultado con barras por tema

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Ajustar todos los E2E de Inglés a los nuevos selectores y dejarlos en verde

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Correr el E2E `e2e-ingles-pro` en celular, escritorio y modo oscuro
- [x] 4.2 Correr Lighthouse local (≥ 90 en Accesibilidad y Buenas prácticas) y tomar capturas de antes y después
- [x] 4.3 Escribir el reporte en `openspec/changes/ingles-pro/reports/` (`2026-10-04-step-4-pruebas-y-verificacion.md`)

## 5. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar en producción, solo lectura: vista de alumno o alumna (cuenta de prueba) y tablero del profe
  (después del merge y del despliegue de Deno Deploy y Pages; queda a cargo de quien integra)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 Actualizar `docs/frontend-standards.md` (sistema de diseño y módulos) y `docs/backend-standards.md`
  (`/ingles/resumen`)
