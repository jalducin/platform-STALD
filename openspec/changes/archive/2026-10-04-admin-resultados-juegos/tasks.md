## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/admin-resultados-juegos`

## 1. Servidor

- [x] 1.1 Pruebas que fallan:
  - índice semanal al crear;
  - `final` y `podio` (solo host) en `respuesta`;
  - `GET /juegos/admin/resumen` con jugadores y salas, solo admin y sin correos.
- [x] 1.2 Implementación en `server/salas.ts` y `server/juegos.ts`

## 2. Frontend

- [x] 2.1 `juegos.html`: enviar `final` (todos) y `podio` (host) al terminar la partida
- [x] 2.2 `ingles.html` (admin): tarjeta "🎮 Juegos de la semana" y línea por alumno o alumna
- [x] 2.3 Enlace `juegos.html?sala=` (entrar o registrarse y unirse solo), botón Compartir y QR en la sala de espera

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E:
  - partida con dos navegadores;
  - después, la vista de admin de Inglés muestra la partida con el podio y los puntos.
  - Regresiones de Inglés y juegos.
- [x] 3.2 Reporte `openspec/changes/admin-resultados-juegos/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Producción:
  - curl del resumen (admin 200 y alumna 403);
  - revisión de solo lectura de la vista de admin publicada.
  - **Restaurar** cualquier dato de prueba.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md`, `docs/data-model.md`, README del repo de datos y `docs/frontend-standards.md`
- [x] 5.2 Commit, push, PR y merge a `main` (PR #33)
