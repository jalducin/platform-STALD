## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/salas-realtime`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/realtime_test.ts`):
  - canal al crear;
  - `rt` solo con configuración y solo para jugadores;
  - publicación tras unirse, empezar y responder;
  - una falla de la publicación no rompe la respuesta;
  - contador `v` por jugador que sube en cada guardado.
- [x] 1.2 `server/realtime.ts`, `server/salas.ts`, `server/juegos.ts` y `server/main.ts` (configuración desde env)

## 2. Frontend

- [x] 2.1 `juegos.html`: `conectarRealtime` (supabase-js diferido), mezclar el estado sin retroceder (`v`), ponerse al día al suscribirse, respaldo de 30 s, volver al
  sondeo si falla y desuscribir al salir

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite completa en verde; E2E de partidas sin configuración (sondeo, igual que hoy)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`
- [x] 4.2 E2E `e2e-realtime` con el proyecto real de Supabase:
  - dos navegadores;
  - cambios recibidos por Realtime;
  - consultas cada 30 s;
  - corte del canal → sondeo.
- [x] 4.3 Regresiones: partidas, Basta por rondas, Lotería en sala y ¡Una! en sala
- [x] 4.4 Reporte `openspec/changes/salas-realtime/reports/2026-10-03-step-4-pruebas-y-verificacion.md`

## 5. Configuración y verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Entregar al profe los valores de `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` y cómo obtener
  `SUPABASE_SERVICE_KEY`. No van en el repo.
- [ ] 5.2 Con las variables en Deno:
  - sala de prueba en producción con dos navegadores por Realtime;
  - borrar la sala de prueba.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md`, `docs/frontend-standards.md` y `docs/data-model.md` (`canal`, `rt`,
  variables); README (Supabase compartido con el portafolio)
