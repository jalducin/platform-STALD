## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear la rama `fix/e2e-loteria-tema` desde `origin/main`

## 1. Prueba

- [x] 1.1 `tests/e2e/e2e-loteria-sala.js`: tocar `[data-tema="todo"]` al abrir `en-frases` y esperar `[data-opt]` (los botones de tema también son `.opt`)

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 Revisar las demás E2E que abren `en-frases` o `en-ordena` (`e2e-juegos`, `e2e-fusion`, `e2e-clasicos`): ya eligen «Todo»

## 3. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 3.1 `deno test -A server/` y `deno lint server/` sin fallas
- [x] 3.2 E2E `loteria-sala` en local (puertos 8929/8909) con la copia de datos de prueba; estado de datos sin cambios
- [x] 3.3 Reporte en `openspec/changes/e2e-loteria-tema/reports/2026-10-11-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 4.1 Revisar la captura `preguntas-en.png` en `tests/e2e/salida/`: muestra una pregunta en inglés, no el selector

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 Sin cambios en `docs/`: `docs/pruebas.md` no lista los pasos de cada E2E
