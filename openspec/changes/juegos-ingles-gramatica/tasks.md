## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-ingles-gramatica` desde `origin/main`

## 1. Pruebas primero

- [x] 1.1 Escribir `server/ingles_datos_test.ts` (forma de `ingles.json`: temas válidos, `correcta` en rango,
  opciones sin repetir, `es`, `regla`, mínimos por tema y `tiempos`) y confirmarla en rojo
- [x] 1.2 Escribir pruebas de salas: `en-tiempos` se crea; `opciones.tema` se guarda en `en-frases`, vale `todo` por
  omisión y `tema_invalido` con otro valor; `en-tiempos` está en el catálogo con tope 2,000. Confirmarlas en rojo

## 2. Contenido

- [x] 2.1 Ampliar `verbos` (≥ 40 por tema de tiempo, con `regla`), reclasificar `negativo` y `preguntas`, y agregar
  `demostrativos` y `adjetivos`
- [x] 2.2 Poner `tema` a todas las `oraciones` y agregar oraciones de cada tiempo
- [x] 2.3 Agregar `preguntas` de cada tiempo con `regla`
- [x] 2.4 Agregar la clave `tiempos` (≥ 40 oraciones regulares, irregulares y de to be)

## 3. Implementación

- [x] 3.1 Servidor: `en-tiempos` en `JUEGOS_PARTIDA` y en `CATALOGO`; validación de `opciones.tema`
- [x] 3.2 `juegos/ingles-gramatica.js`: temas, filtros, reglas, Máquina del tiempo, selector y resumen de fallos
- [x] 3.3 `juegos.html`: script, catálogo, `JUEGOS_PARTIDA`, `preguntasPartida`, selector de tema al crear la sala,
  gancho `alResponder`, regla en Ordena, resumen en el final de la partida y `REANUDAR`
- [x] 3.4 Integración con la revancha (`revancha-partidas`, llegó a `main` durante el cambio): el tema vive en
  `sala.opciones`, así que la revancha lo copia; la Máquina del tiempo usa `pintarFinalSala` (botón «🔁 Otra con
  los mismos» junto al resumen de fallos). Merge de `origin/main` con conflictos resueltos

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Ajustar los conteos del menú (21 → 22 juegos) y los pasos que ahora pasan por el selector de tema en
  `e2e-juegos`, `e2e-fusion` y `e2e-clasicos`
- [x] 4.2 E2E nueva `tests/e2e/e2e-juegos-ingles.js` (registrada en `correr.sh`, fase `base`): el selector filtra;
  Máquina del tiempo en solitario y en sala con bots hasta el podio y la revancha; explicación del error; capturas
  a 390 px
- [x] 4.3 Prueba de servidor: la revancha copia `opciones.tema` de `en-frases` y funciona con `en-tiempos`

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 Correr `npx -y deno test -A server/` y `npx -y deno lint server/`
- [x] 5.2 Correr las E2E `juegos-ingles revancha juegos partidas juegos-recarga clasicos puntos-tipo ajustes-salas
  ritmo peticiones fusion` con una copia de datos; la carpeta de datos original no se modifica
- [x] 5.3 Escribir el reporte `openspec/changes/juegos-ingles-gramatica/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Revisar las capturas a 390 px (selector, pregunta, error con regla, resumen, podio de la sala)
- [x] 6.2 Probar contra el servidor local con `curl`: crear sala de `en-frases` con tema válido, inválido y sin tema;
  crear sala de `en-tiempos` (los datos de prueba viven en una copia temporal)

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md`: formato nuevo de `ingles.json`
- [x] 7.2 `docs/frontend-standards.md` (selector, Máquina del tiempo, archivo `juegos/ingles-gramatica.js`) y
  `docs/backend-standards.md` (`en-tiempos` y `opciones.tema`)

## 8. Cierre

- [x] 8.1 Validar con `npx -y @fission-ai/openspec@1.4.1 validate juegos-ingles-gramatica --strict`
- [ ] 8.2 Tras el merge (lo hace el usuario): verificar en producción y `openspec archive`
