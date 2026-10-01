## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/puntos-por-tipo`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/juegos_test.ts`):
  - jugar de nuevo suma (individual);
  - partida de sala suma a partidas (con validaciones 400/403/409 y tope 10,000);
  - ranking por tipo;
  - `/yo` y resumen del admin con los dos totales;
  - documentos viejos sin `modo` se leen como individuales.
- [x] 1.2 Implementación en `server/juegos.ts`

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 Ajustar las pruebas que esperaban "mejor por juego" en el total (récord, ranking, yo, invitados)

## 3. Frontend

- [x] 3.1 `juegos.html`:
  - chip con dos totales;
  - mensajes al terminar;
  - pestañas del ranking;
  - las partidas se guardan con `sala`.
- [x] 3.2 `ingles.html`: tarjeta de juegos del admin y línea por alumno con los dos totales

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`
- [x] 4.2 E2E `e2e-puntos-tipo`:
  - dos juegos individuales suman ambos;
  - una partida en sala suma a partidas;
  - ranking con pestañas;
  - card de admin.
  - Regresiones de juegos y partidas.
- [x] 4.3 Reporte `openspec/changes/puntos-por-tipo/reports/2026-10-01-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual y migración — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Migración de la semana 2026-09-28 (marcar partidas de sala) tras el deploy, con respaldo en git
- [ ] 5.2 Producción:
  - totales de Sofy y del profe = suma de sus partidas;
  - ranking por tipo;
  - guardar con una sala inexistente → 400 (sin escribir).

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` y `docs/data-model.md` (totales por tipo, `modo` y `sala` en la partida,
  ranking por tipo)
