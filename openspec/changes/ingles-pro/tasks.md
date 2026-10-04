## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/ingles-pro` (después de fusionar `ingles-grupos`)

## 1. Servidor (TDD)

- [ ] 1.1 Escribir las pruebas en rojo de `/ingles/resumen` (indicadores y mapa de calor) y de la racha
- [ ] 1.2 Implementar las consultas agregadas sobre Postgres

## 2. Frontend

- [ ] 2.1 `estilos/stald.css`: tokens, modo oscuro y componentes
- [ ] 2.2 Separar `ingles.html` en módulos (`comun`, `alumno`, `admin` y `reproductor`) sin cambiar su comportamiento
- [ ] 2.3 Vista de alumno o alumna: encabezado con anillo, nivel y racha; Próxima clase; Para hoy; Semana; Resultados;
  e insignias
- [ ] 2.4 Vista del profe: barra lateral de grupos, indicadores, mapa de calor y cajón de alumno o alumna
- [ ] 2.5 Reproductor: progreso, una pregunta por pantalla en celular, atajos y resultado con barras por tema

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Ajustar todos los E2E de Inglés a los nuevos selectores y dejarlos en verde

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 Correr el E2E `e2e-ingles-pro` en celular, escritorio y modo oscuro
- [ ] 4.2 Correr Lighthouse local (≥ 90 en Accesibilidad y Buenas prácticas) y tomar capturas de antes y después
- [ ] 4.3 Escribir el reporte en `openspec/changes/ingles-pro/reports/`

## 5. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar en producción, solo lectura: vista de alumno o alumna (cuenta de prueba) y tablero del profe

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 Actualizar `docs/frontend-standards.md` (sistema de diseño y módulos) y `docs/backend-standards.md`
  (`/ingles/resumen`)
