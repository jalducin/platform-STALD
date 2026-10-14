## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear `feature/karts-copa-en-sala` sobre `feature/karts-pistas-grandes` (depende de sus límites por pista;
  se rebasa sobre `origin/main` cuando ese PR se fusione)

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/karts_copa_test.ts`: crear la sala (fiesta, mesoamericana, mixta, inválidas), orden de las 4
  carreras, puntos y tabla, tope del ranking en `/partida`, tiempo vencido (NT), abandono y regreso, validaciones del
  reporte y revancha

## 2. Reglas compartidas y servidor

- [x] 2.1 `juegos/karts-copa.js`: pistas de la copa, calendario, resultados, tabla y carrera abierta
- [x] 2.2 `server/karts_copa.ts` + `server/salas.ts` (opciones, `{ copa }`, vista) + `server/juegos.ts` (tope)

## 3. Página e iframe

- [x] 3.1 `juegos/app/salas.js`, `arranque.js`, `arcade.js`: formato de la sala, `pintarCopaSala`, abandono, podio de la
  copa; `juegos.html` carga `juegos/karts-copa.js` y sube `?v=`
- [x] 3.2 `juegos/karts.html`: `copa` en `inicio`, tabla `#ov-copa`, canal en vivo entre carreras, `d[9]` y `meta` con
  la carrera

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `tests/e2e/e2e-karts-vivo.js`: sala de Copa Fiesta con 2 personas en vivo + 1 bot: 4 carreras, tabla entre
  carreras, arranque solo, podio y revancha (capturas); `tests/e2e/correr.sh`: tiempo de `karts-vivo`

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 5.2 E2E: `karts karts-vivo partidas juegos categorias emocion` y la suite completa (datos copiados; nada en
  tablas `stald_`)
- [ ] 5.3 Reporte en `openspec/changes/karts-copa-en-sala/reports/2026-10-14-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 6.1 Capturas de la tabla entre carreras (390×844 y 844×390) y del podio de la copa; revisión visual
- [ ] 6.2 curl local: crear sala de copa, reporte fuera de turno, reporte válido y vista de la copa

## 7. Documentación técnica (OBLIGATORIO)

- [ ] 7.1 `docs/backend-standards.md` (`{ copa }` y opciones), `docs/data-model.md` (`copa` del asiento),
  `docs/frontend-standards.md` (copa en sala)

## 8. Publicación

- [ ] 8.1 PR en español, `gh pr checks --watch` hasta que terminen todos, merge, borrar la rama remota y verificar en
  producción. Sin `openspec archive`.
