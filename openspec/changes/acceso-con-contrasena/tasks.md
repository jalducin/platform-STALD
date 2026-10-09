## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/acceso-con-contrasena`

## 1. Servidor

- [x] 1.1 Pruebas que fallan en `server/contrasena_test.ts`:
  - preparar: inicial correcta, otra contraseña, contraseña propia, correo que no es de clase, límite 429;
  - cambio: con sesión, longitud e iniciales;
  - restablecer: solo admin.
- [x] 1.2 `server/contrasena.ts`: `handlePreparar`, `handleCambio`, `handleRestablecer` y `derivar()`, sobre la
  Admin API de Supabase Auth
- [x] 1.3 Rutas en `server/main.ts`: `/auth/preparar` sin identidad, `/auth/contrasena` y `/auth/restablecer`

## 2. Página

- [x] 2.1 `comun/auth.js`:
  - `pintarEntrada` con correo y contraseña (`entrarConContrasena`);
  - `pintarCambio` (obligatorio con «sensei»; con «Ahora no» si es «clase»);
  - `cambiarContrasena`;
  - quitar el enlace, el código y la ayuda de reenvío.
- [x] 2.2 `index.html`: entrada con contraseña, «🔑 Cambiar contraseña» y «🔑 Restablecer contraseña» (en lugar de
  «🔗 Enlace de acceso»)
- [x] 2.3 `juegos.html`: entrada con correo y nick, que registra o reingresa; si es un correo de clase, pide la
  contraseña. Quitar «🔗 Enlace de acceso» de la vista de jugadores del admin.
- [x] 2.5 «¿Olvidaste tu contraseña?»: `POST /auth/olvide` (clases y profe, 3 por hora), enlace en `pintarEntrada` y en el
  portal; al volver con el enlace, el portal pide una contraseña nueva
- [x] 2.4 `ingles/app.js` y `secundaria.html`: pasar al flujo nuevo; subir la versión de `comun/auth.js`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Actualizar `server/auth_test.ts`, `server/auth_main_test.ts` y `server/registro_test.ts` si cambian
- [x] 3.2 Actualizar las E2E `e2e-login.js`, `e2e-jugadores.js` y `e2e-enlace-sala.js` al flujo con contraseña y nick

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/` y `deno lint server/`
- [x] 4.2 E2E: login, portal, jugadores, enlace-sala, juegos, nick, autoguardado e ingles-pro
- [x] 4.3 Reporte en `openspec/changes/acceso-con-contrasena/reports/2026-10-09-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 5.1 En producción: `/auth/preparar` con contraseña equivocada → 401; con un correo que no es de clase → 401
- [ ] 5.2 La página publicada muestra la entrada con contraseña, sin enlaces

## 6. Documentación técnica (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (rutas de contraseña) y `openspec/config.yaml` (contexto de Supabase Auth)
- [ ] 6.2 PR, CI, merge y archivo del cambio
