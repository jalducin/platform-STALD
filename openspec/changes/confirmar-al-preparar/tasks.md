## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/confirmar-al-preparar`

## 1. Servidor

- [x] 1.1 Prueba que falla: preparar una cuenta sin confirmar la deja confirmada
- [x] 1.2 `server/contrasena.ts`: `email_confirm: true` al preparar

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 La Auth falsa de `server/contrasena_test.ts` guarda `email_confirmed_at`

## 3. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 3.1 `deno test -A server/` y `deno lint server/`; reporte en
  `openspec/changes/confirmar-al-preparar/reports/2026-10-09-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 4.1 Supabase real, con una cuenta desechable `@example.com` sin confirmar: actualizar con `email_confirm` y
  entrar con contraseña; borrar la cuenta

## 5. Documentación técnica (OBLIGATORIO)

- [ ] 5.1 `docs/backend-standards.md` (`/auth/preparar` confirma el correo); PR, CI, merge y archivo
