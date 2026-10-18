## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/espectador-partidas` desde `origin/main`

## 1. Servidor (TDD, cambios marcados `// espectador`)

- [x] 1.1 Prueba que falla: `server/espectador_test.ts` (espectar sala llena y empezada; 403 al jugar; no cuenta para
  cupo, mesa, empezar, podio, revancha ni ranking; cupo de 30; `ya_en_sala`; `salir`; sin registro 403; «viendo»;
  topic solo en juegos en vivo; tabla de juegos con secretos: naval, ppt, Dibuja, canal/secreto)
- [x] 1.2 `server/salas.ts`: `POST /espectar`, `vistaPublica` (canal y espectador/admin), `ESPECTADOR_EN_VIVO`,
  `MAX_ESPECTADORES`, conteo «viendo» con caché

## 2. En vivo en solo escucha (TDD)

- [x] 2.1 Prueba que falla en `server/en_vivo_test.ts`: un espectador que inyecta eventos (con su id) es descartado por
  quienes juegan; `escucha: true` no envía nada (ni latidos); el puente en solo escucha no reenvía
- [x] 2.2 `juegos/en-vivo.js`: opción `escucha`

## 3. Página (cambios marcados `// espectador`)

- [x] 3.1 `salas.js`/`arranque.js`/`nucleo.js`/`menu.js`: «👀 Ver como espectador» en llena/empezada, «👀 Solo ver»,
  enlace `&ver=1`, `entrarSala` en modo espectador, guardas de `post` y de clics, barra (distintivo, N viendo, 🔊/🔇),
  podio y revancha
- [x] 3.2 `arcade.js`: Karts (carrera y copa), Fútbol y Arena con `espectador: true`; puente sin `vivo-tx`
- [x] 3.3 `naipes.js`: Conquián muestra a las 2 personas (dorsos y bajadas) y Brisca el equipo A/B a quien especta
- [x] 3.4 Iframes: `karts.html` (cámara del líder, ◀ ▶ 👑, sin entrada/ítems/meta), `futbol.html` (rol espectador),
  `futbolito-arena.html` (invitado sin robot y sin entrada)
- [x] 3.5 Brigada Xalli (llegó a `main` durante el cambio): `brigada-red.js` (invitado espectador con la cámara
  compartida), `brigada.html` y `brigada-sala.js`; gancho `ESPECTAR_EN_VIVO` / `ESPECTADOR_EN_VIVO` documentado

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Nueva E2E `tests/e2e/e2e-espectador.js` (sala llena de cartas con mesa pública sin manos, Karts en vivo con
  cámara y eventos sin efecto, Fútbol en línea, Brigada, podio y revancha; capturas a 390×844 y 844×390) y agregarla a
  `correr.sh`
- [x] 4.2 Revisar que las pruebas de salas, realtime, naval y clásicos sigan pasando (vista del admin)

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/`, `deno lint` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 5.2 E2E `espectador partidas juegos karts-vivo futbol-en-linea futbolito-arena poker` (+ brigada, revancha,
  cartas-espanolas, karts y plataformas) con copia temporal de datos; nunca se escribe en tablas `stald_`
- [x] 5.3 Reporte `openspec/changes/espectador-partidas/reports/2026-10-17-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 `curl` contra el servidor local: espectar (válido, sin registro, ya en sala, sala inexistente), GET de
  espectador sin secretos, jugada 403
- [x] 6.2 Revisar capturas a 390×844 y 844×390 (mesa de cartas, Karts, Fútbol, Brigada, podio)
- [ ] 6.3 Tras el merge: verificar en producción la ruta `/juegos/sala/<código>/espectar` y que `juegos.html` cargue
  los `?v=` nuevos

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/backend-standards.md` (ruta `espectar`, vista pública, matriz de acceso), `docs/frontend-standards.md`
  (modo espectador, solo escucha, gancho para juegos en vivo nuevos) y `docs/data-model.md`
  (`juegos/salas/<código>/espectadores/<id>.json`)
- [x] 7.2 `npx -y @fission-ai/openspec@1.4.1 validate espectador-partidas --strict`

## 8. Publicación

- [ ] 8.1 Subir `?v=`, mezclar `origin/main` (conservar ambos lados con sprints 38, 39 y karts-curvas-complejas), PR en
  español, esperar todos los checks, merge, borrar la rama remota y verificar producción (sin archivar)
