## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/revancha-partidas` desde `origin/main` (tras `git fetch`)

## 1. Pruebas primero (TDD)

- [x] 1.1 `server/salas_test.ts`: revancha de una partida terminada (mismo juego, opciones y bots; anfitriona
  quien la pidió; `siguiente` en la vieja; la vieja la ve en el GET)
- [x] 1.2 `server/salas_test.ts`: dos peticiones a la vez caen en la misma sala nueva y solo se crea una (índice
  semanal con una sola entrada nueva)
- [x] 1.3 `server/salas_test.ts`: 403 a quien no jugó, 409 `no_termino` sin podio, 409 `ya_empezo` si la revancha
  ya empezó, 404 sala inexistente, 410 sala vencida; ajedrez respeta reloj y cupo
- [x] 1.4 Correr las unitarias nuevas antes de implementar y confirmar que fallan
- [x] 1.5 `tests/e2e/e2e-revancha.js` (registrada en `ORDEN` de `correr.sh`, fase `base`): cuatro personas y bots
  terminan una Maratón de cultura; dos tocan «Otra con los mismos» casi a la vez y caen en la misma sala nueva; la
  tercera se une desde el aviso; la cuarta recarga en el podio y se une desde el inicio; captura a 390 px

## 2. Servidor (`server/salas.ts`)

- [x] 2.1 Campos `siguiente` y `siguienteHost` en `Sala`; `codigoLibre()` compartido con «crear»
- [x] 2.2 Ruta `POST /juegos/sala/<código>/revancha`: validar, reservar con escritura condicional, asegurar la sala
  nueva con `put(…, null)`, indexar, unir y publicar las dos salas en Realtime

## 3. Página (`juegos.html`, `comun/auth.js`)

- [x] 3.1 Podio: `#p-revancha`, `pintarRevancha()` y botón `data-p="revancha"`; errores con texto
- [x] 3.2 Sondeo del podio: 5 s (30 s con Realtime) hasta ver `siguiente` o 15 min
- [x] 3.3 Marca `juegos_revancha` al terminar; tarjeta de revancha en el inicio tras recargar; borrarla al salir del
  podio, al entrar a la revancha y con «No, gracias»
- [x] 3.4 `StaldAuth.salir()` borra `juegos_revancha`; `auth.js?v=7` en las cuatro páginas

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Revisar las E2E que pasan por el podio (`juegos-recarga`, `partidas`, `enlace-sala`, juegos de cartas y
  ajedrez): el podio ya no deja de consultar y recargar en el podio muestra la tarjeta de revancha sobre el inicio

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [x] 5.2 E2E `revancha` y la regresión de juegos: `juegos partidas enlace-sala juegos-recarga conquian-estres
  clasicos basta-rondas loteria-sala una-sala una-robo poker cartas-espanolas ajedrez ajustes-salas ritmo` (puertos
  8937/8915, con una copia de la carpeta de datos del scratchpad; la original no se toca)
- [x] 5.3 Reporte en `openspec/changes/revancha-partidas/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 API: `curl` contra el servidor local (revancha válida, sin estar en la sala, sin terminar, sala
  inexistente) con estado restaurado (el servidor de pruebas trabaja en memoria sobre una copia)
- [x] 6.2 UI: la E2E recorre el flujo en el navegador con capturas a 390 px en `tests/e2e/salida/`
- [ ] 6.3 Tras el merge (lo hace el usuario): jugar una partida corta en producción y tocar «Otra con los mismos». Pendiente: el agente no publica ni hace merge

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/backend-standards.md`: ruta `POST /juegos/sala/<código>/revancha` y campos `siguiente`/`siguienteHost`
- [x] 7.2 `docs/frontend-standards.md`: clave `juegos_revancha`, sondeo del podio y botón de revancha (enlazando a
  este diseño, sin copiarlo)

## 8. Archivo

- [ ] 8.1 `openspec archive revancha-partidas` después del merge (lo integra el usuario). Pendiente
