## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/registro-directo-juegos`

## 1. Servidor (TDD)

- [ ] 1.1 `server/registro_test.ts` y pruebas de `generarEnlace` en rojo
- [ ] 1.2 `registrarInvitado` compartido, `generarEnlace` compartido y la ruta `POST /juegos/registro` sin sesión

## 2. Frontend

- [ ] 2.1 `StaldAuth.entrarConToken`; código de 6 a 8 dígitos (portal y entrada común)
- [ ] 2.2 Juegos: paso 2 del registro con correo y «Entrar a jugar»; si el correo es de una clase, entrada con enlace

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 `e2e-login.js`: registro directo, correo de clase y código de 8 dígitos

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 Unitarias, lint y check (salida completa); E2E `login`, `portal`, `juegos` y `jugadores`
- [ ] 4.2 Reporte en `openspec/changes/registro-directo-juegos/reports/`

## 5. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 CI en verde antes del merge; luego, registro real de prueba con un correo `@example.com` y limpieza
  (borrar el invitado y la cuenta de Auth)

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/backend-standards.md`: ruta `/juegos/registro` y `generarEnlace`
