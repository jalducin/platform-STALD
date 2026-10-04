## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/plataforma-login` (después de `ingles-pro`)

## 1. Supabase Auth

- [ ] 1.1 Configurar:
  - Site URL y redirecciones;
  - plantilla del correo en español;
  - SMTP propio (lo da de alta el profe; las credenciales no van en el repo).

## 2. Servidor (TDD)

- [ ] 2.1 Escribir en rojo las pruebas de `server/auth.ts`:
  - token válido, inválido y vencido;
  - caché;
  - modo de transición con y sin admin.
- [ ] 2.2 Implementar `quienEs(req)` y usarlo en todas las rutas

## 3. Frontend

- [ ] 3.1 `comun/auth.js`: pantalla de entrada (enlace y código), sesión persistente, encabezado `Authorization` y
  cerrar sesión
- [ ] 3.2 Integrarlo en el portal, Inglés, Juegos y Secundaria

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Cambiar los E2E al verificador falso local y dejar la suite completa en verde

## 5. Pruebas y verificación (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 5.1 E2E `e2e-login`: entrada, sesión en las 4 páginas, cerrar sesión, 401 al admin sin sesión
- [ ] 5.2 Producción, primera parte (con `LOGIN_TRANSICION=1`):
  - el profe recibe y usa el enlace mágico;
  - el admin sin sesión recibe 401.
- [ ] 5.3 Producción, segunda parte (una semana después):
  - quitar la transición;
  - comprobar que `?email=` se rechaza.
- [ ] 5.4 Escribir el reporte en `openspec/changes/plataforma-login/reports/`

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 Actualizar con el flujo de sesión y `quienEs`:
  - `docs/backend-standards.md`;
  - `docs/frontend-standards.md`;
  - `docs/deno-deploy-setup.md`;
  - README.
