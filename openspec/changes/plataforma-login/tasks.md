## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/plataforma-login`

## 1. Supabase Auth (acciones externas, las ejecuta el profe con los pasos del reporte)

- [ ] 1.1 Configurar (pasos exactos en `reports/2026-10-04-step-5-pruebas-y-verificacion.md`, sección «Supabase Auth
  en producción»):
  - Site URL y redirecciones;
  - plantilla del correo en español, con enlace y código de 6 dígitos;
  - SMTP propio (lo da de alta el profe; las credenciales no van en el repo).
- [ ] 1.2 Dar de alta en Supabase Auth a las personas actuales con `herramientas/alta-usuarios-auth.ts` (el agente la
  deja probada con `--prueba` y con `fetch` falso; el profe la corre contra producción)

## 2. Servidor (TDD)

- [x] 2.1 Escribir en rojo las pruebas de `server/auth.ts`:
  - token válido, inválido y vencido;
  - caché (5 min, por hash del token);
  - transición con y sin admin, por fecha (`LOGIN_TRANSICION_HASTA`);
  - sin token fuera de la transición;
  - verificador falso solo con `ROWS_FIXTURE`;
  - `POST /auth/enlace` (solo admin con sesión) y `GET /config`.
- [x] 2.2 Implementar `quienEs(req, deps)` y usarlo en todas las rutas de `server/main.ts`; CORS con `authorization`
- [x] 2.3 `GET /config` y `POST /auth/enlace` (Admin API `generate_link`, tipo `magiclink`)
- [x] 2.4 `herramientas/alta-usuarios-auth.ts` (Admin API `POST /auth/v1/admin/users`, `email_confirm: true`) con
  prueba unitaria y modo `--prueba`

## 3. Frontend

- [x] 3.1 `comun/auth.js`: pantalla de entrada (enlace y código), sesión persistente, encabezado `Authorization`,
  cerrar sesión y modo prueba
- [x] 3.2 Integrarlo en el portal (entrada con enlace, 🚪 Cerrar sesión, aviso de transición y «🔗 Enlace de acceso»
  del admin), Juegos y Secundaria. **Inglés** lo integra quien rediseña `ingles.html` (Sprint 2), con las
  instrucciones del reporte

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Ajustar los E2E al verificador falso local (sesión `prueba:<correo>`) y dejar en verde las regresiones de
  portal, Juegos (incluidas partidas) y Secundaria

## 5. Pruebas y verificación (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 5.1 Unitarias, `deno check` y `deno lint` del servidor
- [x] 5.2 E2E `e2e-login`: entrada → sesión → portal, Juegos (con partida) y Secundaria con token; cerrar sesión
  regresa a la entrada; admin con `?email=` sin token → 401; alumno con `?email=` sin token funciona en la
  transición y recibe 401 con una fecha posterior simulada
- [x] 5.3 Escribir el reporte en `openspec/changes/plataforma-login/reports/2026-10-04-step-5-pruebas-y-verificacion.md`
- [ ] 5.4 Producción, primera parte (la ejecuta el profe tras el merge y la configuración de 1.1):
  - el profe recibe y usa el enlace mágico;
  - el admin sin sesión recibe 401.
- [ ] 5.5 Producción, segunda parte (después del 2026-10-12): comprobar que `?email=` sin token se rechaza

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 Actualizar con el flujo de sesión y `quienEs`:
  - `docs/backend-standards.md`;
  - `docs/frontend-standards.md`;
  - `docs/deno-deploy-setup.md`;
  - README.
