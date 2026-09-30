## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-loteria-preguntas`

## 1. Servidor

- [x] 1.1 Pruebas que fallan:
  - `en-preguntas` en el catálogo con tope;
  - salas de `en-preguntas` y `loteria`;
  - `opciones.modo` válido e inválido;
  - `{ loteria: true }` guarda solo el primero.
- [x] 1.2 Implementación en `server/juegos.ts` y `server/salas.ts`

## 2. Contenido y frontend

- [x] 2.1 `juegos/datos/ingles.json` → `preguntas[]`, validado y con muestra revisada
- [x] 2.2 "Responde en inglés" en solitario y en partida
- [x] 2.3 Lotería en partida: orden y tablas con semilla, marcar, grito, bots, ganador, podio y voz
- [x] 2.4 Bots renombrados a BOT-VACHIRA y BOT-ISAGII; selector de modo al crear una partida de Lotería

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E:
  - "Responde en inglés" en solitario;
  - partida de Lotería con dos navegadores y bots: mismas cartas, tablas distintas y el mismo ganador en
    ambos.
  - Regresiones de juegos y partidas.
- [x] 3.2 Reporte `openspec/changes/juegos-loteria-preguntas/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Producción:
  - curl de sala de Lotería (modo) y del grito;
  - **restaurar** borrando la sala de prueba;
  - revisión de solo lectura de juegos publicados.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md` y `docs/data-model.md`
- [ ] 5.2 Commit, push, PR y merge a `main`
