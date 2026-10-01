# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-01
- Cambio: pronunciacion
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- `python herramientas/profe-mes-1/gen_profe_mes1.py .` y `validar_semana.ts <datos> <lunes> --profe` (5 semanas)
- Servidor local con copia desechable del repo de datos; estáticos en `localhost:8765`
- `node e2e-pronunciacion.js` (nuevo; reconocimiento de voz simulado y `speechSynthesis` espiado), regresiones
  `e2e-ruta-profe` y `e2e-alta-alumnos`

## Resultados de pruebas
- Dirigidas (TDD, `server/pronunciacion_test.ts`): 4 pruebas, primero en rojo (sin `similitudPronunciacion`) y
  luego en verde.
- Suite del servidor: 104 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- Contenido: 5 actividades de pronunciación (viernes 2, 9, 16, 23 y 30 de oct), 12 ejercicios cada una. La ruta
  queda con 23 elementos y 385 ejercicios. Validador: 0 errores (2 avisos esperados en la semana 0).
- E2E `e2e-pronunciacion`: 11/11 PASS
  - la semana 0 muestra la pronunciación del viernes y el plan lista 23 tareas;
  - 🔊 y 🐢 leen el audio en en-US a velocidad 1 y 0.7;
  - coincidencia en vivo: 100 % ✔ con la frase y 0 % «inténtalo otra vez» con otra;
  - 12/12 respondidas; calificación 11/12 (92 %) con la revisión mostrando lo que se escuchó; el servidor guarda
    el intento; el 2.º intento solo pide la frase fallada;
  - sin reconocimiento: botones de autoevaluación con aviso de Chrome/Edge, y marcar «me salió bien» cuenta.
- Regresiones: `e2e-ruta-profe` 15/15 y `e2e-alta-alumnos` 11/11.

## Verificación de estado
- Antes: copia desechable del repo de datos (`data-pr`), recreada antes de cada corrida.
- Después: los resultados de prueba quedaron solo en la copia; el repo de datos real no se tocó.
- Estado restaurado: Sí — se borró la copia desechable.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno

## Step 6 — Verificación manual en producción (EL AGENTE EJECUTA)
- El contenido se subió después de que terminó el despliegue de Deno (`build` y `deploy` en verde), para
  que el servidor viejo nunca recibiera ejercicios `pronunciar`.
- Script Python (solo GET) contra `https://stald.jalducin.deno.net`: 4/4 PASS.
  - La ruta lista `profe-pron-2026-10-02` disponible y sin intentos; el plan suma 23 tareas.
  - El elemento trae 12 ejercicios: 5 `pronunciar` con `frase` y 4 con `audio`.
  - No expone `correcta`, `aceptadas` ni `explicacion`.
- Estado: sin escrituras. El intento del profe sigue sin usar.
