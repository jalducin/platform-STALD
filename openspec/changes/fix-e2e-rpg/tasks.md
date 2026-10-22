## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `fix/e2e-y-etiquetas-rpg` desde `main` actualizado (#237); línea base de las 4 E2E en `main`
  (puertos 8961/8962, copia temporal de datos): `peticiones`, `portal`, `ruta-profe` y `profe-diseno` en FAIL

## 1. Interruptores en /config

- [x] 1.1 Pruebas primero (rojo): `/config` trae `interruptores` (`interruptores_main_test`, `auth_main_test`) y
  `ultimo()` del lector (`interruptores_test`)
- [x] 1.2 `server/interruptores.ts` (`ultimo()`) y `server/main.ts` (`/config` sin esperar la lectura y lectura al
  arrancar)
- [x] 1.3 `comun/auth.js` (`StaldAuth.configLeida()`) y `comun/interruptores.js` (toma de `/config`; si no, pide
  `GET /interruptores`); `?v=` en las 5 páginas
- [x] 1.4 `e2e-privacidad` simula `/config` (encendido y servidor anterior) y verifica el campo; `e2e-peticiones`
  verifica que no hay `GET /interruptores` aparte; presupuesto de la sala justificado (42)

## 2. Inglés sin el formulario mientras carga

- [x] 2.1 `ingles.html`: `#login` y `#app` con `style="display:none"`; sin cambios en `app.js`

## 3. Ruta del profe de ejemplo

- [x] 3.1 Fixture `tests/fixtures/datos/contenido/profe/` (plan, 3 semanas y 5 elementos) y resultado de ejemplo
- [x] 3.2 `correr.sh`: borra `contenido/profe` y los `profe.json` reales antes de superponer
- [x] 3.3 `e2e-ruta-profe`: 200 solo de lo que aún tiene intentos

## 4. Etiquetas de nivel

- [x] 4.1 «🎓 Inglés A1» (`ingles/alumno.js`) y «Nv. N · rango» (`ingles/secundaria-inicio.js`,
  `ingles/secundaria-clase.js`, estilo en `ingles/secundaria.css`); `?v=` en `ingles.html`
- [x] 4.2 E2E que leen el nivel: `ingles-pro`, `misiones`, `secundaria-dashboard`, `rpg-ingles`, `ingles-alumno-diseno`
  y `secundaria-clase`; escenarios de `rpg-fase2-ingles` y `secundaria-dashboard`

## 4b. Ajustes tras la revisión y el merge de main (#239)

- [x] 4b.1 `olvidar()` vence la caché sin perder el último valor (`/config` sigue con interruptores tras un cambio del
  profe); prueba en `interruptores_test`; `interruptores_main_test` ya no depende del orden
- [x] 4b.2 `e2e-ruta-profe` sin `TypeError` si falta un elemento; comentario de `auth.js?v=9`; «🎓 Inglés A1» también
  en las guías de material (`ingles/material.js?v=2`)
- [x] 4b.3 «Lo siguiente →» (`.sec-siguiente`) no desborda a 360 px en ninguna vista (`ingles/ingles.css?v=11`); E2E
  `ingles-alumno-diseno` (título largo) y `secundaria-clase` lo comprueban
- [x] 4b.4 `e2e-material`: espera la pestaña marcada tras el clic (carrera que salió tras el merge)

## 5. Verificación (OBLIGATORIO)

- [x] 5.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): ver 1.1, 1.4, 3.3 y 4.2
- [x] 5.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): Deno (`test`, `check`, `lint`), E2E afectadas y las
  vecinas de Inglés y Secundaria, y suite completa con `verificador-pruebas` (8961/8962, copia temporal, sin
  `stald_*` reales); reporte `openspec/changes/fix-e2e-rpg/reports/2026-10-22-step-5.2-pruebas-y-verificacion.md`
- [x] 5.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): `curl` a `/config` y `/interruptores` en local
  (con interruptores, sin variables y `POST`); las etiquetas las comprueban las E2E (`rpg-ingles`,
  `secundaria-dashboard`, `ingles-pro`, `secundaria-clase`, `ingles-alumno-diseno`)
- [x] 5.4 Actualizar documentación técnica (OBLIGATORIO): `docs/backend-standards.md`, `docs/frontend-standards.md`,
  `docs/data-model.md`, `docs/deno-deploy-setup.md` y `docs/pruebas.md`
- [ ] 5.5 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO), solo lectura: `/config` trae
  `interruptores`, Pages publica los `?v=` nuevos y el tablero muestra las etiquetas
- [ ] 5.6 `openspec archive fix-e2e-rpg` (tras verificar en producción)
