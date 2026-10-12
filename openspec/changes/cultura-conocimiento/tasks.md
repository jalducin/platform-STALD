## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/cultura-conocimiento` desde `origin/main` (tras `git fetch`)

## 1. Contenido (TDD)

- [x] 1.1 `server/cultura_datos_test.ts`: forma, categorías, `correcta` en rango, opciones sin repetir, dato, mínimos
  por categoría y nivel, y `linea` con años enteros sin repetir por set (primero en rojo)
- [x] 1.2 `juegos/datos/cultura.json`: 384 → al menos 768 preguntas en 14 categorías y la clave `linea` (en verde)

## 2. Línea del tiempo: lógica pura y servidor (TDD)

- [x] 2.1 `server/linea_tiempo_test.ts`: funciones puras de `juegos/linea-tiempo.js` y sala de `cultura-linea`
  (crear, tema inválido, mesa de 30, respuesta con aciertos, línea fuera de rango, puntos recortados, partida guardada)
- [x] 2.2 `juegos/linea-tiempo.js` (`LineaTiempo`): temas, líneas, aciertos, puntos, bots y podio
- [x] 2.3 `server/salas.ts`: `cultura-linea` en `JUEGOS_PARTIDA`, `MESAS`, tema y validación de la respuesta;
  `server/juegos.ts`: `CATALOGO` (`cultura-linea` y categoría `cultura` en `es-*`); `juegos/mesas.js` igual a `MESAS`

## 3. Página (`juegos.html`)

- [x] 3.1 Sección única «🧠 Cultura y Conocimiento» con sus 4 juegos
- [x] 3.2 Maratón: dato al acertar (`datoAlAcertar` del quiz)
- [x] 3.3 Línea del tiempo individual: tema, tocar o arrastrar, revelación con años y dato, vidas, racha y tiempo
- [x] 3.4 Línea del tiempo en sala: selector de tema al crear, líneas por semilla, revelación, bots, podio y revancha
- [x] 3.5 Estilos a 390 px y `prefers-reduced-motion`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `e2e-juegos`, `e2e-fusion` y `e2e-clasicos`: contar juegos y secciones sin un número fijo de juegos
- [x] 4.2 `server/mesas_test.ts` sigue comparando las dos tablas (con `cultura-linea`)
- [x] 4.3 E2E nueva `tests/e2e/e2e-cultura-conocimiento.js`, registrada en `tests/e2e/correr.sh` (fase `base`): sección
  única con 4 juegos, Línea del tiempo individual y en sala con bots, capturas a 390 px

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [x] 5.2 E2E `cultura-conocimiento juegos fusion clasicos revancha ranking-juegos partidas` con una copia de datos
  (la carpeta original no se modifica; el orquestador trabaja sobre una copia)
- [x] 5.3 Reporte en `openspec/changes/cultura-conocimiento/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 6.1 UI: revisar las capturas a 390 px (sección, Línea del tiempo individual y en sala, podio)
- [x] 6.2 API: con el servidor local, crear sala de `cultura-linea` con tema válido e inválido, y enviar una respuesta
  válida y una fuera de rango (casos de error incluidos)

## 7. Documentación técnica (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md`: formato nuevo de `cultura.json` (categorías y `linea`)
- [x] 7.2 `docs/backend-standards.md` (juegos de sala, validación de `cultura-linea` y mesa) y
  `docs/frontend-standards.md` (sección única, `juegos/linea-tiempo.js`, interacción)
- [x] 7.3 Validar con `npx -y @fission-ai/openspec@1.4.1 validate cultura-conocimiento --strict`
- [ ] 7.4 Tras el merge (usuario): verificar en producción que la sección y la Línea del tiempo cargan; luego
  `openspec archive`
