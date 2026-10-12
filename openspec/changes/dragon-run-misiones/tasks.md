## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/dragon-run-misiones` desde `origin/main`

## 1. Servidor (TDD)

- [ ] 1.1 Pruebas que fallan en `server/progreso_test.ts`:
  - avance válido de `dragon-run`;
  - formas inválidas;
  - premio sin desbloquear;
  - fechas irreales;
  - listas iguales a `juegos/dragon-misiones.js`;
  - `aplicarCarrera` siempre produce un avance válido.
- [ ] 1.2 Prueba en `server/juegos_test.ts`: `dragon-run` con categoría `arcade`.
- [ ] 1.3 `server/progreso.ts`: agregar `dragon-run` a `JUEGOS_PROGRESO`, junto con `validarDragon`, `COLORES_DRAGON`,
  `ESTELAS_DRAGON` y `PREMIOS_DRAGON`.
- [ ] 1.4 `server/juegos.ts`: `CATALOGO["dragon-run"].categoria = "arcade"`.

## 2. Reglas de misiones

- [ ] 2.1 `juegos/dragon-misiones.js`:
  - bolsa diaria y `misionesDelDia` determinista;
  - logros por niveles y premios;
  - `aplicarCarrera`, con días seguidos y mensajes;
  - `normalizar`.

## 3. Juego y página

- [ ] 3.1 `juegos/dragon-run.html`:
  - pantalla de misiones antes de correr, con logros y premios;
  - conteo de obstáculos esquivados seguidos;
  - aviso «¡Misión cumplida!»;
  - colores y estelas;
  - mensajes `listo`, `guardar` e `inicio`;
  - toque en toda la pantalla;
  - `prefers-reduced-motion`;
  - ganchos `?prueba=1`.
- [ ] 3.2 `juegos.html`:
  - `cat: 'arcade'` y la caja `.arcade-caja`;
  - `canalProgreso` (`GET` y `PUT` encadenado);
  - misiones cumplidas en el resultado, con texto escapado;
  - `?arcadePrueba=1` pasa a `?prueba=1`.

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 `tests/e2e/e2e-dragon-run.js` cubre estos casos:
  - Dragon Run aparece en Arcade y no en Mente ágil;
  - la pantalla de misiones;
  - cumplir una misión diaria con ganchos;
  - el aviso y el resultado;
  - el avance en el servidor;
  - un color desbloqueado y elegido;
  - recargar y recuperar el avance;
  - capturas a 390 px.
- [ ] 4.2 `tests/e2e/e2e-juegos.js`: Arcade contiene `plataformas`, `karts` y `dragon-run`. Revisar los conteos
  de `e2e-fusion` y `e2e-clasicos`: el total no cambia (24).

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`, sin fallas.
- [ ] 5.2 E2E `dragon-run juegos fusion clasicos plataformas karts` con `--puerto-api 8957 --puerto-web 8935`
  sobre una copia de los datos. La carpeta original no se modifica.
- [ ] 5.3 Revisar yo mismo las capturas a 390 px y en escritorio.
- [ ] 5.4 Reporte en `openspec/changes/dragon-run-misiones/reports/2026-10-11-step-5-pruebas-y-verificacion.md`.

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 6.1 `curl` contra el servidor local:
  - `GET` y `PUT` de `/juegos/progreso/dragon-run` válidos;
  - forma inválida (400);
  - sin sesión (401);
  - correo no registrado (403);
  - `version_vieja` (409).

  Se usa la copia temporal de los datos de las E2E, así que no queda estado que restaurar.
- [ ] 6.2 Tras el merge (lo hace el usuario), en producción: Dragon Run aparece en Arcade y la pantalla de misiones
  carga.

## 7. Documentación técnica (OBLIGATORIO)

- [ ] 7.1 `docs/data-model.md`: formato del progreso de `dragon-run`.
- [ ] 7.2 `docs/frontend-standards.md`: Dragon Run en Arcade, mensajes, misiones y `?prueba=1`.
- [ ] 7.3 `docs/backend-standards.md`: `dragon-run` en `CATALOGO` (`arcade`) y en `JUEGOS_PROGRESO`.
- [ ] 7.4 Validar con `npx -y @fission-ai/openspec@1.4.1 validate dragon-run-misiones --strict`.
- [ ] 7.5 PR, CI, merge y `openspec archive` (los hace el usuario).
