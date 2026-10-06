## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/jugadores-admin`

## 1. Servidor (TDD)

- [x] 1.1 `server/jugadores_test.ts` y pruebas de `auth` en rojo
- [x] 1.2 `server/jugadores.ts` (`armarJugadores`), `listarCuentas` y `destino` en `/auth/enlace`
- [x] 1.3 Ruta `GET /juegos/jugadores` y dependencia `cuentas` en `main.ts` (del fixture en modo de prueba)

## 2. Frontend

- [x] 2.1 Pestaña «👥 Jugadores» en Juegos (admin): buscador, listas, enlace de acceso y CSV

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Agregar `cuentas` a `tests/fixtures/rows-fixture.json`; correr la suite unitaria y las E2E de juegos y login

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 E2E `e2e-jugadores.js` y reporte en `openspec/changes/jugadores-admin/reports/`

## 5. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 CI en verde antes del merge; luego, verificar en solo lectura que `/juegos/jugadores` rechaza a quien no es admin

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md`: ruta, `destino` del enlace y `cuentas` del fixture
