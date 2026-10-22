## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/rpg-privacidad` desde `origin/main` (deriva de `plataforma-rpg`, tareas 3.13
  y 3.14)

## 1. Interruptor público

- [x] 1.1 Pruebas que fallan (`server/interruptores_test.ts`): sin documento → apagado (Postgres y almacén), encendido
  desde `stald_docs` y desde el almacén, solo llaves conocidas y `true` estricto, Postgres caído → apagado, caché de
  60 s que nota el cambio de dato al vencer
- [x] 1.2 Pruebas que fallan (`server/interruptores_main_test.ts`): `GET /interruptores` sin sesión → 200 solo con
  llaves conocidas y `public, max-age=60`; `POST` → 405
- [x] 1.3 `server/interruptores.ts`, ruta en `server/main.ts` (antes de `quienEs`) y política en `server/http_cache.ts`
- [x] 1.4 `comun/interruptores.js` (`data-interruptor`, `data-interruptor-apagado`, `data-interruptores-cargando`,
  `?api=` en los enlaces, falla cerrada)

## 2. Páginas y enlaces

- [x] 2.1 `privacidad.html` (tarea 3.13 de `plataforma-rpg`): aviso integral en lenguaje claro, «En un minuto»,
  12 secciones, nota de borrador y `[pendiente]` del profe; «Próximamente» con el interruptor apagado
- [x] 2.2 `consentimiento.html` (tarea 3.14 de `plataforma-rpg`): 5 autorizaciones (incluye la foto de avatar), campos en
  blanco, leyenda de que la plataforma no guarda el documento, botón de imprimir; «Próximamente» con el interruptor apagado
- [x] 2.3 `estilos/legal.css`: tokens del portal, claro y oscuro, 360 px e impresión carta en una hoja
- [x] 2.4 Pies con «🔒 Aviso de privacidad» (solo encendido) en `index.html`, `ingles.html` (`ingles.css?v=10`) y
  `juegos.html` (`juegos.css?v=8`)

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar las pruebas de `/config`, caché HTTP y portal: la ruta nueva no cambia su contrato; E2E del portal
  sin cambios (el enlace está oculto por omisión). E2E nueva `tests/e2e/e2e-privacidad.js` agregada a `correr.sh`
  (fase base, después de `portal`)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/` (subagente `verificador-pruebas`), `deno check server/main.ts`, `deno lint server/`
- [x] 4.2 E2E `privacidad`, `portal`, `login`, `juegos` y `material` (esta abre `ingles.html` con el pie nuevo), puertos
  8905/8906. `ingles-pro` requiere Postgres de prueba (`--pg`) y no se corrió: el cambio en `ingles.html` es solo el
  pie oculto y un script
- [x] 4.3 Estado: sin datos que mutar (la E2E simula el interruptor encendido en el navegador; el servidor de pruebas
  usa una copia temporal sin `config/interruptores.json`). Reporte
  `openspec/changes/rpg-privacidad/reports/2026-10-21-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Servidor local: `curl` a `/interruptores` sin documento (`false`), con documento encendido (`true`, sin
  llaves de más), con `"true"` de texto (`false`) y `POST` (405); capturas de las páginas apagadas y encendidas a
  360 px en claro y oscuro, y PDF carta del formato
- [x] 5.2 `npx -y @fission-ai/openspec@1.4.1 validate rpg-privacidad --strict` y `validate plataforma-rpg --strict`;
  búsqueda de correos y nombres reales en los archivos nuevos (0)
- [ ] 5.3 Verificación en producción tras el merge — EL AGENTE EJECUTA: `/salud`, `/interruptores` → `{ privacidad:
  false }` y `privacidad.html` / `consentimiento.html` publicadas en «Próximamente» sin enlaces en los pies

## 6. Documentación técnica (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (módulo, ruta sin identidad y caché HTTP), `docs/data-model.md`
  (`config/interruptores.json` y cómo encenderlo), `docs/frontend-standards.md` (páginas legales, pies y atributos)
- [x] 6.2 `plataforma-rpg/tasks.md`: marcar 3.13 y 3.14 como implementadas aquí (texto pendiente de aprobación del
  profe antes de encender)
- [x] 6.3 Revisión `revisor-solo-lectura`: el aviso describe Juegos como funciona hoy (apodo o nombre de pila y
  avatar visibles a quien juega, foto por enlace, invitados, borrado a mano, historial del repo), finalidad
  secundaria, autorización de foto en el formato y E2E de servidor caído en los pies

## 7. Cierre

- [ ] 7.1 El profe aprueba el texto, llena los `[pendiente]` y enciende el interruptor (acción externa)
- [ ] 7.2 `openspec archive rpg-privacidad` (consolida los requisitos en `openspec/specs/portal/`)
