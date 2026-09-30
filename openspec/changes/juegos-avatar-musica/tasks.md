## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-avatar-musica`

## 1. Servidor

- [x] 1.1 Pruebas que fallan:
  - avatar por defecto válido y estable;
  - `POST /juegos/avatar` válido o inválido (400);
  - `yo`, ranking, sala y resumen del admin con avatar;
  - al cambiar el avatar se actualiza la semana.
- [x] 1.2 Implementación en `server/juegos.ts` y `server/salas.ts`

## 2. Frontend

- [x] 2.1 `juegos.html`:
  - chip con avatar y selector "🎨 Tu avatar";
  - avatares en ranking, sala, marcador y podio;
  - bots con avatar fijo.
- [x] 2.2 Música: secuenciador WebAudio con 3 estilos, volumen, bajar durante la voz, arranque tras un gesto y preferencia recordada
- [x] 2.3 `ingles.html` (admin): avatar en "🎮 Juegos de la semana"

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E:
  - cambiar avatar y verlo en ranking y sala en otro navegador;
  - música: los estilos generan audio y "Apagada" lo detiene;
  - la preferencia se recuerda.
  - Regresiones.
- [x] 3.2 Reporte `openspec/changes/juegos-avatar-musica/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Producción:
  - curl de avatar (válido e inválido) como admin;
  - **restaurar** el perfil de prueba;
  - revisión de solo lectura publicada.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/frontend-standards.md` §2, `docs/backend-standards.md`, `docs/data-model.md` y README del repo de datos
- [x] 5.2 Commit, push, PR y merge a `main` (PR #37)
