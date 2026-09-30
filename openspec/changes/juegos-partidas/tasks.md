## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-partidas`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/salas_test.ts`, almacén en memoria):
  - crear (código, juego inválido, no registrado);
  - unirse (404, 409 tras empezar, 30 máximo);
  - empezar solo el host;
  - respuesta: validación, primera cuenta, fuera de sala 403;
  - Basta con palabras y "¡Basta!";
  - estado con `ahora`, sin correos;
  - vencida 410.
- [x] 1.2 `server/salas.ts` y rutas en `main.ts`

## 2. Frontend (`juegos.html`)

- [x] 2.1 RNG con semilla y `preguntasPartida` para los 8 juegos de preguntas; helpers con `rnd`
- [x] 2.2 Pestaña Partidas: crear (juego, opciones, bots), unirse con código y sala de espera en vivo
- [x] 2.3 Partida de preguntas sincronizada: pregunta, revelación con marcador, podio y guardado en el ranking
- [x] 2.4 Basta en partida: letra común, "¡Basta!" que cierra para todos, puntuación única o repetida
- [x] 2.5 Bots deterministas en preguntas y Basta
- [x] 2.6 Enlace "🎮 Juegos" en el encabezado de `ingles.html` y `secundaria.html` (conserva `?api=`)

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E con dos navegadores (host y otro jugador) y bots:
  - partida de preguntas: mismas preguntas en ambos, marcador y podio iguales, puntos guardados;
  - Basta: "¡Basta!" de uno cierra al otro; puntuación de repetidas.
  - Regresiones de juegos.
- [x] 3.2 Reporte `openspec/changes/juegos-partidas/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Producción tras el merge:
  - curl: crear, unirse, empezar, respuesta, estado y errores;
  - **restaurar**: borrar la sala y las partidas de prueba del repo de datos.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md` (rutas de sala), `docs/data-model.md` (`juegos/salas/`), README del repo de datos
- [ ] 5.2 Commit, push, PR y merge a `main`
