## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/vigilancia-servidor`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/salud_test.ts`, con `fetch` y almacén falsos):
  - ok, advertencia (menos del 10 %) y bloqueado (0 restantes, o el repo lanza `github_rate_limit`);
  - reinicio en ISO;
  - sin token en la respuesta.
- [x] 1.2 `server/salud.ts` y ruta `/salud` en `server/main.ts` (200/503)

## 2. Vigilante

- [x] 2.1 `.github/workflows/vigilancia.yml` (cada 15 min y a mano): abre, comenta sin repetir y cierra issues con
  la etiqueta `vigilancia`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite completa en verde

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`
- [x] 4.2 El script del vigilante probado en local con respuestas simuladas (ok, advertencia, bloqueado, caído) en
  modo de simulación, sin crear issues
- [x] 4.3 Reporte `openspec/changes/vigilancia-servidor/reports/2026-10-03-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Producción:
  - `/salud` responde ok con los números del límite;
  - correr el workflow a mano (ok, sin issue);
  - probar el aviso con una corrida forzada (`forzar=bloqueado`): abre el issue, llega el aviso y se cierra con la
    siguiente corrida en ok.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (`/salud`) y README (vigilancia y cómo dirigir el correo)
