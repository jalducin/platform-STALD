## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `fix/personaje-en-salas` desde `origin/main` (convención pedida por el profe para
  arreglos; el cambio OpenSpec se llama `personaje-en-salas`)

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/personaje_sala_test.ts`: `PERSONAJES_IDS` igual a `Personajes.LISTA`; guardar el personaje del
  asiento (válido), id inválido, sala de otro juego, sala ya empezada, persona que no está en la sala (entra o
  `sala_llena`) y que se vea en `GET /juegos/sala/<código>`

## 2. Servidor

- [x] 2.1 `server/personajes.ts` (importa `juegos/personajes.js`) y `server/salas.ts`: `{ personaje }` en `/unirse`
  (marcado `// personaje-en-salas`)

## 3. Página de Juegos

- [x] 3.1 `juegos.html` carga `juegos/personajes.js`; `juegos/app/arcade.js`: tarjeta de la sala de espera,
  sincronía automática del asiento y `personaje` / `humanos[].personaje` en `inicio`; `juegos/app/salas.js`:
  personaje junto al nombre y clave de la vista; `juegos/app/arranque.js`: clic `data-p="personaje"`;
  `juegos/app/juegos.css`: cuadrícula 4×2

## 4. Juegos

- [x] 4.1 `juegos/karts.html`: `empezarSala` con el personaje recibido, karts remotos con el de su asiento y
  fantasmas con personajes libres
- [x] 4.2 `juegos/plataformas.html`: `empezarSala` con el personaje recibido

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 5.1 `tests/e2e/e2e-karts-vivo.js`: sala de 3 contextos que eligen personajes distintos en la sala de espera,
  ven el de los demás y corren con ellos (propio, rivales y fantasmas); `tests/e2e/e2e-plataformas.js`: sala de Axo
  con el personaje elegido y preferencia recordada entre el modo individual y la sala

## 6. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 6.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 6.2 E2E: `karts karts-vivo plataformas partidas juegos categorias futbol-en-linea` (datos copiados; nada en
  tablas `stald_`)
- [x] 6.3 Reporte en `openspec/changes/personaje-en-salas/reports/2026-10-13-step-6-pruebas-y-verificacion.md`

## 7. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 7.1 Capturas de la sala de espera a 390×844 y 844×390 y de la carrera con 3 personajes distintos; revisión
  visual
- [x] 7.2 curl local: personaje válido, inválido, sala de otro juego y sala ya empezada

## 8. Documentación técnica (OBLIGATORIO)

- [x] 8.1 `docs/backend-standards.md` / `docs/data-model.md`: `personaje` del asiento y `{ personaje }` en `/unirse`;
  `?v=` de `juegos.html` por encima de `main`

## 9. Publicación

- [ ] 9.1 PR en español, `gh pr checks --watch` hasta que terminen todos, merge, borrar la rama remota y verificar en
  producción. Sin `openspec archive` (lo decide el profe).
