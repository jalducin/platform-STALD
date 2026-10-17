## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/karts-objetos-en-sala` desde `origin/main`

## 1. Lógica de ítems en red (TDD)

- [ ] 1.1 Prueba que falla: `server/karts_objetos_test.ts` (tablas por lugar y modo, codificar/decodificar el evento,
  simulación determinista de cáscara, bola y cohete desde el evento, choque del lado de la víctima, rayo por avance,
  repetidos y viejos, 1 ítem por segundo, gracia y peor caso dentro del límite de cada pista)
- [ ] 1.2 `juegos/karts-objetos.js`: tablas, `codificar`/`decodificar`, `registro`, `crear`/`avanzar`, `toca`,
  `historial` y `rayoAfecta`, `factorPeorCaso`

## 2. Juego (karts.html, cambios marcados `// karts-objetos-en-sala`)

- [ ] 2.1 Tabla de la sala en vivo; usar un ítem en sala manda `item` (dos veces) y crea el objeto con el mismo evento
- [ ] 2.2 Recibir `item` e `item-golpe`; choques solo contra tu kart, gracia, aviso de golpe; rayo por avance;
  estrella que tumba al chocar; copa carrera por carrera
- [ ] 2.3 Ganchos de prueba (`objetos`, `rechazados`, `golpes`, `usarItem`, `ponerEn`)

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 `tests/e2e/e2e-karts-vivo.js`: cohete de A a B, cáscara, rayo, estrella, latencia y pérdida sin duplicados,
  respaldo con tabla reducida, fps de 8 karts con ítems y capturas a 390×844

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/`, `deno lint` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 4.2 E2E `karts karts-vivo` con la copia de datos de prueba (`correr.sh` trabaja sobre una copia temporal y la
  borra: estado restaurado; nunca se escribe en tablas `stald_`); fps con la máquina lo más quieta posible
- [ ] 4.3 Reporte `openspec/changes/karts-objetos-en-sala/reports/2026-10-17-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar capturas a 390×844: un cohete pegándole a un rival, una cáscara en la pista y el rayo en sala
- [ ] 5.2 Tras el merge: abrir `juegos/karts.html` publicado y confirmar que carga `karts-objetos.js`

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md` (ítems en sala, `karts-objetos.js`, eventos `item` e `item-golpe`)
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-objetos-en-sala --strict`

## 7. Publicación

- [ ] 7.1 Subir `?v=`, mezclar `origin/main` (conservar ambos lados con el sprint 34), PR en español, esperar todos los
  checks, merge, borrar la rama remota y verificar producción (sin archivar)
