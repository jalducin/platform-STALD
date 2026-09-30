## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/una-en-partida`

## 1. Servidor

- [x] 1.1 Pruebas que fallan: sala de `una`; `jugada` válida con `t`; `n` tomado por otro → 409; jugada inválida → 400
- [x] 1.2 Implementación en `server/salas.ts`

## 2. Frontend (`juegos.html`)

- [x] 2.1 Motor `estadoUna` (reproducción determinista, bots, tiempo por turno, "¡Una!" y efectos)
- [x] 2.2 Mesa en sala: rivales, carta de arriba, mano, robar, pasar, color, 📣, voz e idioma
- [x] 2.3 Final: podio, `final` y ranking
- [x] 2.4 Portal: avatar en el saludo y "🎨 Cambiar avatar" (`juegos.html?avatar=1`)

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E con dos navegadores y bots:
  - el mismo estado en ambos durante la partida;
  - el mismo ganador y podio.
  - Regresiones de partidas.
- [x] 3.2 Reporte `openspec/changes/una-en-partida/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Producción:
  - curl de sala de `una` y de una jugada;
  - **restaurar** la sala de prueba.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md` y `docs/data-model.md`
- [ ] 5.2 Commit, push, PR y merge a `main`
