## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/nick-jugadores`

## 1. Servidor (TDD)

- [x] 1.1 `server/nick_test.ts` en rojo
- [x] 1.2 `juegos/nicks.json`, nick en la identidad (`nombre` y `nombreReal`), `POST /juegos/nick` y `nick` en
  `armarJugadores`

## 2. Frontend

- [x] 2.1 Campo «✏️ Tu nick» en «🎨 Tu avatar»; columna de nick en «Jugadores» (admin)

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite unitaria completa; E2E `juegos`, `jugadores`, `avatar-foto` y `partidas`

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 E2E `e2e-nick.js` y reporte en `openspec/changes/nick-jugadores/reports/`

## 5. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 CI en verde antes del merge; luego, verificar en solo lectura que `POST /juegos/nick` sin sesión responde
  401 o 403

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (`juegos/nicks.json`) y `docs/backend-standards.md` (`/juegos/nick`)
