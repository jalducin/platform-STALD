## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-en-vivo` desde `origin/main` (fase A, Karts); la fase B usa
  `feature/juegos-en-vivo-futbol` desde `origin/main` tras el merge de la fase A
- [x] 0.2 Paso 0: broadcast de navegador a navegador contra el Supabase real con la llave publicable (sin cambios en
  Supabase): 20/20 mensajes, RTT mediana 163 ms; topic `sala-prueba-<azar>` cerrado al terminar

## 1. Pruebas que fallan primero (TDD) — fase A

- [ ] 1.1 `server/en_vivo_test.ts`: sobre y secuencias, fuera de orden, repetidos, ritmo con coalescencia, latencia
  con pérdida, presencia y desconexión, reconexión con espera creciente, respaldo a 5 s, miembros, interpolación,
  extrapolación acotada y ángulos
- [ ] 1.2 `server/mesas_test.ts`: mesa de Karts de 8 con 3 asientos (1+2, 2+1, 3+0, 8+0) y la 9.ª persona `sala_llena`
- [ ] 1.3 `tests/e2e/e2e-karts-vivo.js` (8 contextos, canal simulado): ver el kart del otro moverse, minimapa,
  clasificación en vivo, desconexión que desvanece, respaldo sin canal; capturas 390×844 y 844×390; fps con CPU ×4
- [ ] 1.4 Correr las pruebas nuevas y registrar que fallan

## 2. Implementación — fase A (Karts)

- [ ] 2.1 `juegos/en-vivo.js`: `crear`, `interpolador`, `redSimulada`, `transporteSupabase`, `transporteMarco`, `puente`
- [ ] 2.2 `juegos/mesas.js` y `server/salas.ts`: `karts: { max: 8, asientos: 3, min: 1 }`
- [ ] 2.3 `juegos/app/salas.js`: el canal de la sala también escucha `vivo` y lo expone como transporte; respaldo
  simulado solo con `vivoSimulado=1` y `window.__vivoSimulado`
- [ ] 2.4 `juegos/app/arcade.js`: en Karts de sala, `inicio` con `yo`, `humanos` y `vivo`, y puente filtrado por miembros
- [ ] 2.5 `juegos/karts.html`: karts remotos (interpolados, sprite del personaje, nombre, minimapa), empuje local,
  clasificación en vivo, desvanecer al desconectarse, aviso de respaldo; ganchos de prueba
- [ ] 2.6 `juegos.html`: cargar `en-vivo.js` y subir `?v=`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 `e2e-karts.js` (sala con 2 fantasmas sigue igual: 1 persona + 2 bots), `e2e-partidas.js`, `e2e-categorias.js`
  y `server/salas_test.ts` siguen válidas

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/` y `npx -y deno lint`
- [ ] 4.2 E2E: `bash tests/e2e/correr.sh --datos <copia> --puerto-api 9299 --puerto-web 9309 karts-vivo karts futbol
  juegos categorias partidas emocion mando` y al final la suite completa (la copia temporal de datos se descarta:
  estado restaurado; nunca se escribe en tablas `stald_`)
- [ ] 4.3 `cd tests/calidad && npm run calidad` sin avisos nuevos
- [ ] 4.4 Reporte `openspec/changes/juegos-en-vivo/reports/2026-10-12-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Supabase real: servidor local con las variables en el entorno (nunca en archivos) y `STALD_TABLAS=stald_test_`;
  sala de Karts con 2 contextos, ver al otro y medir la latencia; 8 clientes de carga 30 s a 10 Hz en un topic de
  prueba (mensajes/s, pérdidas, errores); borrar salas (copia temporal) y cerrar canales
- [ ] 5.2 fps con 8 karts en vivo y CPU ×4; revisar las capturas a 390×844 y 844×390
- [ ] 5.3 Casos de error: mensaje de un id ajeno, canal que no conecta (respaldo), compañero que se va

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md` (módulo en vivo y Karts en vivo), `docs/backend-standards.md` (mesa de Karts)
  y `docs/pruebas.md` (relevo simulado y prueba nueva)
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate juegos-en-vivo --strict`

## 7. Publicación fase A

- [ ] 7.1 Merge de `origin/main`, `?v=` arriba de main, PR en español, `gh pr checks --watch`, `gh pr merge --merge`,
  borrar la rama remota y verificar producción

## 8. Fase B — Fútbol Estelar en línea 1 vs 1

- [ ] 8.1 Rama `feature/juegos-en-vivo-futbol` desde `origin/main`
- [ ] 8.2 Pruebas que fallan: `server/futbol_sala_test.ts` (validación del resultado, táctica, mesa) y
  `tests/e2e/e2e-futbol-vivo.js` (gol del invitado visto por el anfitrión y al revés, resultado validado, desconexión)
- [ ] 8.3 Servidor: `futbol` en `JUEGOS_PARTIDA`, mesa de 2 sin bots, `tactica` en `/unirse`, `futbol` en `/respuesta`
- [ ] 8.4 Página: sala de espera con formación, puente en vivo; `futbol.html` modo en línea (anfitrión e invitado)
- [ ] 8.5 Pruebas (OBLIGATORIO): deno, lint, E2E dirigidas y suite completa, calidad; reporte de la fase B
- [ ] 8.6 Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA: 2 contextos contra Supabase real, capturas
- [ ] 8.7 Documentación (OBLIGATORIO) y publicación como en 7.1

## 9. Cierre

- [ ] 9.1 Tras la prueba del profe con varios celulares: `openspec archive juegos-en-vivo` (no antes)
