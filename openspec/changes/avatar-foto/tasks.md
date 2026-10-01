## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/avatar-foto`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/juegos_test.ts`):
  - subir foto válida → avatar con `foto`, `GET /juegos/foto/<token>` devuelve JPEG sin correo;
  - sin permiso (400), no JPEG (400), > 40 KB (400);
  - elegir personaje quita la foto (404 después);
  - nueva foto borra la anterior;
  - admin lista y quita; alumno 403; semana actualizada sin la foto.
- [x] 1.2 Implementación en `server/juegos.ts` (ruta pública de la foto antes de exigir correo)

- [x] 1.3 Post-apply (verificación en producción): la caché en memoria de fotos vence a los 60 s, para que
  una foto quitada deje de servirse aunque otro isolate la tenga en memoria. Prueba que falla primero.

## 2. Frontend

- [x] 2.1 `juegos.html`: "📷 Subir foto" con recorte 128×128, casilla de permiso, vista previa;
  `avatarHtml` con foto y fallback; pestaña admin "📷 Fotos"
- [x] 2.2 `ingles.html` (tarjeta del admin) e `index.html` (saludo) con foto y fallback

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Ajustar pruebas y E2E de avatar existentes si cambian (no cambió el contrato previo; `e2e-avatar-musica` sigue igual)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check`, `lint`; E2E `e2e-avatar-foto` (subir, ver en otro navegador, quitar
  como admin, fallback) y regresiones de avatar/partidas
- [x] 4.2 Reporte `openspec/changes/avatar-foto/reports/2026-09-30-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Producción con curl: subir foto como admin, leerla sin correo, casos inválidos, quitarla;
  **restaurar** el perfil del admin y borrar los archivos de prueba

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (`juegos/fotos/`), `docs/backend-standards.md` (rutas), README del repo de
  datos y `openspec/project.md` si aplica
