## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/portal-acceso`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/perfil_test.ts`): Inglés + Secundaria, solo Secundaria, desconocido, admin, sin correos ajenos
- [x] 1.2 `server/perfil.ts` (`armarPerfil`) y ruta `GET /perfil` en `main.ts`

## 2. Frontend

- [x] 2.1 `git mv index.html secundaria.html`; "← Inicio" y cierre de sesión compartido en `secundaria.html` e `ingles.html`
- [x] 2.2 Portal nuevo `index.html`: login, saludo, tarjetas por acceso, estados (desconocido, error, admin), sesión compartida, modo oscuro

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E del portal:
  - alumna → Inglés sin volver a pedir el correo;
  - admin con 3 tarjetas;
  - desconocido;
  - sesión recordada;
  - cerrar sesión desde Inglés;
  - `secundaria.html` con "← Inicio".
  - Regresiones de Inglés.
- [x] 3.2 Reporte `openspec/changes/portal-acceso/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Tras el merge: curl `/perfil` (alumna, admin, desconocido y sin correo) y E2E de solo lectura del portal publicado

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/frontend-standards.md` (§1 páginas, §2 claves de sesión), `docs/backend-standards.md` (`/perfil`), `openspec/project.md` y README (URLs)
- [ ] 5.2 Commit, push, PR y merge a `main`
